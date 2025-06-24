# MCP迭代管理工具

一个基于Model Context Protocol (MCP)的迭代管理工具，主要用于自动化收集和提交迭代信息到公司的CodeReview系统。支持钉钉扫码登录和交互式迭代创建流程。

## 🚀 快速开始

### 安装配置

1. **编译项目**

   ```bash
   npm install
   npm run build
   ```

2. **配置钉钉应用信息**
   在 `src/config.ts` 文件中修改钉钉配置：

   ```typescript
   // 在 MCP_CONFIG 中更新以下信息
   dingtalk: {
     appId: "your_actual_dingtalk_app_id",      // 替换为实际的钉钉应用ID
     appSecret: "your_actual_dingtalk_app_secret" // 替换为实际的钉钉应用密钥
   }
   ```

   配置修改后重新编译：

   ```bash
   npm run build
   ```

3. **在 Cursor 中配置 MCP**
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

### 基本使用流程

1. 在 Cursor 中调用 `check_login_status` 检查登录状态
2. 如未登录，调用 `login_dingtalk` 进行扫码登录
3. 登录成功后，使用 `create_iteration` 开始5步交互式流程
4. 使用 `submit_complete_iteration` 提交完整的迭代和CR申请单

## 👥 使用者指南（同事配置）

为了在你的本地环境中使用此MCP工具，请按照以下步骤进行一次性配置。

### 1. 环境准备

- **安装 Node.js**: 请确保你的电脑上已安装 Node.js (推荐LTS版本)。`npx`是Node.js自带的工具，我们需要它来运行此MCP工具。
  - 你可以通过在终端运行 `node -v` 来检查是否已安装。

### 2. 创建全局配置文件

这是最重要的一步，你需要创建一个全局配置文件来存放你的个人认证Token和API地址。

- **创建文件**:
  - 在你的**用户主目录**下，创建一个名为 `mcp-config.json` 的文件。
    - **macOS/Linux**: 文件路径应为 `~/.mcp-config.json`
    - **Windows**: 文件路径应为 `C:\\Users\\YourUsername\\.mcp-config.json`

- **配置文件内容**:
  - 将以下内容**完整复制**到你创建的`mcp-config.json`文件中，并**将`Authorization`的值替换为你自己的有效Token**。

  ```json
  {
    "api": {
      "baseUrl": "http://gw.fshows.com"
    },
    "auth": {
      "Authorization": "Bearer your_personal_token_here"
    }
  }
  ```

### 3. 在 Cursor 中配置

最后，告诉Cursor如何找到并运行这个工具。

- **添加工具配置**:
  - 将下面的JSON代码块添加到`"MCP"`的配置中。

  ```json
  "iteration-mcp-v2": {
      "name": "iteration-mcp-v2",
      "command": "npx",
      "args": [
          "-y",
          "@asthestarslept/iteration-mcp"
      ],
      "description": "用于创建和管理迭代的MCP工具"
  }
  ```
  
- **保存并重启**: 保存文件，然后**重启Cursor**以加载新工具。

**配置完成！** 现在你可以在Cursor中通过 `@iteration-mcp-v2` 来使用这个工具了。

## 🔧 工具列表

### 认证工具

- `check_login_status`: 检查登录状态和系统信息
- `login_dingtalk`: 钉钉扫码登录

### 迭代管理工具  

- `create_iteration`: 5步交互式迭代创建流程
- `submit_complete_iteration`: 两阶段API提交

### 数据查询工具

- `get_user_list`: 获取用户列表（参与人员和审核人员）

## 📊 数据流程

### 5步迭代创建流程

```md
Step 1: start
├── 获取项目组列表 (getProjectList API)
├── 获取用户列表 (从缓存)
└── 显示选项供用户选择

Step 2: basic_info  
├── 收集基础信息（项目线、迭代名称、上线时间）
├── 自动检测工作目录 (MCP根目录机制)
├── 自动获取Git信息（项目URL、分支、项目名）
├── 智能计算预估工时（基于项目实际开发天数）
└── 存储到 sessionData.basicInfo

Step 3: project_info
├── 收集项目信息（文档链接、人员配置）  
├── 使用Git信息作为默认值
└── 存储到 sessionData.projectInfo

Step 4: modules
├── 收集模块信息（组件模块、功能模块）
├── 组装完整迭代数据
└── 生成JSON数据预览供确认

Step 5: submit (手动确认)
├── 用户手动确认数据正确性
├── 调用 submit_complete_iteration
└── 两阶段API提交
```

### 两阶段提交流程

```md
Stage 1: 创建迭代基础信息
├── POST /api/codeReview/createSprint
├── 获取迭代ID
└── 验证创建结果

Stage 2: 创建CR申请单
├── 数据格式转换（CRApplication → CRApplicationData）
├── POST /api/codeReview/createCrRequest  
├── 获取CR申请单ID
└── 更新本地缓存
```

## 🏗️ 项目架构

### 文件结构

```md
src/
├── index.ts          # 主服务器入口，MCP工具定义和路由
├── config.ts         # 配置管理，API端点定义
├── api.ts           # API调用管理，HTTP请求封装
├── cache.ts         # 本地缓存管理，用户数据存储
├── dingtalk.ts      # 钉钉认证模块，扫码登录
├── git-utils.ts     # Git信息工具，智能工时计算和项目信息获取
└── types.ts         # TypeScript类型定义
```

### 主要组件

#### IterationMCPServer (index.ts)

- **职责**: MCP服务器主类，处理所有工具请求
- **核心功能**: 工具注册和路由、多步骤迭代创建流程管理、会话状态管理、错误处理和响应格式化

#### APIManager (api.ts)

- **职责**: 封装所有API调用
- **核心功能**: 统一的HTTP请求处理、认证token管理、两阶段提交流程、数据格式转换

#### CacheManager (cache.ts)

- **职责**: 本地数据缓存和管理
- **核心功能**: 用户列表缓存（24小时有效期）、项目线历史记录、最近使用人员管理、OSS图片上传支持

#### DingTalkAuth (dingtalk.ts)

- **职责**: 钉钉扫码登录认证
- **核心功能**: 扫码登录流程、Token获取和管理、用户信息解析

## 🔑 关键技术点

### API接口规范

- **统一使用POST方法**
- **Bearer Token认证**
- **统一的`/api`前缀**
- **标准响应格式**: `{success: boolean, data: any, errorMsg?: string}`

### 数据格式转换

工具内部使用人性化的数据收集格式，提交时转换为API要求的格式：

- `componentModules` → `componentList`
- `functionModules` → `functionList`  
- 人员ID数组 → 逗号分隔字符串

### 错误处理策略

- **分层错误处理**: 工具级 → 方法级 → API级
- **详细错误信息**: 包含HTTP状态码、响应数据、堆栈信息
- **优雅降级**: 缓存更新失败不影响主流程

### 会话管理

使用`sessionData`对象维护多步骤流程的状态：

- 每次`start`步骤清空会话
- 各步骤数据独立存储
- 最后一步组装完整数据

## 📚 配置说明

### 全局配置

项目使用内置配置管理，所有配置都在 `src/config.ts` 中：

- **API 配置**：默认使用 `http://gw.fshows.com` 作为基础地址
- **钉钉配置**：需要在代码中配置实际的 appId 和 appSecret
- **接口端点**：所有 API 端点都已预配置

如需修改 API 地址或端点，直接编辑 `src/config.ts` 文件。

### 项目级配置文件 (iteration-mcp.config)

工具支持在项目根目录创建 `iteration-mcp.config` 文件来配置项目特定信息：

```bash
# iteration-mcp.config
git_project_url=https://github.com/username/project-name
git_project_name=project-name
workdir=/path/to/project
```

**配置优先级**：
1. iteration-mcp.config 文件（推荐）
2. git_info.config.json 文件（向后兼容）
3. git remote 自动检测（fallback）

### 工作目录检测机制

工具使用MCP标准的roots机制自动检测工作目录：

1. **MCP客户端提供的workspace roots**（最高优先级）
2. 手动指定的workdir参数
3. 环境变量 (PWD, INIT_CWD)
4. process.cwd() (fallback)

### 智能工时计算

工具提供基于项目实际开发时间的智能工时计算：

**主分支 (main/master)**：
- 计算从第一次提交到当前时间的实际天数
- 例如：项目从2025-06-22开始，到2025-06-24 = 2天

**特性分支**：
- 优先使用分支从主分支分离的时间点计算
- 回退方案：使用分支第一次提交时间
- 最终回退：基于最近提交活动估算

**计算规则**：
- 最小工时：1天（取消了原来不合理的3天限制）
- 无上限限制（取消了原来的30天上限）
- 基于实际时间跨度，而非提交数量

## 🚀 二次开发指南

### 添加新工具

1. 在`setupHandlers()`的工具列表中添加定义
2. 在路由switch中添加case分支  
3. 实现对应的`handle*`方法
4. 更新类型定义（如需要）

### 添加新API接口

1. 在`config.ts`的`endpoints`中添加路径
2. 在`APIManager`中添加方法
3. 处理认证和错误
4. 更新类型定义

### 修改流程步骤

1. 更新`create_iteration`工具的`step`枚举
2. 在`handleCreateIteration`中添加新case
3. 实现对应的处理方法
4. 更新会话数据结构

## 🔍 调试技巧

### 启用详细日志

代码中已包含详细的console.log，可通过查看输出跟踪流程

### 使用测试工具

- `get_user_list`: 测试API连接和认证
- `check_login_status`: 查看系统状态

### 会话数据检查

在各步骤中输出`sessionData`内容，确认数据收集正确

## 📦 依赖说明

- `@modelcontextprotocol/sdk`: MCP协议实现
- `axios`: HTTP请求库
- `child_process`: Git命令执行
- `fs/path/os`: 文件系统和路径操作

## 🎯 开发状态

当前为生产版本，已实现：

- ✅ 基础 MCP Server 框架
- ✅ 钉钉登录流程（二维码生成）
- ✅ Token 本地存储管理
- ✅ 完整的5步迭代创建和提交流程
- ✅ 项目内配置管理
- ✅ 项目组选择功能
- ✅ 用户列表管理
- ✅ 两阶段API提交
- ✅ MCP标准roots机制工作目录检测
- ✅ iteration-mcp.config配置文件支持
- ✅ 智能工时计算（基于实际开发时间）
- ✅ 多格式配置文件读取（.config和.json）
- ✅ 详细注释和文档

## 🎯 最佳实践

1. **保持API调用的幂等性**
2. **合理使用缓存减少API调用**
3. **提供清晰的用户提示和错误信息**
4. **维护向后兼容性**
5. **及时更新文档和注释**
