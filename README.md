# ClueArk 线索方舟

Web 版个人全网话题监控工具：输入话题或关键词，系统自动聚合多信源内容，新内容可提醒。定位极简、高效，无冗余功能。

**信源是底层资产，监控是上层能力。**

<img width="1920" height="919" alt="image" src="https://github.com/user-attachments/assets/0f705bd1-0b03-40e9-a725-ff918422c5ae" />

**演示地址：**  [http://114.132.246.171/app/feed](http://114.132.246.171/app/feed)

普通用户自行注册使用

**管理员账号：** admin@clueark.local / lin123456qian

## 功能概览

- 话题 / 关键词驱动的内容监控与浏览
- 全站统一信源资源池（MongoDB `sources`），支持官方内置条目与用户自建信源
- RSS 等拉取能力与可选 **Web 列表页爬虫**（独立服务，CSS 选择器解析，见 [`crawler/README.md`](crawler/README.md)）
- 可选 DeepSeek、Embedding 等能力（环境变量配置，详见根目录与 `backend/.env.example`）
- **Docker Compose** 一键部署：MongoDB、后端、前端（Nginx）、爬虫默认同栈启动

## 技术栈

| 部分 | 技术 |
|------|------|
| 前端 | React 18、TypeScript、Vite、Tailwind CSS、Zustand、React Router |
| 后端 | NestJS、MongoDB（Mongoose）、JWT、定时任务等 |
| 爬虫 | NestJS、Cheerio、可配置选择器（与主站契约对齐） |

代码目录：`frontend/`、`backend/`、`crawler/` 分别为独立子项目（根目录无统一 `package.json`）。

## 仓库结构（节选）

```
├── backend/           # 主 API 服务（NestJS）
├── crawler/           # Web 列表页爬虫服务（NestJS），详见 crawler/README.md
├── frontend/          # Web 前端（Vite + React）
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

根目录 `docker-compose.yml` 为**推荐单机部署入口**：MongoDB + backend + web（Nginx 托管前端并反代 API）+ crawler。

### 首次启动

```bash
git clone <本仓库地址>
cd <克隆后的目录名>

cp .env.example .env
# 编辑 .env：生产环境务必设置强密码 / 密钥，至少包括：
#   MONGO_INITDB_ROOT_PASSWORD、JWT_SECRET、ADMIN_PASSWORD
#   CRAWLER_INGEST_SECRET、CRAWLER_SECRET（与爬虫通信相关，见 .env.example 说明）

# 首次部署或需要清空数据库时（会删除 Mongo 数据卷，慎用）
docker compose down -v

docker compose up -d --build
```

### 访问地址

- **Web 界面**：`http://<服务器IP或域名>:<端口>`  
  - 若已按 `.env.example` 复制并保留 `WEB_PORT=8080`，则一般为 **`http://<host>:8080`**。  
  - 若未提供 `.env` 或未设置 `WEB_PORT`，Compose 默认将容器 80 映射到宿主机 **`80`**（即 `http://<host>/`）。
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
