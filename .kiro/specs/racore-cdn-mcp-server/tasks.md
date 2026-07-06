# 实施计划: Racore Cloud CDN MCP Server

## 概述

本计划将设计文档中的架构分解为可增量实施的编码任务。实施顺序为：项目骨架 → 基础设施层（认证、校验、API 客户端）→ 工具层 → 入口集成 → 测试补充。每个步骤基于前一步的产出，确保无孤立或悬空代码。

## 任务

- [x] 1. 搭建项目结构与核心配置
  - [x] 1.1 创建 package.json 和项目基础文件
    - 创建 `package.json`：设置 `"type": "module"`、`"engines": { "node": ">=18.0.0" }`、`"name": "racore-cdn-mcp-server"`、`"version": "1.0.0"`
    - 添加依赖 `@modelcontextprotocol/sdk` 和 `zod`
    - 添加开发依赖 `vitest` 和 `fast-check`
    - 配置 `"start"` 脚本为 `node index.mjs`，`"test"` 脚本为 `vitest --run`
    - 创建空的模块文件占位：`index.mjs`、`auth.mjs`、`api-client.mjs`、`validators.mjs`、`tools/cdn-traffic.mjs`、`tools/region-traffic.mjs`、`tools/request-count.mjs`
    - _需求: 6.1, 6.2, 6.3, 6.6, 6.7, 6.8_

- [x] 2. 实现参数校验器 (validators.mjs)
  - [x] 2.1 实现时间格式校验与业务规则校验
    - 实现 `validateTimeFormat(timeStr)` 函数：校验字符串是否符合 `yyyy-mm-dd hh:mm` 格式，包含月份/日期/小时/分钟的有效性检查
    - 实现 `validateTimeRange(startTime, endTime)` 函数：校验时间跨度不超过 90 天
    - 实现 `validateTimeParams(params)` 函数：处理互斥校验（start_time/end_time 与 scope 不能同时存在）、成对校验（start_time 和 end_time 必须同时提供）、默认 scope 为 today
    - 所有函数使用 ES Module export 语法导出
    - _需求: 3.3, 3.7, 3.8, 4.3, 4.4, 5.3, 5.7, 5.8, 7.3_

  - [ ]* 2.2 编写参数校验器的属性测试
    - **属性 3: 时间参数与 scope 互斥校验** — 对于任意有效的 start_time/end_time 和 scope 同时提供时，应返回参数冲突错误
    - **属性 4: 时间参数成对校验** — 对于任意仅提供 start_time 或 end_time 的情况，应返回参数错误
    - **属性 5: 时间跨度 90 天上限校验** — 对于任意时间差超过 90 天的时间对，应返回校验错误
    - **属性 6: 时间格式校验** — 对于任意不符合 yyyy-mm-dd hh:mm 格式的字符串，应拒绝输入
    - **验证: 需求 3.3, 3.7, 4.3, 4.4, 5.3, 5.7, 7.3**

- [x] 3. 实现认证管理器 (auth.mjs)
  - [x] 3.1 实现 HMAC-SHA512 签名计算与 Token 缓存管理
    - 实现 `createAuthManager(accessKey, secretKey)` 工厂函数
    - 内部实现签名计算：生成 RFC1123 时间戳 → 拼接 `x_request_date + access_key + secret_key` → HMAC-SHA512 → 小写十六进制输出
    - 实现 Token 缓存逻辑：缓存为空时执行认证、距过期不足 300 秒时提前刷新、有效时直接返回
    - 实现 `getValidToken()` 方法：向 `/API/OAuth/token` 发送 POST 请求获取 Token
    - 使用 Node.js 内置 `crypto` 模块，使用内置 `fetch` API
    - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 6.4, 6.5_

  - [ ]* 3.2 编写认证管理器的属性测试
    - **属性 1: 签名计算的确定性与格式** — 对于任意 access_key、secret_key 和日期字符串，签名应为 128 字符小写十六进制字符串，且相同输入产生相同输出
    - **属性 2: Token 刷新决策正确性** — 对于任意缓存 Token 和当前时间，当且仅当 (expire - 当前时间) < 300 秒时触发刷新
    - **验证: 需求 2.3, 2.6**

- [x] 4. 实现 API 客户端 (api-client.mjs)
  - [x] 4.1 实现 HTTP 请求封装与错误处理
    - 实现 `createApiClient(authManager)` 工厂函数
    - 实现 `post(endpoint, body)` 方法：获取 Token → 发送 POST 请求（Content-Type: application/json, Authorization: Bearer token）
    - 实现 30 秒超时控制：使用 `AbortController` + `setTimeout`
    - 实现 401 重试逻辑：清除缓存 → 重新认证 → 重试一次
    - 处理网络错误、JSON 解析错误、非成功状态码等异常
    - _需求: 7.1, 7.2, 7.4, 7.5, 7.6_

  - [ ]* 4.2 编写 API 客户端的单元测试
    - 使用 Vitest mock fetch，测试正常请求流程
    - 测试 30 秒超时场景
    - 测试 401 重试流程（重试成功和重试失败两种路径）
    - 测试网络连接失败和 JSON 解析失败场景
    - **属性 10: 错误响应统一标志** — 验证所有错误条件下返回 isError: true 和人类可读文本
    - **验证: 需求 7.1, 7.2, 7.4, 7.5, 7.6**

- [x] 5. 检查点 - 确保基础设施层完成
  - 确保所有测试通过，如有疑问请向用户确认。

- [x] 6. 实现 CDN 流量查询工具 (tools/cdn-traffic.mjs)
  - [x] 6.1 实现 query_cdn_traffic 工具注册与处理逻辑
    - 实现 `registerCdnTrafficTool(server, apiClient)` 函数
    - 定义 Zod schema：domain (可选字符串)、start_time (可选字符串)、end_time (可选字符串)、scope (可选枚举)
    - handler 内调用 `validateTimeParams` 校验参数（含 90 天限制）
    - 调用 `apiClient.post('/API/cdn/statistics/flow', params)` 发送请求
    - 格式化成功响应为 MCP 标准格式 `{ content: [{ type: "text", text: JSON.stringify(data) }] }`
    - 错误情况返回 `{ content: [...], isError: true }`
    - _需求: 3.1, 3.2, 3.4, 3.5, 3.6, 3.9_

  - [ ]* 6.2 编写 CDN 流量工具的属性测试
    - **属性 7: CDN 流量响应数据保留** — 对于任意有效 API 成功响应，工具输出包含所有原始记录且时间戳和流量值一致
    - **验证: 需求 3.5**

- [x] 7. 实现地区流量查询工具 (tools/region-traffic.mjs)
  - [x] 7.1 实现 query_region_traffic 工具注册与处理逻辑
    - 实现 `registerRegionTrafficTool(server, apiClient)` 函数
    - 定义 Zod schema：domain (可选字符串)、start_time (可选字符串)、end_time (可选字符串)、scope (可选枚举)
    - handler 内调用 `validateTimeParams` 校验参数（含成对校验）
    - 调用 `apiClient.post('/API/cdn/statistics/district', params)` 发送请求
    - 处理 data 数组为空的情况：返回说明无数据的文本
    - 处理 country_codes 数组：若非空则附加国家代码映射到输出
    - _需求: 4.1, 4.2, 4.5, 4.6, 4.7, 4.8, 4.9_

  - [ ]* 7.2 编写地区流量工具的属性测试
    - **属性 8: 地区流量响应完整性** — 对于任意有效响应，输出包含所有字段；若 country_codes 非空则附加完整映射
    - **验证: 需求 4.6, 4.7**

- [x] 8. 实现请求数查询工具 (tools/request-count.mjs)
  - [x] 8.1 实现 query_request_count 工具注册与处理逻辑
    - 实现 `registerRequestCountTool(server, apiClient)` 函数
    - 定义 Zod schema：domain (可选字符串)、start_time (可选字符串)、end_time (可选字符串)、scope (可选枚举)
    - handler 内调用 `validateTimeParams` 校验参数（含成对校验）
    - 调用 `apiClient.post('/API/cdn/statistics/request', params)` 发送请求
    - 格式化成功响应，保留所有时间戳和请求计数值
    - _需求: 5.1, 5.2, 5.4, 5.5, 5.6, 5.8_

  - [ ]* 8.2 编写请求数工具的属性测试
    - **属性 9: 请求数响应数据保留** — 对于任意有效 API 成功响应，输出包含所有原始记录且时间戳和请求数一致
    - **验证: 需求 5.5**

- [x] 9. 实现入口模块与全局集成 (index.mjs)
  - [x] 9.1 实现 MCP Server 初始化与工具注册
    - 读取环境变量 `RACORE_ACCESS_KEY` 和 `RACORE_SECRET_KEY`
    - 若环境变量缺失或为空：向 stderr 输出错误信息并以非零退出码终止
    - 创建 `McpServer` 实例（名称 "racore-cdn-mcp-server"，版本 "1.0.0"）
    - 创建 `createAuthManager` 和 `createApiClient` 实例
    - 调用三个工具的注册函数
    - 创建 `StdioServerTransport` 并调用 `server.connect(transport)` 启动服务
    - 确保所有日志/诊断信息输出到 stderr，stdout 仅用于 MCP 协议消息
    - _需求: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ]* 9.2 编写集成测试
    - 测试环境变量缺失时的错误输出和退出行为
    - Mock fetch 测试完整调用链路：工具调用 → 参数校验 → 认证 → API 请求 → 结果返回
    - 测试 Token 缓存复用（多次工具调用只认证一次）
    - 测试默认 scope 行为
    - _需求: 1.4, 1.5, 1.6, 3.8, 5.8_

- [x] 10. 最终检查点 - 确保所有测试通过
  - 确保所有测试通过，如有疑问请向用户确认。

## 备注

- 标记 `*` 的任务为可选任务，可跳过以加速 MVP 交付
- 每个任务引用了具体的需求编号以确保可追溯性
- 检查点用于增量验证，确保各层实现正确后再推进
- 属性测试验证普遍正确性属性，单元测试验证具体场景和边缘情况
- 所有代码使用 ES Module (.mjs) 语法，Node.js 18+ 环境

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "3.2", "4.1"] },
    { "id": 3, "tasks": ["4.2", "6.1", "7.1", "8.1"] },
    { "id": 4, "tasks": ["6.2", "7.2", "8.2", "9.1"] },
    { "id": 5, "tasks": ["9.2"] }
  ]
}
```
