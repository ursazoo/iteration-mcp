import { DingTalkConfig, DingTalkUserInfo, LoginResult } from './types.js';
/**
 * 钉钉登录管理器
 */
export declare class DingTalkAuth {
    private config;
    constructor(config: DingTalkConfig);
    /**
     * 检查是否已登录（token 是否有效）
     */
    isLoggedIn(): Promise<boolean>;
    /**
     * 获取当前用户信息
     */
    getCurrentUser(): DingTalkUserInfo | null;
    /**
     * 启动钉钉登录流程
     */
    login(): Promise<LoginResult>;
    /**
     * 退出登录
     */
    logout(): void;
    /**
     * 生成钉钉登录 URL
     */
    private generateLoginUrl;
    /**
     * 获取存储的 token
     */
    private getStoredToken;
    /**
     * 保存 token
     */
    private saveToken;
}
//# sourceMappingURL=dingtalk.d.ts.map