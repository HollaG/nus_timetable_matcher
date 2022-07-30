import { Context, Markup, Telegraf } from "telegraf";
import { Update } from "typegram";
import {
    generateInitialMessageText,
    replyError,
    updateModuleAndClassesData,
} from "./functions";

require("dotenv").config();

import { db, pool } from "./db";
import { RowDataPacket } from "mysql2";
import { ChatDB, MemberDB, ModuleDB } from "./types/dbtypes";

const MAP_NUSMODS_SHORTHAND_TO_LESSONTYPE: {
    [key: string]: any; // todo: Fix this typescript error where for in loop variable is 'string'
    TUT: "Tutorial";
    LEC: "Lecture";
    SEC: "Sectional";
    LAB: "Lab";
} = {
    TUT: "Tutorial",
    LEC: "Lecture",
    SEC: "Sectional",
    LAB: "Lab",
};

const bot: Telegraf<Context<Update>> = new Telegraf(
    process.env.BOT_TOKEN as string
);

// MongoDB

type TempData = {
    activeChatIDs: number[];
    // activeChats: { [chatID: number]: {

    // } };
};

const TEMP_DATASTORAGE: TempData = {
    activeChatIDs: [],
};

bot.start(async (ctx) => {
    // ctx.reply("Hello " + ctx.from.first_name + "!");

    // Update the user's profile information in memberlist
    const user = await ctx.getChatMember(ctx.from.id);
    console.log({ user });

    await db.query(
        `INSERT INTO memberList (memberId, memberName, memberUsername) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE memberName = VALUES(memberName), memberUsername = VALUES(memberUsername)`,
        [ctx.from.id, ctx.from.first_name, ctx.from.username]
    );

    if (ctx.chat.type === "private") {
        // const isUpdatingTimetable = ctx.startPayload === "updateTimetable";

        // if (isUpdatingTimetable) {
        //     ctx.reply(
        //         `Hello! Please type /set {NUSMods Timetable link} to set your timetable. \n\nFor example: /set https://nusmods.com/timetable/sem-1/share?CFG1002=&CS1101S=TUT:07B,REC:11E,LEC:1&CS1231S=TUT:08B,LEC:1&IS1108=TUT:03,LEC:1&MA2001=TUT:1,LAB:2,LEC:1&RVX1000=SEC:1&RVX1002=SEC:2`
        //     );
        //     return;
        // }

        if (ctx.startPayload.startsWith("update_")) {
            // user clicked on 'add / update timetable' from a group message
            const linkedGroupId = ctx.startPayload.split("_")[1];

            // add this person's name to the linked group
            const [linkedGroupRow] = await db.query<
                { chatMemberIDs: string; ttMessageId: number }[]
            >(
                `SELECT chatMemberIDs, ttMessageId FROM chatlist WHERE chatId = ?`,
                [linkedGroupId]
            );
            const chatMemberIDs = linkedGroupRow[0].chatMemberIDs;
            const ttMessageId = linkedGroupRow[0].ttMessageId;

            if (!chatMemberIDs.includes(ctx.from.id.toString())) {
                const newChatMemberIDs = chatMemberIDs + `,${ctx.from.id}`;
                await db.query(
                    `UPDATE chatlist SET chatMemberIDs = ? WHERE chatId = ?`,
                    [newChatMemberIDs, linkedGroupId]
                );

                // get the details of every member who is part of this group
                const chatMemberIDsArray = chatMemberIDs.split(",");
                const [memberRows] = await db.query<MemberDB[]>(
                    `SELECT * FROM memberlist WHERE memberId IN (?)`,
                    [newChatMemberIDs.split(",")]
                );

                // update the linked group message
                ctx.telegram.editMessageText(
                    linkedGroupId,
                    ttMessageId,
                    undefined,
                    generateInitialMessageText(memberRows),
                    {
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: "Add / update your timetable",
                                        url: `https://t.me/tt_matchbot?start=update_${linkedGroupId}`,
                                    },
                                ],
                                [
                                    {
                                        text: "Remove timetable",
                                        callback_data: "remove_timetable",
                                    },
                                ],
                            ],
                        },
                    }
                );
            }
            // Check if the user already submitted a timetable before.
            // if not, prompt them to enter it via /set command.

            const [rows] = await db.query<MemberDB[]>(
                `SELECT * FROM memberList WHERE memberId = ?`,
                [ctx.from.id]
            );

            if (Array.isArray(rows) && rows.length === 0) {
                // no timetable submitted yet
                ctx.reply(
                    `Please use /set [NUSMods Timetable link] to set your timetable.`
                );
            } else {
                ctx.reply(
                    `You have a previously submitted timetable:\n${rows[0].timetableLink}\n\nYou may use /set [NUSMods timetable link] to update this timetable.`
                );
            }
        }

        if (ctx.startPayload.startsWith("delete_")) {
            // user clicked on 'delete timetable' from a group message
            const linkedGroupId = ctx.startPayload.split("_")[1];
        }
    } else {
        // Check if already running
        const isRunning = await db.query(
            `SELECT * FROM chatlist WHERE chatId = ?`,
            [ctx.chat.id]
        );

        console.log(ctx.chat);
        if (Array.isArray(isRunning[0]) && isRunning[0].length !== 0) {
            // not running
            return replyError(ctx, "the bot is already active in this chat!");
        }

        // if (TEMP_DATASTORAGE.activeChatIDs.includes(ctx.chat.id)) {
        //     return replyError(ctx, "the bot is already active in this chat!");
        // }

        // // Add to active chats
        // TEMP_DATASTORAGE.activeChatIDs.push(ctx.chat.id);

        const msg = await ctx.reply(generateInitialMessageText(), {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "Add / update your timetable",
                            url: `https://t.me/tt_matchbot?start=update_${ctx.chat.id}`,
                        },
                    ],
                    [
                        {
                            text: "Remove timetable",
                            callback_data: "remove_timetable",
                        },
                    ],
                ],
            },
        });
        await db.query(
            `INSERT INTO chatlist (chatId, chatName, ttMessageId) VALUES (?, ?, ?)`,
            [ctx.chat.id, ctx.chat.title, msg.message_id]
        );
    }
});

bot.command("stop", async (ctx) => {
    if (ctx.chat.type === "private") {
        return replyError(ctx, "this command is only available in groups");
    }

    // Remove from active chats
    await db.query(`DELETE FROM chatlist WHERE chatId = ?`, [ctx.chat.id]);

    ctx.reply("Stopped collecting data for this chat");
});

bot.command("set", async (ctx) => {
    // if /set is run with an empty command, delete the user's timetable
    if (ctx.message.text === "/set") {
        await db.query(`DELETE FROM classesselected WHERE memberId = ?`, [
            ctx.from.id,
        ]);
        ctx.reply(`Your timetable has been deleted!`);
        return;
    }

    // Get the timetable link
    const timetableMatch = ctx.message.text
        .trim()
        .match(
            /(http|ftp|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])/gm
        ); // sample: https://nusmods.com/timetable/sem-1/share?CFG1002=&CS1101S=TUT:07B,REC:11E,LEC:1&CS1231S=TUT:08B,LEC:1&IS1108=TUT:03,LEC:1&MA2001=TUT:1,LAB:2,LEC:1&RVX1000=SEC:1&RVX1002=SEC:2

    if (!timetableMatch) return replyError(ctx, "the link is not valid!");

    const timetableLink = timetableMatch[0];

    console.log(ctx.message.text);
    // Check the link is good
    if (
        !timetableLink.match(
            /^https:\/\/nusmods.com\/timetable\/sem-\d\/share\?/gm
        )
    ) {
        return replyError(ctx, "Invalid timetable link");
    }

    // get the semester
    const semesterMatch = timetableLink.match(/sem-\d/gm);
    if (!semesterMatch) return replyError(ctx, "Invalid timetable link");
    const semester = semesterMatch[0].split("-")[1];

    const stripped = timetableLink.replace(
        /^https:\/\/nusmods\.com\/timetable\/.*\/share\?/gm,
        ""
    ); // CFG1002=&CS1101S=TUT:07B,REC:11E,LEC:1&CS1231S=TUT:08B,LEC:1&IS1108=TUT:03,LEC:1&MA2001=TUT:1,LAB:2,LEC:1&RVX1000=SEC:1&RVX1002=SEC:2
    // get the url params
    const params = new URLSearchParams(stripped);

    const classesSelected: {
        moduleCode: string;
        timetable: {
            [lessonType: string]: string;
        };
    }[] = [];

    for (const p of params) {
        console.log(p);

        const moduleCode = p[0];
        const selectedLessons = p[1];

        const lessons = selectedLessons.split(",");

        const timetable: { [key: string]: string } = {};
        lessons.forEach((lesson) => {
            if (lesson.includes(":")) {
                const lessonType = lesson.split(":")[0];
                const classNo = lesson.split(":")[1];

                timetable[lessonType] = classNo;
            }
        });

        classesSelected.push({
            moduleCode,
            timetable,
        });
    }

    // Sample

    // [
    //     { moduleCode: "CFG1002", timetable: {} },
    //     {
    //         moduleCode: "CS1101S",
    //         timetable: { TUT: "07B", REC: "11E", LEC: "1" },
    //     },
    //     { moduleCode: "CS1231S", timetable: { TUT: "08B", LEC: "1" } },
    //     { moduleCode: "IS1108", timetable: { TUT: "03", LEC: "1" } },
    //     { moduleCode: "MA2001", timetable: { TUT: "1", LAB: "2", LEC: "1" } },
    //     { moduleCode: "RVX1000", timetable: { SEC: "1" } },
    //     { moduleCode: "RVX1002", timetable: { SEC: "2" } },
    // ];

    // Delete all the entries from the database where the memberId is this member
    const deleteQuery = `DELETE FROM classesselected WHERE memberId = ?`;
    const [rows, fields] = await db.query(deleteQuery, [ctx.from.id]);

    // Insert the new entries
    let confirmationText = ``;
    for (const moduleSelected of classesSelected) {
        const moduleCode = moduleSelected.moduleCode;

        // search for this module using moduleCode in the cached database
        const moduleInfo = await db.query<ModuleDB>(
            `SELECT * FROM moduleList WHERE moduleCode = ?`,
            [moduleCode]
        );

        console.log(moduleInfo[0]);

        let updatedClassInfo: ModuleDB | null = moduleInfo[0];

        if (Array.isArray(moduleInfo[0]) && moduleInfo[0].length === 0) {
            // Query NUSMods for the class data
            updatedClassInfo = await updateModuleAndClassesData(moduleCode);
        } else if (
            new Date(moduleInfo[0].lastUpdated).getMilliseconds() - Date.now() >
            1000 * 60 * 60 * 24
        ) {
            // Query NUSMods for the class data
            updatedClassInfo = await updateModuleAndClassesData(moduleCode);
        }

        confirmationText += `<b><u>${moduleCode} ${updatedClassInfo?.moduleName}</u></b>`;

        if (Object.keys(moduleSelected.timetable).length === 0) {
            const values = [
                ctx.from.id,
                moduleSelected.moduleCode,
                ctx.chat.id,
                process.env.AY,
                semester,
            ];
            const query = `INSERT INTO classesselected (memberId, moduleCode, chatId, ay, semester) VALUES (?, ?, ?, ?, ?)`;
            const [rows, fields] = await pool.query(query, values);
        }
        for (const lessonType in moduleSelected.timetable) {
            const classNo = moduleSelected.timetable[lessonType];

            const values = [
                ctx.from.id,
                moduleSelected.moduleCode,
                classNo,
                lessonType,
                ctx.chat.id,
                process.env.AY,
                semester,
            ];
            const query = `INSERT INTO classesselected (memberId, moduleCode, classNo, lessonType, chatId, ay, semester) VALUES (?, ?, ?, ?, ?, ?, ?)`;
            const [rows, fields] = await pool.query(query, values);
        }
    }

    await db.query(
        `UPDATE memberlist set timetableLink = ? WHERE memberId = ?`,
        [timetableLink, ctx.from.id]
    );

    ctx.reply(`Your timetable has been updated!`);
});

bot.command("view", async (ctx) => {
    if (ctx.chat.type === 'private') { 

    } else { 
        // get the chat group info
        const [chatGroupRow] = await db.query<ChatDB[]>(`SELECT * FROM chatlist WHERE chatId = ?`, [ctx.chat.id])
        if (!chatGroupRow[0]) return replyError(ctx, "This chat is not in the database!");

        const memberIDs = chatGroupRow[0].chatMemberIDs.split(",").filter(n => n)

    }
})


// Get the timetable link
const timetableLink =
    "CFG1002=&CS1101S=TUT:07B,REC:11E,LEC:1&CS1231S=TUT:08B,LEC:1&IS1108=TUT:03,LEC:1&MA2001=TUT:1,LAB:2,LEC:1&RVX1000=SEC:1&RVX1002=SEC:2"; // sample: https://nusmods.com/timetable/sem-1/share?CFG1002=&CS1101S=TUT:07B,REC:11E,LEC:1&CS1231S=TUT:08B,LEC:1&IS1108=TUT:03,LEC:1&MA2001=TUT:1,LAB:2,LEC:1&RVX1000=SEC:1&RVX1002=SEC:2

// get the url params
const params = new URLSearchParams(timetableLink);

const classesSelected: {
    moduleCode: string;
    timetable: {
        [lessonType: string]: string;
    };
}[] = [];
for (const p of params) {
    console.log(p);

    const moduleCode = p[0];
    const selectedLessons = p[1];

    const lessons = selectedLessons.split(",");

    const timetable: { [key: string]: string } = {};
    if (lessons)
        lessons.forEach((lesson) => {
            if (lesson.includes(":")) {
                const lessonType = lesson.split(":")[0];
                const classNo = lesson.split(":")[1];

                timetable[lessonType] = classNo;
            }
        });

    classesSelected.push({
        moduleCode,
        timetable,
    });
}

console.log(classesSelected);

// bot.help((ctx) => {
//     ctx.reply("Send /start to receive a greeting");
//     ctx.reply("Send /keyboard to receive a message with a keyboard");
//     ctx.reply("Send /quit to stop the bot");
// });
// bot.command("quit", (ctx) => {
//     // Explicit usage
//     ctx.telegram.leaveChat(ctx.message.chat.id);
//     // Context shortcut
//     ctx.leaveChat();
// });
// bot.command("keyboard", (ctx) => {
//     ctx.reply(
//         "Keyboard",
//         Markup.inlineKeyboard([
//             Markup.button.callback("First option", "first"),
//             Markup.button.callback("Second option", "second"),
//         ])
//     );
// });
// bot.on("text", (ctx) => {
//     ctx.reply(
//         "You choose the " +
//             (ctx.message.text === "first" ? "First" : "Second") +
//             " Option!"
//     );
// });

bot.launch();

[
    {
        moduleCode: "CS1010",
        blocks: [
            {
                classNo: "08",
                startTime: "1100",
                endTime: "1200",
                venue: "COM1-0208",
                day: "Friday",
                lessonType: "Tutorial",
                size: 30,
            },
        ],
    },
];
