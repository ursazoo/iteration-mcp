import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import qrcode from 'qrcode-terminal';
// Token 存储路径
const TOKEN_PATH = join(homedir(), '.dingtalk-token.json');
/**
 * 钉钉登录管理器
 */
export class DingTalkAuth {
    config;
    constructor(config) {
        this.config = config;
    }
    /**
     * 检查是否已登录（token 是否有效）
     */
    async isLoggedIn() {
        try {
            const token = this.getStoredToken();
            if (!token)
                return false;
            // 检查 token 是否过期
            if (Date.now() > token.expires_at) {
                return false;
            }
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * 获取当前用户信息
     */
    getCurrentUser() {
        try {
            const token = this.getStoredToken();
            return token?.user_info || null;
        }
        catch {
            return null;
        }
    }
    /**
     * 启动钉钉登录流程
     */
    async login() {
        try {
            // 生成登录 URL
            const loginUrl = this.generateLoginUrl();
            return new Promise((resolve, reject) => {
                console.log('\n请使用钉钉扫描以下二维码登录：\n');
                // 生成并显示二维码
                qrcode.generate(loginUrl, { small: true }, (qrCode) => {
                    console.log(qrCode);
                    console.log('\n扫码完成后，请在钉钉中完成授权...\n');
                    // 这里需要实现轮询或回调来获取登录结果
                    // 暂时返回模拟数据，待后续完善
                    setTimeout(() => {
                        const mockUser = {
                            openid: 'mock_openid',
                            unionid: 'mock_unionid',
                            nick: '测试用户',
                            name: '测试用户',
                            department: '技术部'
                        };
                        const mockToken = {
                            access_token: 'mock_token',
                            expires_at: Date.now() + 7200000, // 2小时后过期
                            user_info: mockUser
                        };
                        this.saveToken(mockToken);
                        resolve({
                            success: true,
                            accessToken: mockToken.access_token,
                            userInfo: mockUser
                        });
                    }, 3000);
                });
            });
        }
        catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : String(error)
            };
        }
    }
    /**
     * 退出登录
     */
    logout() {
        if (existsSync(TOKEN_PATH)) {
            writeFileSync(TOKEN_PATH, '');
        }
    }
    /**
     * 生成钉钉登录 URL
     */
    generateLoginUrl() {
        const params = new URLSearchParams({
            appid: this.config.appId,
            response_type: 'code',
            scope: 'snsapi_login',
            state: Date.now().toString(),
            redirect_uri: 'http://localhost:3000/callback' // 暂时的占位符
        });
        return `https://oapi.dingtalk.com/connect/oauth2/sns_authorize?${params.toString()}`;
    }
    /**
     * 获取存储的 token
     */
    getStoredToken() {
        if (!existsSync(TOKEN_PATH))
            return null;
        try {
            const content = readFileSync(TOKEN_PATH, 'utf8');
            if (!content.trim())
                return null;
            return JSON.parse(content);
        }
        catch {
            return null;
        }
    }
    /**
     * 保存 token
     */
    saveToken(token) {
        writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2));
    }
}
//# sourceMappingURL=dingtalk.js.map