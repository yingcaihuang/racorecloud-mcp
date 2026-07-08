# Racore Cloud CDN MCP Server

一个基于 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) 的 Racore Cloud CDN 管理工具，让 AI 助手（如 Kiro、Claude Desktop、Cursor 等）能够直接管理你的 CDN 加速域名。

## 功能概览

| 分类 | 工具数量 | 功能 |
|------|----------|------|
| 域名操作 | 6 | 创建/启用/停用/删除域名、获取域名列表、**一键快速创建** |
| 域名配置 | 45+ | 源站、HTTPS、压缩、IPv6、缓存、访问控制、协议等全部配置的查询和修改 |
| 证书管理 | 5 | 申请/上传/更新/查询证书 |
| 内容管理 | 6 | 预热/刷新内容及状态查询 |
| 统计分析 | 12 | 流量、请求数、状态码、Top 域名/URL/Referer/UA、命中率、**一键全部查询** |
| 日志管理 | 1 | 日志下载列表 |
| 工单管理 | 9 | 工单完整生命周期管理 |

### 亮点功能

- **一键创建域名** (`quick_create_domain`)：只需提供域名和源站，自动匹配/申请 SSL 证书
- **一键查询全部配置** (`query_all_domain_config`)：一次调用获取域名所有配置信息
- **一键查询全部统计** (`query_all_statistics`)：一次调用获取域名所有统计数据（流量、请求数、命中率、状态码、Top排行等）
- **智能状态检查**：修改配置前自动检查域名状态，state=6 时自动等待（30秒×3次），超时后返回详细等待日志
- **智能等待部署**：配置修改时若域名正在部署中(state=6)，自动等待最长 90 秒直到就绪
- **自动证书申请**：创建域名时若无匹配证书，自动申请泛域名证书并返回 DNS 验证信息

## 环境要求

- **Node.js** >= 18.0.0
- **Racore Cloud 账号**：需要 Access Key 和 Secret Key（[获取方式](https://portal.racorecloud.com)）

## 安装步骤

### 1. 克隆项目

```bash
git clone https://github.com/yingcaihuang/racorecloud-mcp.git
cd racorecloud-mcp
```

或者直接下载 ZIP 解压：

```bash
cd ~/Downloads/racorecloud-mcp
```

### 2. 安装依赖

```bash
npm install
```

### 3. 验证安装

```bash
node --check index.mjs && echo "✅ 安装成功"
```

## 配置 MCP 客户端

### 方式一：Kiro IDE

在 Kiro 中配置 MCP Server，编辑配置文件：

**项目级配置**（仅当前项目生效）：
```
.kiro/settings/mcp.json
```

**全局配置**（所有项目生效）：
```
~/.kiro/settings/mcp.json
```

添加以下内容：

```json
{
  "mcpServers": {
    "racore-cdn": {
      "command": "node",
      "args": ["/你的路径/racorecloud-mcp/index.mjs"],
      "env": {
        "RACORE_ACCESS_KEY": "你的 Access Key",
        "RACORE_SECRET_KEY": "你的 Secret Key"
      },
      "disabled": false
    }
  }
}
```

> ⚠️ **注意**：`args` 中必须使用 **绝对路径**，不支持相对路径或 `cwd` 字段。

### 方式二：Claude Desktop

编辑 Claude Desktop 配置文件：

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "racore-cdn": {
      "command": "node",
      "args": ["/你的路径/racorecloud-mcp/index.mjs"],
      "env": {
        "RACORE_ACCESS_KEY": "你的 Access Key",
        "RACORE_SECRET_KEY": "你的 Secret Key"
      }
    }
  }
}
```

### 方式三：Cursor

在 Cursor 的 Settings → MCP Servers 中添加，或编辑 `.cursor/mcp.json`：

```json
{
  "mcpServers": {
    "racore-cdn": {
      "command": "node",
      "args": ["/你的路径/racorecloud-mcp/index.mjs"],
      "env": {
        "RACORE_ACCESS_KEY": "你的 Access Key",
        "RACORE_SECRET_KEY": "你的 Secret Key"
      }
    }
  }
}
```

### 方式四：Amazon Q Developer (Quick Desktop)

1. 复制项目中的 `mcp.json` 文件内容（修改路径和密钥后）：

```json
{
  "mcpServers": {
    "racore-cdn": {
      "command": "node",
      "args": ["/你的路径/racorecloud-mcp/index.mjs"],
      "env": {
        "RACORE_ACCESS_KEY": "你的 Access Key",
        "RACORE_SECRET_KEY": "你的 Secret Key"
      }
    }
  }
}
```

2. 打开 Amazon Q Developer Desktop 的 **Settings**
3. 进入 **Capabilities** 选项卡
4. 找到 **MCP Server** 区域，点击 **Add MCP Server**
5. 类型选择 **Local**
6. 点击 **Paste JSON**，粘贴上面的 JSON 内容
7. 保存后 MCP Server 会自动连接

> 💡 **提示**：也可以直接将 `mcp.json` 文件放在项目根目录，Amazon Q 会自动识别。

### 验证配置

配置完成后，在 AI 助手中尝试：

> "查询我的 CDN 域名列表"

如果返回域名信息，说明配置成功。

## 获取 API 密钥

1. 登录 [Racore Cloud 控制台](https://portal.racorecloud.com)
2. 进入个人中心 → API 密钥管理
3. 复制 **Access Key** 和 **Secret Key**

## 使用示例

### 一键创建加速域名

> "帮我添加 v2.bbv.cfai.work 源站为 www2.myccdn.info 的加速"

工具会自动：
1. 判断源站类型（IP 或域名）
2. 查找匹配的 SSL 证书
3. 如果没有证书 → 自动申请泛域名证书（DNS 验证方式），等待数秒后返回 CNAME 验证记录
4. 返回的信息包含：证书 ID、验证 CNAME 主机记录和记录值、操作步骤指引
5. 添加 DNS 验证记录后，证书签发（通常 5-30 分钟），再次调用即可完成创建
6. 如果有证书 → 直接创建域名并开启 SSL

### 查询域名全部配置

> "查询 v1.bbv.cfai.work 的全部配置"

一次返回源站、HTTPS、压缩、缓存、访问控制等所有配置信息。

### 修改域名配置

> "把 v1.bbv.cfai.work 的 HTTP/2 开启"

工具会：
1. 先检查域名状态（必须是 state=1 启用中）
2. 如果正在部署中（state=6）→ 自动等待 30 秒后重试，最多重试 3 次（最长等 90 秒）
3. 等待期间输出进度日志，如：`⏳ 域名正在配置发布中，等待 30 秒后重试 (1/3)...`
4. 就绪后自动执行配置修改；超时则返回详细等待过程说明

### 统计查询

> "查询 v1.bbv.cfai.work 的所有统计数据"

一次调用返回全部统计：流量、请求数、地区分布、缓存命中率、HTTP 状态码、Top URL/Referer/UA。

> "查询这个月的 CDN 流量 Top 域名"

> "查询 v1.bbv.cfai.work 昨天的请求数"

### 内容刷新

> "刷新 https://v1.bbv.cfai.work/index.html 的缓存"

### 证书管理

> "查看我的证书列表"

> "为 *.newdomain.com 申请 SSL 证书"

### 工单管理

> "创建一个工单，标题是'域名配置异常'，内容是..."

> "查看我的工单列表"

## 完整工具列表

### 域名操作 (domain-operations)

| 工具名 | 说明 |
|--------|------|
| `quick_create_domain` | 一键快速创建 CDN 加速域名（自动匹配/申请证书） |
| `create_domain` | 创建 CDN 加速域名（完整参数版） |
| `enable_domain` | 启用已关闭的域名 |
| `disable_domain` | 停用已启用的域名 |
| `delete_domain` | 删除已关闭的域名 |
| `get_domain_list` | 获取域名列表 |

### 域名配置 (domain-config)

| 工具名 | 说明 |
|--------|------|
| `query_all_domain_config` | 一键查询域名全部配置 |
| `query_domain_origin` / `set_domain_origin` | 查询/设置源站配置 |
| `query_domain_origin_host` / `set_domain_origin_host` | 查询/设置回源 Host |
| `query_domain_origin_protocol` / `set_domain_origin_protocol` | 查询/设置回源协议 |
| `query_domain_https` / `set_domain_https` | 查询/设置 HTTPS |
| `query_domain_force_https` / `set_domain_force_https` | 查询/设置强制 HTTPS 跳转 |
| `query_domain_http2` / `set_domain_http2` | 查询/设置 HTTP/2 |
| `query_domain_http3` / `set_domain_http3` | 查询/设置 HTTP/3 |
| `query_domain_min_tls` / `set_domain_min_tls` | 查询/设置最低 TLS 版本 |
| `query_domain_smart_compression` / `set_domain_smart_compression` | 查询/设置智能压缩 |
| `query_domain_ipv6` / `set_domain_ipv6` | 查询/设置 IPv6 |
| `query_domain_cache_policy` / `set_domain_cache_policy` | 查询/设置缓存策略 |
| `query_domain_ip_blackwhitelist` / `set_domain_ip_blackwhitelist` | 查询/设置 IP 黑白名单 |
| `query_domain_referer_blackwhitelist` / `set_domain_referer_blackwhitelist` | 查询/设置 Referer 黑白名单 |
| `query_domain_ua_blackwhitelist` / `set_domain_ua_blackwhitelist` | 查询/设置 UA 黑白名单 |
| `query_domain_http_response_headers` / `set_domain_http_response_headers` | 查询/设置 HTTP 响应头 |
| `query_domain_origin_headers` / `set_domain_origin_headers` | 查询/设置回源请求头 |
| `query_domain_origin_timeout` / `set_domain_origin_timeout` | 查询/设置回源超时（AWS） |
| `query_domain_geo_restriction` / `set_domain_geo_restriction` | 查询/设置地理访问控制（AWS） |
| `query_country_region_data` | 查询国家/地区代码数据 |
| `get_aws_cache_policy_list` | 获取 AWS 缓存策略列表 |
| `get_aws_origin_request_policy_list` / `set_aws_origin_request_policy` | AWS 回源请求头策略 |
| `get_aws_response_policy_list` / `set_aws_response_policy` | AWS 响应头策略 |

### 证书管理 (certificate)

| 工具名 | 说明 |
|--------|------|
| `apply_aws_certificate` | 申请 AWS 证书 |
| `get_aws_cert_validation` | 获取证书验证信息 |
| `upload_certificate` | 上传证书 |
| `update_certificate` | 更新证书 |
| `get_certificate_list` | 获取证书列表 |

### 内容管理 (content-management)

| 工具名 | 说明 |
|--------|------|
| `purge_content` | 刷新缓存内容 |
| `query_purge_status` | 查询刷新状态 |
| `prefetch_content` | 预热内容 |
| `query_prefetch_status` | 查询预热状态 |
| `get_prewarm_regions` | 获取预热区域 |
| `get_prewarm_pop_points` | 获取 POP 节点列表 |

### 统计分析 (statistics)

| 工具名 | 说明 |
|--------|------|
| `query_all_statistics` | **一键查询全部统计数据**（流量、请求数、命中率、状态码、Top 排行） |
| `query_cdn_traffic` | 查询 CDN 流量 |
| `query_region_traffic` | 查询地区流量分布 |
| `query_request_count` | 查询请求数 |
| `query_http_status_summary` | 查询 HTTP 状态码汇总 |
| `query_http_status_detail` | 查询 HTTP 状态码详情 |
| `query_top_domains` | Top 域名排行 |
| `query_top_url` | Top URL 排行 |
| `query_top_referer` | Top Referer 排行 |
| `query_top_ua` | Top UA 排行 |
| `query_hit_traffic` | 缓存命中流量 |
| `query_hit_request_count` | 缓存命中请求数 |

### 日志管理 (log-management)

| 工具名 | 说明 |
|--------|------|
| `get_log_download_list` | 获取日志下载列表 |

### 工单管理 (workorder)

| 工具名 | 说明 |
|--------|------|
| `get_workorder_types` | 获取工单类型 |
| `create_workorder` | 创建工单 |
| `get_workorder_list` | 获取工单列表 |
| `cancel_workorder` | 取消工单 |
| `close_workorder` | 关闭工单 |
| `reopen_workorder` | 重新打开工单 |
| `delete_workorder` | 删除工单 |
| `get_workorder_messages` | 获取工单沟通记录 |
| `send_workorder_message` | 发送工单消息 |

## 项目结构

```
racorecloud-mcp/
├── index.mjs              # 入口文件：MCP Server 初始化
├── auth.mjs               # 认证模块：HMAC-SHA512 签名 + Token 缓存
├── api-client.mjs         # API 客户端：HTTP 请求封装（GET/POST/PUT/DELETE）
├── validators.mjs         # 参数校验器：时间格式、范围验证
├── tools/
│   ├── domain-operations.mjs   # 域名操作（创建/启用/停用/删除）
│   ├── domain-config.mjs       # 域名配置（全部查询/设置工具）
│   ├── certificate.mjs         # 证书管理
│   ├── content-management.mjs  # 内容刷新/预热
│   ├── cdn-traffic.mjs         # CDN 流量查询
│   ├── region-traffic.mjs      # 地区流量查询
│   ├── request-count.mjs       # 请求数查询
│   ├── statistics.mjs          # 其他统计工具
│   ├── log-management.mjs      # 日志管理
│   └── workorder.mjs           # 工单管理
├── package.json
└── mcp.json               # MCP 配置示例
```

## 常见问题

### Q: 提示 "环境变量未设置"

确保在 MCP 配置的 `env` 中正确填写了 `RACORE_ACCESS_KEY` 和 `RACORE_SECRET_KEY`。

### Q: 工具调用返回 "No route found"

部分接口可能在你的账户套餐中不可用。这不影响其他工具的使用。

### Q: 修改配置提示 "配置发布中"

工具会自动等待域名部署完成（最长 90 秒），期间会输出等待进度。如果超时仍未就绪，会返回完整的等待过程日志。你可以稍后再试，或通过 `get_domain_list` 查看域名状态。

### Q: 一键创建域名提示需要 DNS 验证

首次使用某个新的域名后缀时，需要申请 SSL 证书。按照返回的 CNAME 记录添加 DNS 后，等待证书签发，再次调用即可。

### Q: 如何在多个客户端之间共享配置？

将项目路径和密钥写入各客户端的 MCP 配置文件即可。密钥建议通过环境变量注入，避免明文存储。

## 技术规格

- **运行时**: Node.js 18+
- **模块系统**: ES Module (.mjs)
- **协议**: MCP (Model Context Protocol) via stdio
- **认证**: HMAC-SHA512 签名 + Bearer Token（自动缓存和刷新）
- **超时**: 所有 API 请求 30 秒超时
- **重试**: 401 自动重新认证并重试一次
- **API 基础地址**: https://portal.racorecloud.com

## License

MIT
