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