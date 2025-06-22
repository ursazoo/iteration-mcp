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
export interface PersonInfo {
    id: string;
    name: string;
    role?: string;
    department?: string;
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
    crApplication: CRApplication;
}
export interface MCPConfig {
    dingtalk: DingTalkConfig;
    api: {
        baseUrl: string;
        endpoints: {
            createIteration: string;
            getIterationDetail: string;
            createCRApplication: string;
            getParticipants: string;
            getReviewers: string;
        };
    };
}
export interface LocalCache {
    projectLines: string[];
    defaultProjectLine?: string;
    participants: PersonInfo[];
    reviewers: PersonInfo[];
    recentParticipants: string[];
    recentReviewers: string[];
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