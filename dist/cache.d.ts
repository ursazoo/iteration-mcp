import { LocalCache, UserInfo, MCPConfig, CompleteIteration, CRApplicationData } from './types.js';
/**
 * 本地缓存管理器
 */
export declare class CacheManager {
    private config?;
    constructor(config?: MCPConfig);
    /**
     * 生成CR申请单模板数据
     */
    generateCRApplicationTemplate(): Promise<CRApplicationData>;
    /**
     * 提交后更新缓存
     */
    updateAfterSubmission(iteration: CompleteIteration): Promise<void>;
    /**
     * 获取缓存数据
     */
    getCache(): LocalCache;
    /**
     * 保存缓存数据
     */
    saveCache(cache: LocalCache): void;
    /**
     * 获取参与人员列表（带缓存）
     */
    getParticipants(): Promise<UserInfo[]>;
    /**
     * 获取审核人员列表（带缓存）
     */
    getReviewers(): Promise<UserInfo[]>;
    /**
     * 根据ID获取用户信息
     */
    getUserInfo(id: number, type?: 'participant' | 'reviewer'): Promise<UserInfo | null>;
    /**
     * 根据姓名获取用户ID
     */
    getUserIdByName(name: string, type?: 'participant' | 'reviewer'): Promise<number | null>;
    /**
     * 更新最近使用的人员
     */
    updateRecentPersonnel(participantIds: number[], reviewerIds: number[]): void;
    /**
     * 更新项目线信息
     */
    updateProjectLine(projectLine: string): void;
    /**
     * 上传图片到OSS（暂未配置OSS，返回占位符）
     */
    uploadImageToOSS(imageBuffer: Buffer, filename: string): Promise<string>;
    /**
     * 处理从对话中获取的图片URL并上传到OSS（暂未配置OSS）
     */
    processImageFromChat(imageUrl: string, componentName: string): Promise<string>;
    /**
     * 刷新人员数据（从API获取）
     */
    private refreshPersonnelData;
    /**
     * 从API获取用户列表
     */
    private fetchUsersFromAPI;
    /**
     * 检查缓存是否过期
     */
    private isCacheExpired;
    /**
     * 获取默认缓存数据
     */
    private getDefaultCache;
}
//# sourceMappingURL=cache.d.ts.map