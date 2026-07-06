# 需求文档

## 简介

本项目实现一个 MCP (Model Context Protocol) Server，用于封装 Racore Cloud CDN API 的统计查询能力。该 MCP Server 以 MJS (ES Module JavaScript) 项目形式实现，提供 CDN 流量查询、国家/地区流量查询和请求数查询三个核心工具。通过标准 MCP 协议，AI 助手可以直接调用这些工具来获取 CDN 统计数据。

## 术语表

- **MCP_Server**: 遵循 Model Context Protocol 的服务端程序，通过 stdio 传输与 MCP 客户端通信，暴露可调用的工具（Tools）
- **Racore_API**: Racore Cloud CDN 平台提供的 REST API，基础地址为 https://portal.racorecloud.com
- **Access_Key**: 用于 Racore API 认证的公开密钥标识符
- **Secret_Key**: 用于 Racore API 签名计算的私密密钥
- **Bearer_Token**: 通过 OAuth 认证接口获取的访问令牌，有效期 24 小时
- **Signature**: 使用 HMAC-SHA512 算法，以 Secret_Key 为密钥，对 (x_request_date + Access_Key + Secret_Key) 进行签名的结果
- **x_request_date**: RFC1123 格式的时间戳，用于请求签名，需与当前时间相差不超过 5 分钟
- **Token_Cache**: 本地缓存的 Bearer Token 及其过期时间信息
- **scope**: 预定义的时间范围参数，可选值为 today、yesterday、week、month、last_month
- **CDN_Tool**: MCP Server 暴露的工具，允许 AI 助手查询 CDN 统计数据

## 需求

### 需求 1: MCP Server 初始化与传输

**用户故事:** 作为开发者，我希望 MCP Server 能正确初始化并通过 stdio 传输通信，以便 AI 助手可以连接并使用 CDN 查询工具。

#### 验收标准

1. THE MCP_Server SHALL 使用 MCP SDK 的 stdio 传输方式初始化并监听来自客户端的连接
2. THE MCP_Server SHALL 在初始化时声明服务名称为 "racore-cdn-mcp-server" 和语义化版本号（格式为 "x.y.z"）
3. THE MCP_Server SHALL 注册三个工具: query_cdn_traffic、query_region_traffic、query_request_count，每个工具包含名称、描述和输入参数 JSON Schema 定义
4. WHEN MCP_Server 启动时，THE MCP_Server SHALL 从环境变量 RACORE_ACCESS_KEY 和 RACORE_SECRET_KEY 读取认证凭据
5. IF 环境变量 RACORE_ACCESS_KEY 或 RACORE_SECRET_KEY 未设置或值为空字符串，THEN THE MCP_Server SHALL 向 stderr 输出错误信息指明缺失的环境变量名称，并以非零退出码终止进程
6. THE MCP_Server SHALL 仅通过 stdout 发送 MCP 协议消息，所有日志或诊断信息须输出到 stderr

### 需求 2: API 认证与 Token 管理

**用户故事:** 作为 MCP Server，我需要自动处理 Racore API 认证，以便所有工具调用都能使用有效的访问令牌。

#### 验收标准

1. WHEN 需要调用 Racore_API 且 Token_Cache 为空时，THE MCP_Server SHALL 执行认证流程获取新的 Bearer_Token
2. WHEN 执行认证流程时，THE MCP_Server SHALL 生成 RFC1123 格式的 x_request_date 时间戳（例如 "Wed, 21 Nov 2018 01:29:20 GMT"），该时间戳与当前 UTC 时间的偏差不超过 5 分钟
3. WHEN 执行认证流程时，THE MCP_Server SHALL 使用 HMAC-SHA512 算法，以 Secret_Key 为密钥，对 (x_request_date + Access_Key + Secret_Key) 拼接字符串进行签名计算，输出为小写十六进制编码字符串
4. WHEN 执行认证流程时，THE MCP_Server SHALL 向 Racore_API 的 /API/OAuth/token 端点发送 POST 请求，请求体包含 access_key 和 signature 字段，请求头包含 x-request-date 字段
5. WHEN 认证响应 code 为 1 时，THE MCP_Server SHALL 缓存返回的 token 及其 expire 时间（Unix 时间戳）
6. WHEN 需要调用 Racore_API 且已缓存的 Bearer_Token 距离 expire 时间不足 5 分钟时，THE MCP_Server SHALL 重新执行认证流程获取新的 Bearer_Token，再继续执行 API 调用
7. IF 认证请求在 30 秒内未收到响应或响应 code 不为 1，THEN THE MCP_Server SHALL 返回包含错误原因的工具调用错误，错误信息中指明是认证阶段失败及 API 返回的 message 内容

### 需求 3: 查询 CDN 流量工具

**用户故事:** 作为 AI 助手使用者，我希望查询 CDN 的流量消耗详情，以便了解流量使用趋势。

#### 验收标准

1. THE MCP_Server SHALL 注册名为 query_cdn_traffic 的工具，描述为"查询 CDN 流量消耗详情，返回时间序列流量数据"
2. THE query_cdn_traffic 工具 SHALL 接受以下可选参数: domain (字符串, 多个域名以逗号分隔)、start_time (字符串, 格式 yyyy-mm-dd hh:mm)、end_time (字符串, 格式 yyyy-mm-dd hh:mm)、scope (枚举: today/yesterday/week/month/last_month)
3. IF 同时提供 start_time/end_time 和 scope 参数，THEN THE MCP_Server SHALL 返回参数冲突错误，说明不能同时使用时间范围和 scope 参数
4. WHEN 调用 query_cdn_traffic 工具时，THE MCP_Server SHALL 向 Racore_API 的 /API/cdn/statistics/flow 端点发送 POST 请求，携带 Bearer_Token 认证头和用户提供的查询参数
5. WHEN Racore_API 返回 code 为 1 的成功响应时，THE query_cdn_traffic 工具 SHALL 返回流量时间序列数据列表，每条记录包含时间戳（Unix 时间戳字符串）和对应的流量值（字节数字符串）
6. IF Racore_API 返回 code 不为 1 的响应，THEN THE query_cdn_traffic 工具 SHALL 返回包含 API 返回的 message 字段内容的工具调用错误
7. IF start_time 和 end_time 的时间跨度超过 90 天，THEN THE query_cdn_traffic 工具 SHALL 返回参数校验错误，说明查询时间范围不能超过 90 天
8. IF 未提供任何时间参数（start_time/end_time 和 scope 均未提供），THEN THE query_cdn_traffic 工具 SHALL 默认使用 scope 为 today 进行查询
9. IF Racore_API 请求发生网络错误或超时，THEN THE query_cdn_traffic 工具 SHALL 返回包含连接失败原因的工具调用错误

### 需求 4: 查询国家/地区流量工具

**用户故事:** 作为 AI 助手使用者，我希望按国家/地区维度查询流量分布，以便了解不同地区的 CDN 使用情况。

#### 验收标准

1. THE MCP_Server SHALL 注册名为 query_region_traffic 的工具，描述为"查询 CDN 国家/地区流量和请求分布数据"
2. THE query_region_traffic 工具 SHALL 接受以下可选参数: domain (字符串)、start_time (字符串, 格式 yyyy-mm-dd hh:mm)、end_time (字符串, 格式 yyyy-mm-dd hh:mm)、scope (枚举: today/yesterday/week/month/last_month)
3. IF 同时提供 start_time/end_time 和 scope 参数，THEN THE MCP_Server SHALL 返回参数冲突错误，说明不能同时使用时间范围和 scope 参数
4. IF 仅提供 start_time 或仅提供 end_time（未成对提供），THEN THE MCP_Server SHALL 返回参数错误，说明 start_time 和 end_time 必须同时提供
5. WHEN 调用 query_region_traffic 工具时，THE MCP_Server SHALL 向 Racore_API 的 /API/cdn/statistics/district 端点发送 POST 请求，携带 Bearer_Token 认证头和用户提供的查询参数
6. WHEN Racore_API 返回 code 为 1 的成功响应时，THE query_region_traffic 工具 SHALL 返回地区分布数据，每条记录包含地区代码（region）、请求数（req）、请求占比百分比（req_ratio）、流量字节数（flow）和流量占比百分比（flow_ratio）
7. WHEN Racore_API 返回 code 为 1 的成功响应且响应中包含非空的 country_codes 数组时，THE query_region_traffic 工具 SHALL 在返回结果中附加国家代码映射列表，每条映射包含国家代码（code）、中文名称（zh）和英文名称（en）
8. WHEN Racore_API 返回 code 为 1 的成功响应且 data 数组为空时，THE query_region_traffic 工具 SHALL 返回空结果并说明所查询时间范围内无地区流量数据
9. IF Racore_API 返回 HTTP 非 2xx 状态码或响应体中 code 不为 1，THEN THE query_region_traffic 工具 SHALL 返回包含 API 错误消息（message 字段内容）的工具调用错误

### 需求 5: 查询请求数工具

**用户故事:** 作为 AI 助手使用者，我希望查询 CDN 请求数量的时间序列数据，以便了解请求趋势。

#### 验收标准

1. THE MCP_Server SHALL 注册名为 query_request_count 的工具，描述为"查询 CDN 请求数量时间序列数据"
2. THE query_request_count 工具 SHALL 接受以下可选参数: domain (字符串)、start_time (字符串, 格式 yyyy-mm-dd hh:mm)、end_time (字符串, 格式 yyyy-mm-dd hh:mm)、scope (枚举: today/yesterday/week/month/last_month)
3. IF 同时提供 start_time/end_time 和 scope 参数，THEN THE MCP_Server SHALL 返回参数冲突错误，说明不能同时使用时间范围和 scope 参数
4. WHEN 调用 query_request_count 工具时，THE MCP_Server SHALL 向 Racore_API 的 /API/cdn/statistics/request 端点发送 POST 请求，携带 Bearer_Token 认证头和用户提供的查询参数
5. WHEN Racore_API 返回 code 为 1 的成功响应时，THE query_request_count 工具 SHALL 返回请求数时间序列数据，每条记录包含 Unix 时间戳和对应的请求计数值，数据按 5 分钟间隔排列
6. IF Racore_API 返回 code 不为 1 的响应或 HTTP 请求失败，THEN THE query_request_count 工具 SHALL 返回包含 API 错误消息的工具调用错误
7. IF 仅提供 start_time 或仅提供 end_time（缺少另一个时间参数），THEN THE MCP_Server SHALL 返回参数错误，说明 start_time 和 end_time 必须成对提供
8. IF 未提供 start_time、end_time 和 scope 中的任何参数，THEN THE MCP_Server SHALL 使用 today 作为默认 scope 值进行查询

### 需求 6: 项目结构与技术规范

**用户故事:** 作为开发者，我希望项目遵循 ES Module 和 MCP SDK 的标准规范，以便于维护和扩展。

#### 验收标准

1. THE MCP_Server SHALL 使用 .mjs 文件扩展名实现所有源代码文件，包括入口文件和工具实现模块
2. THE MCP_Server SHALL 在 package.json 中设置 "type": "module" 以启用 ES Module 支持
3. THE MCP_Server SHALL 使用 @modelcontextprotocol/sdk 作为 MCP 协议实现依赖，并在 package.json 的 dependencies 中声明
4. THE MCP_Server SHALL 使用 Node.js 内置 crypto 模块实现 HMAC-SHA512 签名计算
5. THE MCP_Server SHALL 使用 Node.js 内置 fetch API 发送 API 请求，不引入第三方 HTTP 客户端依赖
6. THE MCP_Server SHALL 在 package.json 中提供 "start" 脚本，该脚本通过 node 命令执行项目入口 .mjs 文件以启动服务
7. THE MCP_Server SHALL 在所有源代码文件中使用 ES Module 的 import/export 语法，不使用 CommonJS 的 require/module.exports 语法
8. THE MCP_Server SHALL 要求 Node.js 版本不低于 18.0.0，并在 package.json 的 "engines" 字段中声明该最低版本约束

### 需求 7: 错误处理与健壮性

**用户故事:** 作为 AI 助手使用者，我希望工具在各种错误场景下提供清晰的错误信息，以便理解问题并修正查询。

#### 验收标准

1. IF 网络请求超过 30 秒未响应或连接失败，THEN THE MCP_Server SHALL 返回包含网络错误类型（超时或连接失败）和目标端点描述的工具调用错误
2. IF Racore_API 返回非 JSON 格式的响应，THEN THE MCP_Server SHALL 返回包含 HTTP 响应状态码和解析错误描述的工具调用错误
3. IF 工具参数中 start_time 或 end_time 格式不符合 yyyy-mm-dd hh:mm，THEN THE MCP_Server SHALL 返回参数校验错误，指明无效的参数名称及期望的格式 yyyy-mm-dd hh:mm
4. IF Token 认证失败导致 API 返回 401 状态码，THEN THE MCP_Server SHALL 清除 Token_Cache 并重新执行认证流程后重试原始请求一次
5. IF 重试后的请求仍然返回 401 状态码或认证流程失败，THEN THE MCP_Server SHALL 返回包含认证失败描述的工具调用错误，不再继续重试
6. THE MCP_Server SHALL 通过 MCP SDK 的 isError 标志返回所有工具调用错误，确保错误内容为人类可读的文本描述
