import fetch from "node-fetch";
import { Context } from "telegraf";
import { Module } from "./types/modules";
import { pool } from "./db";
import { MemberDB, ModuleDB } from "./types/dbtypes";

export const replyError = (ctx: Context, errorMsg?: string) => {
    if (errorMsg)
        ctx.reply(`Sorry, ${errorMsg}`).then((msg) =>
            setTimeout(() => ctx.deleteMessage(msg.message_id), 5000)
        );
    else
        ctx.reply(`Sorry, there was an unexpected error!`).then((msg) =>
            setTimeout(() => ctx.deleteMessage(msg.message_id), 5000)
        );
};

export const updateModuleAndClassesData = async (moduleCode: string): Promise<ModuleDB|null> => {
    const ay = process.env.AY;

    console.log("fetching data for module: ", moduleCode);
    try {
        const res = await fetch(
            `https://api.nusmods.com/v2/${ay}/modules/${moduleCode}.json`
        );

        const data: Module = await res.json()
        
        // console.log(JSON.stringify(data, null, 2))


        // add the module data to moduleList
        const moduleQuery = `INSERT INTO moduleList SET ?`
        const moduleData: ModuleDB = {
            moduleCode: moduleCode,
            moduleName: data.title,
            lastUpdated: new Date()
        }

        // todo change this to update
        await pool.query(`DELETE FROM moduleList WHERE moduleCode = ?`, [moduleCode])
        await pool.query(moduleQuery, moduleData)

        // add the class data to classList

        const classQuery = `INSERT INTO classList (moduleCode, lessonType, classNo, startTime, endTime, venue, weeks, ay, semester) VALUES ?`
        const classDataSem1 = data.semesterData[0]?.timetable.map(classItem => {
            return [moduleCode, classItem.lessonType, classItem.classNo, classItem.startTime, classItem.endTime, classItem.venue, JSON.stringify(classItem.weeks), process.env.AY, 1]
        }) || []
        const classDataSem2 = data.semesterData[1]?.timetable.map(classItem => {
            return [moduleCode, classItem.lessonType, classItem.classNo, classItem.startTime, classItem.endTime, classItem.venue, JSON.stringify(classItem.weeks), process.env.AY, 2]
        }) || []
        const classData = [...classDataSem1, ...classDataSem2]

        await pool.query(`DELETE FROM classList WHERE ay = ? AND moduleCode = ?`, [process.env.AY, moduleCode])
        if (moduleCode === "CS1101S")
            console.log({classQuery, classData})
        await pool.query(classQuery, [classData])
        return moduleData
    } catch (e) {
        console.log(e);
        return null
    }
};

export const generateInitialMessageText = (chatMembers?: MemberDB[]) => {
    let defaultText = `Please send in the timetable links (shared via NUSMods) to the bot by clicking the button below. \n\nType /view to see the common breaks and lessons at any time`
    console.log({chatMembers})
    if (chatMembers) { 
        defaultText += `\n\nJoined:`
        chatMembers.forEach(member => {
            defaultText += `\n${member.memberName}`
        })
    }

    return defaultText

}
