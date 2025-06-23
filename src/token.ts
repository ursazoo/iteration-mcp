import fs from 'fs';
import path from 'path';

/**
 * Manages token acquisition with a priority-based strategy.
 * This ensures flexible and secure token handling for different environments.
 *
 * Priority Order:
 * 1. Session Token (from DingTalk login, highest priority)
 * 2. Environment Variable (ITERATION_MCP_TOKEN)
 * 3. Configuration File (searched in multiple locations)
 */
export class TokenManager {
    private sessionToken: string | null = null;

    /**
     * Stores a token for the current session (e.g., from a successful DingTalk login).
     * This token takes precedence over all other sources.
     * @param token The personal token to store for the session.
     */
    public setSessionToken(token: string): void {
        this.sessionToken = token;
        console.log('🔑 会话Token已设置 (来自钉钉登录)，将优先使用此Token。');
    }

    /**
     * Clears the current session token, for instance, on logout.
     */
    public clearSessionToken(): void {
        this.sessionToken = null;
        console.log('🔑 会话Token已清除。');
    }

    /**
     * Checks if a session token is currently set.
     * @returns True if a session token exists, false otherwise.
     */
    public hasSessionToken(): boolean {
        return this.sessionToken !== null;
    }

    /**
     * Finds and returns a token based on the priority strategy.
     * It will attempt to find a token in the order of session, environment variable, and config file.
     * @returns The found token (without the "Bearer " prefix).
     * @throws A detailed error if no token can be found.
     */
    public async getToken(): Promise<string> {
        // 1. Session Token (Highest priority)
        if (this.sessionToken) {
            console.log('✅ 使用会话个人Token');
            return this.sessionToken;
        }

        // 2. Environment Variable
        const envToken = process.env.ITERATION_MCP_TOKEN;
        if (envToken) {
            console.log('✅ 使用环境变量 ITERATION_MCP_TOKEN 中的Token');
            return envToken;
        }
        
        // 3. Configuration File (multi-level search)
        const configPath = this.findTokenConfigFile();
        if (configPath) {
            console.log(`✅ 使用配置文件中的共享Token: ${configPath}`);
            try {
                const tokenConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                if (tokenConfig.Authorization && tokenConfig.Authorization.startsWith('Bearer ')) {
                    return tokenConfig.Authorization.replace('Bearer ', '');
                } else {
                    throw new Error('配置文件格式错误，应为: { "Authorization": "Bearer your_token_here" }');
                }
            } catch (error) {
                throw new Error(`读取或解析Token配置文件失败: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        // 4. No token found, throw a helpful error
        throw new Error(this.getNoTokenFoundError());
    }

    /**
     * Finds the token configuration file path by searching in prioritized locations.
     * @returns The found file path or null if not found.
     */
    private findTokenConfigFile(): string | null {
        const configName = 'test-token.config.json';

        const searchPaths = [
            // Highest priority: Project directory (allows project-specific override)
            path.join(process.cwd(), configName),
            // Default: Tool's root directory (for global default configuration)
            path.join(__dirname, '..', configName) 
        ];

        for (const p of searchPaths) {
            if (fs.existsSync(p)) {
                return p;
            }
        }

        return null;
    }

    /**
     * Generates a user-friendly error message when no token can be found.
     * This guides the user on how to configure authentication.
     */
    private getNoTokenFoundError(): string {
        return `
❌ **未找到可用的认证Token**

请通过以下**任意一种**方式配置Token，按优先级排序：

**1. 钉钉扫码登录 (推荐)**
   - 调用 \`login_dingtalk\` 工具进行扫码登录，获取临时的个人Token。

**2. 环境变量 (CI/CD环境)**
   - 设置环境变量 \`ITERATION_MCP_TOKEN\`。
   - 示例: \`export ITERATION_MCP_TOKEN=your_token_without_bearer\`

**3. 配置文件 (共享/备用)**
   - 在以下**任一位置**创建 \`test-token.config.json\` 文件:
     - **项目目录 (项目级配置):** ${path.join(process.cwd(), 'test-token.config.json')}
     - **工具目录 (全局默认):** ${path.join(__dirname, '..', 'test-token.config.json')}
   - 文件内容:
     \`\`\`json
     {
       "Authorization": "Bearer your_token_here"
     }
     \`\`\`
`;
    }
} 