// 钉钉登录相关类型
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

// 人员信息
export interface PersonInfo {
  id: string;
  name: string;
  role?: string;
  department?: string;
}

// 迭代信息相关类型
export interface IterationBasicInfo {
  projectLine: string;        // 所属项目线
  iterationName: string;      // 迭代名称
  onlineTime: string;         // 上线时间
  remarks?: string;           // 备注
}

// 项目信息
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
  name: string;              // 组件名称
  url?: string;             // 组件地址
  relativePath: string;      // 项目内相对路径
  reviewer: string;          // 审核人员ID
  image?: {
    type: 'clipboard' | 'file' | 'upload_later';
    value?: string;          // 文件路径或上传链接
  };
}

export interface FunctionModule {
  name: string;              // 功能名称
  relativePath: string;      // 项目内相对路径
  reviewer: string;          // 审核人员ID
  description?: string;      // 功能描述
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

// MCP 工具配置
export interface MCPConfig {
  dingtalk: DingTalkConfig;
  api: {
    baseUrl: string;
    endpoints: {
      createIteration: string;        // 创建迭代基础信息
      getIterationDetail: string;     // 获取迭代详情
      createCRApplication: string;    // 创建CR申请单
      getParticipants: string;        // 获取参与人员列表
      getReviewers: string;           // 获取审核人员列表
    };
  };
}

// 本地缓存数据
export interface LocalCache {
  projectLines: string[];           // 项目线选项
  defaultProjectLine?: string;      // 默认项目线
  participants: PersonInfo[];       // 参与人员列表（从API缓存）
  reviewers: PersonInfo[];         // 审核人员列表（从API缓存）
  recentParticipants: string[];    // 最近使用的参与人员ID
  recentReviewers: string[];       // 最近使用的审核人员ID
  gitInfo?: {
    projectUrl: string;
    projectName: string;
  };
  lastUpdated: number;             // 缓存更新时间
}

// 登录结果类型
export interface LoginResult {
  success: boolean;
  accessToken?: string;
  userInfo?: DingTalkUserInfo;
  message?: string;
}

// 迭代模板类型
export interface IterationTemplate {
  basicInfo: IterationBasicInfo;
  crApplication: CRApplication;
} 