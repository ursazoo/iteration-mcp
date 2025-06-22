# Iteration MCP Server

一个用于在 Cursor 中管理迭代信息的 MCP 服务器，支持钉钉扫码登录。

## 功能特性

- 🔐 钉钉扫码登录认证
- 📝 交互式迭代信息创建
- 💾 自动 token 管理和续期
- 🔧 灵活的配置管理

## 安装配置

### 1. 编译项目
```bash
npm install
npm run build
```

### 2. 创建配置文件
在用户主目录创建 `~/.iteration-mcp-config.json` 文件：

```json
{
  "dingtalk": {
    "appId": "your_dingtalk_app_id",
    "appSecret": "your_dingtalk_app_secret"
  },
  "api": {
    "baseUrl": "https://your-company-api.com",
    "endpoints": {
      "createIteration": "/api/iteration/create",
      "submitDetail": "/api/iteration/detail"
    }
  }
}
```

### 3. 在 Cursor 中配置 MCP
编辑 Cursor 的 MCP 配置文件，添加：

```json
{
  "mcpServers": {
    "iteration": {
      "command": "/path/to/your/project/dist/index.js"
    }
  }
}
```

## 使用方法

### 可用工具

1. **check_login_status** - 检查钉钉登录状态
2. **login_dingtalk** - 钉钉扫码登录
3. **create_iteration** - 创建迭代信息

### 基本流程

1. 在 Cursor 中调用 `check_login_status` 检查登录状态
2. 如未登录，调用 `login_dingtalk` 进行扫码登录
3. 登录成功后，使用 `create_iteration` 创建迭代信息

## 开发状态

当前为 MVP 版本，已实现：
- ✅ 基础 MCP Server 框架
- ✅ 钉钉登录流程（二维码生成）
- ✅ Token 本地存储管理
- ✅ 基础的迭代创建工具

待完善功能：
- 🔄 实际的钉钉 OAuth 流程
- 🔄 真实的 API 接口调用
- 🔄 智能预填充功能
- 🔄 更多迭代管理工具

## 目录结构

```
src/
  ├── index.ts      # MCP Server 入口
  ├── types.ts      # 类型定义
  ├── config.ts     # 配置管理
  └── dingtalk.ts   # 钉钉登录管理
``` 主分支添加提交
