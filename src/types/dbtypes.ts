export type ModuleDB = {
    moduleCode: string,
    moduleName: string,
    lastUpdated: Date
}

export type MemberDB = {
    memberId: number,
    memberName: string,
    memberUsername: string,
    timetableLink: string
}

export type ChatDB = {
    chatId: number,
    chatName: string,
    chatMemberIDs: string,
    ttMessageId: number,
}

export type ClassDB = {
    uniqueClassId: number,
    moduleCode: string,
    venue: string,
    lessonType: "Tutorial"|"Lecture"|"Sectional"|"Lab",
    classNo: string,
    startTime: string,
    endTime: string,
    weeks: number[],
    lastUpdated: Date
    ay: string,
    sem: number
}

export type ClassesSelectedDB = { 
    memberId: number,
    moduleCode: string,
    classNo: string,
    lessonType: "Tutorial"|"Lecture"|"Sectional"|"Lab",
    ay: string,
    sem: number
}

export type ModuleWithClassDB = ClassDB & ModuleDB