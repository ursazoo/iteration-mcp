export interface DingTalkConfig {
    appId: string;
    appSecret: string;
}
export interface DingTalkToken {
    access_token: string;
    refresh_token?: string;
    expires_at: number;
    user_info: DingTalkUserInfo;
}
export interface DingTalkUserInfo {
    openid: string;
    unionid: string;
    nick: string;
    name?: string;
    department?: string;
}
export interface UserInfo {
    id: number;
    realName: string;
}
export interface IterationBasicInfo {
    projectLine: string;
    iterationName: string;
    onlineTime: string;
    remarks?: string;
}
export interface ProjectInfo {
    projectName: string;
    projectManager: string;
    technicalLeader: string;
    participants: string[];
    startDate: string;
    endDate: string;
    description: string;
    techStack: string;
    riskAssessment: string;
}
export interface ComponentModule {
    name: string;
    url?: string;
    relativePath: string;
    reviewer: string;
    image?: {
        type: 'clipboard' | 'file' | 'upload_later';
        value?: string;
    };
}
export interface FunctionModule {
    name: string;
    relativePath: string;
    reviewer: string;
    description?: string;
}
export interface CRApplication {
    projectInfo: ProjectInfo;
    componentModules: ComponentModule[];
    functionModules: FunctionModule[];
}
export interface CompleteIteration {
    basicInfo: IterationBasicInfo;
    crApplication: CRApplicationData;
}
export interface CRApplicationData {
    reqDocUrl: string;
    techDocUrl: string;
    projexUrl: string;
    uxDocUrl: string;
    gitlabUrl: string;
    gitProjectName: string;
    gitlabBranch: string;
    participantIds: string;
    checkUserIds: string;
    spendTime: string;
    componentList: ComponentItem[];
    functionList: FunctionItem[];
    sprintId: number;
}
export interface ComponentItem {
    componentName: string;
    address: string;
    auditId: number;
    imgUrl: string;
}
export interface FunctionItem {
    desc: string;
}
export interface OSSConfig {
    region: string;
    accessKeyId: string;
    accessKeySecret: string;
    bucket: string;
}
export interface AliossAccessIdParams {
    fileType?: string;
    directory?: string;
}
export interface AliossAccessData {
    accessKeyId: string;
    accessKeySecret: string;
    securityToken: string;
    expiration: string;
    bucket: string;
    region: string;
    endpoint: string;
    host?: string;
    dir?: string;
}
export interface MCPConfig {
    projectPath?: string;
    dingtalk: DingTalkConfig;
    api: {
        baseUrl: string;
        endpoints: {
            login: string;
            getUserList: string;
            getHobbyList: string;
            getProjectList: string;
            getTodayNewsList: string;
            getOSSToken: string;
            createIteration: string;
            updateIteration: string;
            deleteIteration: string;
            getIterationDetail: string;
            getIterationList: string;
            createCRApplication: string;
            getCRApplicationList: string;
            updateCRApplication: string;
            deleteCRApplication: string;
            getCRApplicationDetail: string;
            checkCRApplicationStatus: string;
            createCRProblem: string;
            updateCRProblem: string;
            deleteCRProblem: string;
            getCRProblemDetail: string;
            getCRProblemList: string;
            setCRProblemStatus: string;
        };
    };
    oss?: OSSConfig;
}
export interface LocalCache {
    projectLines: string[];
    defaultProjectLine?: string;
    participants: UserInfo[];
    reviewers: UserInfo[];
    recentParticipants: number[];
    recentReviewers: number[];
    gitInfo?: {
        projectUrl: string;
        projectName: string;
    };
    lastUpdated: number;
}
export interface LoginResult {
    success: boolean;
    accessToken?: string;
    userInfo?: DingTalkUserInfo;
    message?: string;
}
export interface IterationTemplate {
    basicInfo: IterationBasicInfo;
    crApplication: CRApplication;
}
//# sourceMappingURL=types.d.ts.map