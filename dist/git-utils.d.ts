export interface GitInfo {
    projectUrl?: string;
    projectName?: string;
    currentBranch?: string;
    estimatedWorkDays?: number;
    productDoc?: string;
    technicalDoc?: string;
    projectDashboard?: string;
    designDoc?: string;
    participants?: string[];
    reviewers?: string[];
    remarks?: string;
}
/**
 * Git信息获取工具
 */
export declare class GitUtils {
    private workspaceRoot;
    constructor(workspaceRoot: string);
    /**
     * 获取完整的git信息
     */
    getGitInfo(): Promise<GitInfo>;
    /**
     * 读取git配置文件
     */
    private readGitConfigFile;
    /**
     * 从git remote获取项目信息
     */
    private getGitRemoteInfo;
    /**
     * 获取当前分支
     */
    private getCurrentBranch;
    /**
     * 计算预估工时（天数）
     */
    private calculateWorkDays;
    /**
     * 检查是否在git仓库中
     */
    isGitRepository(): boolean;
    /**
     * 创建示例配置文件
     */
    createExampleConfigFile(): void;
}
//# sourceMappingURL=git-utils.d.ts.map