<div align="center">
  <img src="./assets/apple-touch-icon.png" width="96" height="96" alt="ClueArk Logo" />

  <h1>ClueArk 线索方舟</h1>

  <p>
    <a href="./README.md">简体中文</a> |
    <a href="./README_EN.md">English</a>
  </p>

  <p>
    <strong>面向个人与团队的 AI 情报聚合平台</strong>
  </p>

  <p>
    围绕「话题监控」组织信息流：用一句话描述监控意图，系统自动规划说明、绑定信源，并以语义时间线与研判摘要呈现值得关注的线索。底层接入 RSS、网页列表与热点 API 等公开信源，支持私有化部署，适用于行业研究、趋势追踪与个人信息流管理。
  </p>
</div>



开源地址： [https://github.com/lqomg/ClueArk](https://github.com/lqomg/ClueArk)

演示地址： [https://clueark.com](https://clueark.com) 



> React + TypeScript + NestJS + MongoDB + Docker Compose 全栈项目，也可作为前端开发者入门全栈的参考。

<img width="1920" height="919" alt="ClueArk 界面预览" src="/assets/home.png" />

<img width="1920" height="919" alt="ClueArk 界面预览" src="/assets/demo.png" />

## 功能特性

- **AI 话题监控**：一句话创建监控；自动扩写说明、推荐信源，提供语义时间线与异步研判摘要。
- **多类信源**：RSS/Atom、网页列表（可选爬虫规则）、JSON 热点 API，统一资源池管理。
- **独立运营后台**：用户、监控、信源与任务审计；与用户产品分离部署入口。
- **Docker 一键部署**：MongoDB、Redis、Qdrant、API、Worker、用户前端、运营后台与爬虫默认同栈启动。
- **邮箱验证码**：注册 / 登录 / 找回密码；未配置 SMTP 时验证码写入后端日志，便于本地开发。

## 路线图

> 状态说明：`[x]` 已实现 · `[ ]` 规划中 · `[~]` 部分完成

### 已实现

- [x] **AI 话题监控**：一句话创建监控；LLM 自动扩写说明、规划并绑定信源
- [x] **多类公开信源**：RSS/Atom 增量拉取、Web 列表页爬虫（Cheerio + CSS 选择器）、JSON 热点 API（`hot_api`）
- [x] **内置信源目录**：50+ 中英文 RSS 与 Web 示例（见 `data/built-in-catalog.json`）
- [x] **语义匹配与聚类**：Embeddings + Qdrant 向量检索；相似报道增量聚簇
- [x] **LLM 条目富化**：异步生成摘要、推荐语等（不阻塞匹配推送）
- [x] **匹配推送与应用内通知**：按监控语义匹配推送，支持去重与冷却
- [x] **研判摘要（Brief）**：异步生成滚动时间窗研判报告（默认近 7 日）
- [x] **监控快照读模型**：列表与总览高性能读取（`monitor_snapshots`）
- [x] **用户时区**：个人资料可设 IANA 时区，列表/趋势按用户日历分桶
- [x] **独立运营后台**：用户、监控、信源与任务审计（与用户产品分离）
- [x] **Docker Compose 一键部署**：MongoDB、Redis、Qdrant、API、Worker、前端、爬虫同栈
- [x] **邮箱验证码**：注册 / 登录 / 找回密码（未配 SMTP 时验证码写日志，便于本地开发）
- [x] **异步任务流水线**：BullMQ（采集 → 向量化 → 匹配 → 通知 / 富化）

### 规划中

- [ ] **社交平台原生接入**
  - [ ] **X（Twitter）**：账号时间线、关键词搜索或列表页采集
  - [ ] **微博**：博主动态、话题/热搜监控
  - [ ] **微信公众号**：订阅号/服务号文章列表（在合规前提下）
  - [ ] 其他：知乎、今日头条、小红书等（按优先级逐步接入）
- [ ] **产品国际化（i18n）**
  - [~] 后端已接入 `nestjs-i18n`（错误/通知等，含 zh-CN、en、ja、ko）
  - [ ] 用户前端界面多语言切换（英文优先，再扩展其他语言）
  - [ ] 运营后台多语言
- [ ] **更多内置平台信源**：热点 API 模板与常用平台预置配置
- [ ] **Brief 日历窗口**：按日/周/月日历边界的研判报告（`calendar_range`）
- [ ] **实时通知**：SSE / WebSocket 替代当前轮询未读数

欢迎通过 [Issue](https://github.com/lqomg/ClueArk/issues) 讨论优先级或认领任务；架构约定见 [AGENTS.md](AGENTS.md)。

## 信源类型

| 类型 | 说明 |
|------|------|
| **RSS / Atom** | 标准订阅 Feed 增量拉取 |
| **Web** | 站点或列表页；无 Feed 时可配置爬虫规则 |
| **热点 API** | JSON HTTP 接口，可配置字段映射 |

内置示例见 `data/built-in-catalog.json`。

## 技术栈

| 部分 | 技术 |
|------|------|
| 用户前端 | React 18、TypeScript、Vite、Tailwind CSS |
| 运营后台 | React 18、Vite、Ant Design |
| 后端 | NestJS、MongoDB、Redis、Qdrant |
| 爬虫 | NestJS、Cheerio（详见 [crawler/README.md](crawler/README.md)） |

子项目：`frontend/`、`admin-web/`、`backend/`、`crawler/`（根目录无统一 `package.json`）。

## 快速部署

**环境**：Docker、Docker Compose（v2）。

```bash
git clone <本仓库地址>
cd <克隆后的目录名>

cp .env.example .env
# 编辑 .env：生产务必修改密码与密钥（见 .env.example 注释）
# 须配置 FEED_EMBEDDING_API_KEY、DEEPSEEK_API_KEY

docker compose up -d --build
```

**访问地址**

- 用户产品：`http://<host>:8080`（默认 `WEB_PORT=8080`；未设置时可能映射宿主机 80）
- 运营后台：`http://<host>:8081`（`ADMIN_WEB_PORT`），使用 `ADMIN_EMAIL` / `ADMIN_PASSWORD` 登录
- HTTP API：经前端 Nginx 的 `/api` 反代，不单独对外暴露 backend 端口

完整环境变量见 **[`.env.example`](.env.example)**。

## 本地开发

需 Node.js 20+，自备 MongoDB、Redis、Qdrant，并在 `backend/.env` 中配置连接信息与 API 密钥。

```bash
cd backend && cp .env.example .env && npm install && npm run dev
cd frontend && npm install && npm run dev
cd admin-web && npm install && npm run dev   # 默认 :5174
cd crawler && cp .env.example .env && npm install && npm run start:dev
```

架构约定、模块说明与联调细节见 **[AGENTS.md](AGENTS.md)**；后端与爬虫环境变量见 `backend/.env.example`、`crawler/.env.example`。

## 合规与安全

使用本软件访问第三方网站时，请遵守法律法规及目标站点条款与 robots 协议。**使用者自行承担合规责任**。

## 开源协议

本项目基于 **[MIT License](LICENSE)** 开源。

## 贡献

欢迎 Issue 与 Pull Request。架构与协作约定见 [AGENTS.md](AGENTS.md)。
