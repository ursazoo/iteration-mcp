import fs from 'fs';
import path from 'path';
import { homedir } from 'os';

/**
 * Manages configuration acquisition with a priority-based strategy.
 * This ensures flexible and secure configuration handling for different environments.
 *
 * Priority Order:
 * 1. Environment Variables (e.g., ITERATION_MCP_TOKEN, ITERATION_MCP_BASE_URL)
 * 2. Configuration File (searched in multiple locations)
 */
export class ConfigManager {
    private fullConfig: any = null;

    /**
     * Finds and returns the API base URL.
     * @returns The API base URL.
     */
    public async getBaseUrl(): Promise<string> {
        const config = await this.getFullConfig();
        return config.api?.baseUrl || 'http://default.example.com'; // Fallback
    }

    /**
     * Finds and returns an authentication token.
     * @returns The found token (without the "Bearer " prefix).
     */
    public async getToken(): Promise<string> {
        // Priority 1: Environment Variable
        const envToken = process.env.ITERATION_MCP_TOKEN;
        if (envToken) {
            console.log('✅ 使用环境变量 ITERATION_MCP_TOKEN 中的Token');
            return envToken;
        }

        // Priority 2: Configuration File
        const config = await this.getFullConfig();
        const authToken = config.auth?.Authorization;
        if (authToken && authToken.startsWith('Bearer ')) {
            return authToken.replace('Bearer ', '');
        }

        throw new Error('未在任何位置找到有效的Authorization Token。');
    }

    /**
     * Lazily loads and caches the full configuration.
     * @returns The full configuration object.
     */
    private async getFullConfig(): Promise<any> {
        if (this.fullConfig) {
            return this.fullConfig;
        }

        const configPath = this.findConfigFile();
        if (configPath) {
            try {
                this.fullConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                return this.fullConfig;
            } catch (error: any) {
                throw new Error(`读取或解析配置文件失败: ${error.message}`);
            }
        }

        throw new Error(this.getNoConfigFoundError());
    }

    /**
     * Finds the configuration file path by searching in prioritized locations.
     * @returns The found file path or null if not found.
     */
    private findConfigFile(): string | null {
        const configNames = ['mcp-config.json', '.mcp-config.json'];
        const searchPaths = [
            homedir(), // User home directory (highest priority)
            process.cwd(), // Current working directory
            path.join(__dirname, '..') // Project root directory
        ];

        for (const searchPath of searchPaths) {
            for (const configName of configNames) {
                const filePath = path.join(searchPath, configName);
                if (fs.existsSync(filePath)) {
                    console.log(`✅ 找到配置文件: ${filePath}`);
                    return filePath;
                }
            }
        }
        
        console.log(`❌ 在以下路径中未找到配置文件 (${configNames.join(', ')}):`);
        searchPaths.forEach(p => console.log(`   - ${p}`));
        return null;
    }

    private getNoConfigFoundError(): string {
        return `❌ **未找到配置文件**`;
    }
} 