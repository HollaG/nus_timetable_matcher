import { db } from "./db";
import { ClassDB, ClassesSelectedDB } from "./types/dbtypes";

export type MatchResult = {
    commonMods?: {
        [moduleCode: string]: number[];
    };
    commonLessons?: {
        [moduleCode: string]: {
            [lessonType: string]: {
                [classNo: string]: number[];
            };
        };
    };
    commonLessonTime?: {
        [moduleCode: string]: {
            [lessonType: string]: {
                [classNo: string]: number[];
            };
        };
    };
    commonBreaks?: {
        startTime: string;
        endTime: string;
        day:
            | "Monday"
            | "Tuesday"
            | "Wednesday"
            | "Thursday"
            | "Friday"
            | "Saturday"
            | "Sunday";
        memberIDs: number[];
    }[];
};

/*
Query to select commonLessons
select * from classesselected where (classNo, lessonType, moduleCode) in ( select classNo, lessonType, moduleCode from classesselected group by classNo, lessonType, moduleCode having count(*) > 1 );


Query to select common

*/

export const matcher = async (memberIDs: number[]) => {
    console.log(memberIDs)
    const temp = [...memberIDs, 12345, 0 ]
    console.log({temp})
    try {
        const [commonLessons] =
            await db.query<any>(`select * from classesselected where (classNo, lessonType, moduleCode) in ( select classNo, lessonType, moduleCode from classesselected WHERE memberId in (?) group by classNo, lessonType, moduleCode having count(*) > 1 );
        `, [temp]);

        console.log(commonLessons)

        // sort into moduleCode --> lessonType --> classNo --> memberIDs[]
        const sortedByModuleCode = commonLessons.reduce(function (r: any, a: any) {
            r[a.moduleCode] = r[a.moduleCode] || [];
            r[a.moduleCode].push(a);
            return r;
        }, Object.create(null));

        // sort by lessonType 

        const lessonTypeHolder: any = {}
        for (const moduleCode in sortedByModuleCode) {
            lessonTypeHolder[moduleCode] = sortedByModuleCode[moduleCode].reduce(function (r: any, a: any) {
                r[a.lessonType] = r[a.lessonType] || [];
                r[a.lessonType].push(a);
                return r;
            }
                , Object.create(null));

        }


        console.log(JSON.stringify(lessonTypeHolder, null, 2))
    } catch (e) {
        console.log("Matcher function crashed!", e);
    }
};
