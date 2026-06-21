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
    围绕「话题监控」组织信息流：用户用一句话描述监控意图，系统结合 LLM 规划说明与信源绑定，再用 Embedding 做语义时间线与研判摘要。底层持续接入 RSS、网页爬虫与热点 API 等公开信源，并支持条目富化、语义匹配与相似报道聚类，帮助用户从高噪声信息中快速发现值得关注的线索。项目定位于轻量、可私有化部署的信息工作台，适用于行业研究、技术趋势追踪、公共事件观察与个人知识输入流管理。
  </p>
</div>



开源地址： [https://github.com/lqomg/ClueArk](https://github.com/lqomg/ClueArk)

演示地址： [https://clueark.com](https://clueark.com) 



> 项目基于 React + TypeScript + NestJS + MongoDB + Docker 构建，是一套偏前端视角的全栈实践，也可作为前端开发者入门全栈开发的参考。

<img width="1920" height="919" alt="ClueArk 界面预览" src="/assets/home.png" />

<img width="1920" height="919" alt="ClueArk 界面预览" src="/assets/demo.png" />

## 功能特性

- **统一信源模型**：官方内置与用户自建共用同一套类型与指纹策略，便于扩展与运维。
- **AI 辅助话题监控**：一句话描述监控意图即可创建；系统自动扩写监控说明、抽取关键词与实体，并从已启用的统一信源池中推荐绑定信源；支持在设置中调整绑定信源与相似度阈值（`minCosine`）。时间线与侧栏指标依赖 Embedding；研判摘要由后端定时任务异步生成（详见下文「话题监控」）。
- **多类采集路径**：同一资源池内支持 **RSS/Atom**、**Web（含可选列表页爬虫）**、**JSON 热点 API（可配置字段映射）**，按需选用而非单一抓取方式。
- **独立 Web 爬虫服务**：对无稳定 Feed 的站点，通过 **CSS 选择器** 解析列表页 HTML（NestJS + Cheerio），与主站 **契约对齐** 上报；爬虫侧不依赖 LLM。详见 [`crawler/README.md`](crawler/README.md)。
- **可选智能化**：可按环境变量接入 DeepSeek、条目富化、Embedding 与聚类等（根目录与 `backend/.env.example`）；**创建监控**要求 Embedding 可用，且条目侧需具备与监控一致的语义向量字段，时间线才会有内容。
- **Docker Compose 单机栈**：MongoDB、**Redis**、**Qdrant**、后端 API、**BullMQ Worker**、用户前端、**独立运营后台**、爬虫默认同栈构建启动，适合快速部署。
- **监控优先读模型**：列表与研判指标由 `monitor_snapshots` 物化；向量仅存 Qdrant；新条目经队列完成 embed → 匹配 → 站内通知。

面向个人的情报采集与浏览：在统一信源池上订阅话题、浏览语义筛选后的时间线并查看研判摘要，减轻自行全网检索的负担。

## 路线图

> 状态说明：`[x]` 已实现 · `[ ]` 规划中 · `[~]` 部分完成

### 已实现

- [x] **AI 话题监控**：一句话创建监控；LLM 自动扩写说明、规划并绑定信源
- [x] **多类公开信源**：RSS/Atom 增量拉取、Web 列表页爬虫（Cheerio + CSS 选择器）、JSON 热点 API（`hot_api`）
- [x] **内置信源目录**：50+ 中英文 RSS 与 Web 示例（见 `data/built-in-catalog.json`）
- [x] **语义匹配与聚类**：Embeddings + Qdrant 向量检索；相似报道增量聚簇
- [x] **LLM 条目富化**：异步生成摘要、推荐语等（不阻塞匹配通知）
- [x] **匹配通知（站内）**：按监控语义匹配写入通知，支持去重与冷却
- [x] **研判摘要（Brief）**：异步生成滚动时间窗研判报告（默认近 7 日）
- [x] **监控快照读模型**：列表与总览高性能读取（`monitor_snapshots`）
- [x] **用户时区**：个人资料可设 IANA 时区，列表/趋势按用户日历分桶
- [x] **产品国际化（i18n）**：用户前端、运营后台与后端错误/通知文案多语言（zh-CN、en、ja、ko）
- [x] **独立运营后台**：用户、监控、信源与任务审计（与用户产品分离）
- [x] **Docker Compose 一键部署**：MongoDB、Redis、Qdrant、API、Worker、前端、爬虫同栈
- [x] **邮箱验证码**：注册 / 登录 / 找回密码（未配 SMTP 时验证码写日志，便于本地开发）
- [x] **异步任务流水线**：BullMQ（采集 → 向量化 → 匹配 → 通知 / 富化）

### 规划中

- [～] **社交平台原生接入**
  - [～] **X（Twitter）**：账号时间线、关键词搜索或列表页采集
  - [ ] 其他：知乎、今日头条、小红书等（按优先级逐步接入）
- [ ] **更多内置平台信源**：热点 API 模板与常用平台预置配置
- [ ] **Brief 日历窗口**：按日/周/月日历边界的研判报告（`calendar_range`）
- [ ] **实时通知**：SSE / WebSocket 替代当前轮询未读数
- [ ] **移动端原生 App（iOS / Android）**：当前版本仅提供 Web 产品，不包含移动端客户端、系统级推送或 App 版本更新检查等能力

欢迎通过 [Issue](https://github.com/lqomg/ClueArk/issues) 讨论优先级或认领任务；架构约定见 [AGENTS.md](AGENTS.md)。

## 话题监控（机制说明）

- **创建**：用户输入一句「监控意图」。后端调用 LLM 生成标题、正式说明、关键词与实体，并绑定信源；描述向量写入 **Qdrant**（Mongo 仅存元数据）。创建后异步计算首份快照（`snapshotStatus: computing` → `ready`）。
- **语义时间线**：经 Qdrant 检索 + `minCosine` 过滤；HTTP 读路径不做全量余弦计算。仅**至少被一个监控绑定**的信源在 ingest 后进入 embed/富化流水线。
- **情报卡片与趋势**：`GET /monitors` 列表内嵌轻量指标（优先 `monitor_snapshots`）；研判详情用 `GET /monitors/:id/intelligence`。
- **研判摘要**：经 `brief` 队列异步生成，证据来自 Qdrant 检索；结果写入 MongoDB。变量见 `MONITOR_BRIEF_*`。
- **通知**：条目命中监控后写入 `notifications`，前端 `/app/notifications` 查看。

## 多类信源支持

| 类型 | 说明 | 典型用途 |
|------|------|----------|
| **RSS / Atom** | 标准订阅地址增量拉取 | 资讯站、博客等提供 Feed 的信源 |
| **Web** | 站点 URL；可选 `crawlListUrl` + `crawlSelectors` 供爬虫解析列表页 | 仅有网页列表、需规则化抽取条目的场景 |
| **热点 API（`hot_api`）** | JSON HTTP 接口 + 可配置 mapper（如条目数组路径与字段映射） | 结构化热点/排行榜类数据源 |

内置种子见 **`data/built-in-catalog.json`**（含多条 RSS 示例）；部署时可通过 **`BUILTIN_CATALOG_PATH`** 指向自定义目录。

## 演示

- **用户产品：** [https://clueark.com](https://clueark.com) —— 普通用户可自行注册。
- **运营后台：** 私有化部署时访问 `http://<host>:8081`（Compose 默认 `ADMIN_WEB_PORT`），使用种子管理员 `ADMIN_EMAIL` / `ADMIN_PASSWORD` 登录（`POST /api/admin/auth/login`）。

## 技术栈

| 部分 | 技术 |
|------|------|
| 用户前端 | React 18、TypeScript、Vite、Tailwind CSS、Zustand、React Router |
| 运营后台 | React 18、TypeScript、Vite、Ant Design、ProComponents |
| 后端 | NestJS、MongoDB（Mongoose）、Redis/BullMQ、Qdrant、JWT、定时任务等 |
| 爬虫 | NestJS、Cheerio、可配置选择器（与主站契约对齐） |

代码目录：`frontend/`（用户产品）、`admin-web/`（运营后台）、`backend/`、`crawler/` 分别为独立子项目（根目录无统一 `package.json`）。

## 仓库结构（节选）

```
├── backend/           # 主 API 服务（NestJS）
├── crawler/           # Web 列表页爬虫服务（NestJS），详见 crawler/README.md
├── frontend/          # 用户 Web 前端（Vite + React）
├── admin-web/         # 独立运营后台（Vite + React + Ant Design）
├── data/              # 内置信源种子等（如 built-in-catalog.json）
├── docker-compose.yml # 推荐部署入口
├── .env.example       # 环境变量模板（复制为 .env）
└── LICENSE            # MIT
```

## 信源与内置目录

全站信源为统一资源池（MongoDB `sources` 集合）：官方类条目 `createdBy` 为空，用户自建条目记录创建者。

仓库中 **`data/built-in-catalog.json`**（`sources` 数组）仅作为**启动种子**，用于写入官方网站类等信源；可通过环境变量 **`BUILTIN_CATALOG_PATH`** 指向其他路径（Docker 部署下默认使用挂载到容器内的路径）。

## 环境要求

- **推荐**：Docker、Docker Compose（v2）
- **本地开发**：Node.js 20+（与仓库内各子项目一致即可）、MongoDB

## 部署（Docker Compose，推荐）

根目录 `docker-compose.yml` 为**推荐单机部署入口**：MongoDB + backend + web（用户产品）+ admin-web（运营后台）+ crawler。

### 首次启动

```bash
git clone <本仓库地址>
cd <克隆后的目录名>

cp .env.example .env
# 编辑 .env：生产环境务必设置强密码 / 密钥，至少包括：
#   MONGO_INITDB_ROOT_PASSWORD、JWT_SECRET、ADMIN_PASSWORD
#   CRAWLER_INGEST_SECRET、CRAWLER_SECRET（与爬虫通信相关，见 .env.example 说明）

docker compose up -d --build
```

### 访问地址

- **用户 Web**：`http://<服务器IP或域名>:<端口>`
  - 若已按 `.env.example` 复制并保留 `WEB_PORT=8080`，则一般为 **`http://<host>:8080`**。
  - 若未提供 `.env` 或未设置 `WEB_PORT`，Compose 默认将容器 80 映射到宿主机 **`80`**（即 `http://<host>/`）。
- **运营后台**：默认 **`http://<host>:8081`**（`ADMIN_WEB_PORT`）；使用管理员账号登录。
- **HTTP API**：通过前端的 **`/api`** 路径由 Nginx 反代到后端，**不单独对外暴露** backend 端口。

### 网络与安全说明

- `backend`、`crawler` 在默认 Compose 下**不对外映射端口**，仅在容器网络内互通。
- MongoDB 会映射到宿主机 **`MONGO_BIND_PORT`（默认 27017）**。若主机暴露在公网，请在防火墙 / 安全组中限制来源 IP；**不建议将数据库端口无防护对外开放**。

### 爬虫服务

默认随 `docker compose up` **一并构建并启动**，按主站配置拉取 Web 信源并上报。手动运行、API 与定时逻辑详见 **[crawler/README.md](crawler/README.md)**。

若仅需主站与数据库、暂时不要爬虫，可在 Compose 中按需调整服务（例如移除或停用 `crawler` 服务），具体以你的运维策略为准。

## 环境变量说明（摘要）

完整键名与注释见 **`/.env.example`**；后端、爬虫另有 **`backend/.env.example`**、**`crawler/.env.example`** 供本地开发参考。

| 类别 | 说明 |
|------|------|
| 必改（生产） | Mongo root 密码、`JWT_SECRET`、`ADMIN_PASSWORD`、爬虫相关 `CRAWLER_INGEST_SECRET` / `CRAWLER_SECRET` 等 |
| 可选 | DeepSeek、Embedding、RSS/热点等开关与密钥（见各 `.env.example`） |
| 话题监控与研判 | `MONITOR_*`、`MONITOR_BRIEF_*`（见 `backend/.env.example` 注释） |

## 本地开发（简要）

各子项目独立安装依赖与启动，需自备 MongoDB 并配置连接信息。

```bash
# 后端（示例）
cd backend
cp .env.example .env   # 按本地修改
npm install
npm run start:dev

# 前端（示例）
cd frontend
npm install
npm run dev

# 爬虫（示例）
cd crawler
cp .env.example .env
npm install
npm run start:dev
```

本地联调时 API 地址、代理等请与各自 `vite` / Nest 配置及环境变量保持一致。

## 合规与安全

使用本软件抓取或访问第三方网站时，请遵守当地法律法规及目标站点的服务条款、robots 协议与合理使用范围。禁止用于未授权的批量爬取或侵犯他人权益的行为；**使用者自行承担合规责任**。

若在部署中发现安全问题（例如默认密钥、暴露面配置），建议优先通过私有渠道联系维护者；也欢迎在修复后通过 Issue / PR 协助改进文档与默认配置。

## 开源协议

本项目基于 **[MIT License](LICENSE)** 开源。

## 贡献

欢迎通过 Issue 讨论与 Pull Request 提交改进。提交信息建议简洁说明改动意图；内部协作可使用项目约定的 commit 类型（如 `fix`、`feature` 等）。
