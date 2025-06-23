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

// 用户列表接口返回类型（统一使用）
export interface UserInfo {
  id: number;
  realName: string;
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
  crApplication: CRApplicationData;
}

// 正确的CR申请单数据结构
export interface CRApplicationData {
  reqDocUrl: string;           // 产品文档
  techDocUrl: string;          // 技术分析文档
  projexUrl: string;           // 项目大盘链接（一般填"-"）
  uxDocUrl: string;            // 设计稿链接
  gitlabUrl: string;           // 项目git地址
  gitProjectName: string;      // git项目名称
  gitlabBranch: string;        // 分支名
  participantIds: string;      // 参与人员ID（逗号分隔）
  checkUserIds: string;        // 审核人员ID（逗号分隔）
  spendTime: string;           // 预估工时
  componentList: ComponentItem[];
  functionList: FunctionItem[];
  sprintId: number;            // 迭代ID
}

export interface ComponentItem {
  componentName: string;       // 组件名称
  address: string;             // 组件相对路径
  auditId: number;             // 审核人员ID
  imgUrl: string;              // 组件截图URL
}

export interface FunctionItem {
  desc: string;                // 功能描述
}

// OSS 配置
export interface OSSConfig {
  region: string;
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
}

// 阿里云OSS令牌请求参数
export interface AliossAccessIdParams {
  // 可以根据实际需要添加参数，比如文件类型、目录等
  fileType?: string;
  directory?: string;
}

// 阿里云OSS访问数据
export interface AliossAccessData {
  accessKeyId: string;        // 临时访问密钥ID
  accessKeySecret: string;    // 临时访问密钥Secret
  securityToken: string;      // 安全令牌
  expiration: string;         // 过期时间
  bucket: string;             // 存储桶名称
  region: string;             // 区域
  endpoint: string;           // 端点URL
  host?: string;              // 主机地址
  dir?: string;               // 上传目录
}

// MCP 工具配置
export interface MCPConfig {
  projectPath?: string;             // 项目根目录路径（可选，默认使用当前目录）
  dingtalk: DingTalkConfig;
  api: {
    baseUrl: string;
    endpoints: {
      // 通用接口
      login: string;                  // 用户登录接口
      getUserList: string;            // 获取用户列表（参与人员和审核人员）
      getHobbyList: string;           // 获取兴趣列表
      getProjectList: string;         // 获取项目组列表
      getTodayNewsList: string;       // 今日资讯
      getOSSToken: string;            // 获取阿里云OSS访问令牌
      
      // 迭代管理接口
      createIteration: string;        // 创建迭代基础信息
      updateIteration: string;        // 修改迭代
      deleteIteration: string;        // 删除迭代
      getIterationDetail: string;     // 获取迭代详情
      getIterationList: string;       // 获取迭代列表
      
      // CR申请单接口
      createCRApplication: string;    // 创建CR申请单
      getCRApplicationList: string;   // 获取CR申请单列表
      updateCRApplication: string;    // 修改CR申请单
      deleteCRApplication: string;    // 删除CR申请单
      getCRApplicationDetail: string; // 获取CR申请单详情
      checkCRApplicationStatus: string; // CR申请单修改复审状态
      
      // CR问题管理接口
      createCRProblem: string;        // 新增CR问题
      updateCRProblem: string;        // 修改CR问题
      deleteCRProblem: string;        // 删除CR问题
      getCRProblemDetail: string;     // 获取CR问题详情
      getCRProblemList: string;       // 获取CR问题列表
      setCRProblemStatus: string;     // CR问题解决/重新打开
    };
  };
  oss?: OSSConfig;                  // OSS配置（可选）
}

// 本地缓存数据
export interface LocalCache {
  projectLines: string[];           // 项目线选项
  defaultProjectLine?: string;      // 默认项目线
  participants: UserInfo[];         // 参与人员列表（从API缓存）
  reviewers: UserInfo[];           // 审核人员列表（从API缓存）
  recentParticipants: number[];    // 最近使用的参与人员ID
  recentReviewers: number[];       // 最近使用的审核人员ID
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