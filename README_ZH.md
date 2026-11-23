<div align="center">
  <img src="./assets/clueark-icon.svg" width="96" height="96" alt="ClueArk Logo" />

  <h1>ClueArk 观枢</h1>

  <p>
    <a href="./README_ZH.md">简体中文</a> |
    <a href="./README.md">English</a>
  </p>

  <p>
    <strong>面向个人与团队的 AI 情报工作台</strong>
  </p>

  <p>
    围绕「专题」组织信息：一句话描述意图，后端用 LLM 扩写说明并绑定公开信源；Embedding 驱动语义时间线、匹配通知与定时研判摘要。统一接入 RSS/Atom、网页列表爬虫与 JSON 热点 API。可用 Docker Compose 私有化部署。
  </p>
</div>

开源地址：[https://github.com/lqomg/ClueArk](https://github.com/lqomg/ClueArk)

演示地址：[https://clueark.com](https://clueark.com)

> 技术栈：React + TypeScript + NestJS + MongoDB + Redis + Qdrant + Docker。偏前端视角的全栈实践参考。

<p align="center">
  <img width="960" alt="观枢官网：创建专题与活专题进展" src="./assets/home-zh.png" />
</p>

<p align="center">
  <img width="960" alt="观枢产品宣传：专题 · 进展 · 提醒" src="./assets/promo-social-zh.png" />
</p>

## 功能特性

- **统一信源模型**：内置与用户自建共用类型与指纹策略。
- **AI 专题**：一句话创建 → LLM 说明 / 关键词 / 实体与绑源；设置里可调信源与 `minCosine`。
- **多类采集**：RSS/Atom、Web（Cheerio 列表爬虫）、JSON 热点 API（`hot_api`）。
- **独立爬虫服务**：与主站契约对齐上报；爬虫侧不依赖 LLM。见 [`crawler/README.md`](crawler/README.md)。
- **Embeddings + Qdrant**：语义时间线与聚类；向量不进 Mongo。
- **异步流水线**：BullMQ worker — 采集 → 向量化 → 匹配 → 站内通知 / 富化 / 快照 / Brief。
- **监控快照读模型**：列表与总览读 `monitor_snapshots`。
- **Compose 单机栈**：MongoDB、Redis、Qdrant、API、Worker、用户前端、运营后台、爬虫。

## 路线图

> `[x]` 已实现 · `[ ]` 规划中 · `[~]` 部分完成

### 已实现

- [x] AI 专题（创建、绑源、语义时间线；产品路径 `/app/topics`）
- [x] RSS / Web 爬虫 / `hot_api` + 内置信源目录
- [x] Embeddings + Qdrant 匹配与聚类
- [x] LLM 富化、站内匹配通知、滚动 Brief
- [x] `monitor_snapshots`、用户时区、i18n（zh-CN / en / ja / ko）
- [x] 独立运营后台 + Compose 一键部署 + 邮箱验证码登录

### 规划中

- [ ] 专题进展时间线（门禁后的可核验进展，而非纯条目流）
- [ ] 对话辅助创建与调整专题
- [ ] 跨专题首页巡视（今日 / 关注 / 精选）
- [ ] 官方专题目录与订阅
- [ ] 更完整的多语言进展本地化
- [~] 社交平台原生接入（如 X）与更多内置热点源
- [ ] 实时通知（SSE / WebSocket）

欢迎通过 [Issues](https://github.com/lqomg/ClueArk/issues) 讨论优先级或认领任务。

## 专题（机制）

- **创建**：短意图 → LLM 标题 / 说明 / 关键词 / 实体 + 绑源；描述向量进 **Qdrant**。
- **时间线**：Qdrant 检索 + `minCosine`；HTTP 读路径不做全库余弦。
- **Brief**：异步 `run_brief`；证据来自 Qdrant；见 `MONITOR_BRIEF_*`。
- **通知**：命中写入 `notifications`（站内）。
- **路由**：用户产品对外使用 `/app/topics`、`/app/my-topics`；旧 `/app/monitors*` 仍兼容重定向。

## 信源类型

| 类型 | 说明 |
|------|------|
| **RSS / Atom** | 标准订阅 |
| **Web** | 可选列表 URL + CSS 选择器，由爬虫拉取 |
| **热点 API** | JSON HTTP + 字段映射 |

种子：`data/built-in-catalog.json`（`BUILTIN_CATALOG_PATH`）。

## 演示

- **用户产品：** [https://clueark.com](https://clueark.com)
- **运营后台（自托管）：** `http://<host>:8081`（`ADMIN_WEB_PORT`）；`ADMIN_EMAIL` / `ADMIN_PASSWORD`

## 技术栈

| 部分 | 技术 |
|------|------|
| 用户前端 | React 18、TypeScript、Vite、Tailwind、Zustand |
| 运营后台 | React 18、Vite、Ant Design |
| 后端 | NestJS、MongoDB、Redis/BullMQ、Qdrant |
| 爬虫 | NestJS、Cheerio |

## 仓库结构

```
├── backend/           # API + worker
├── crawler/           # Web 列表爬虫
├── frontend/          # 用户 Web
├── admin-web/         # 运营后台
├── data/              # 内置信源种子
├── docs/              # 补充说明（如有）
├── assets/            # README 图与品牌标
├── docker-compose.yml
├── .env.example
└── LICENSE            # MIT
```

## 环境要求

- **部署：** Docker Compose v2
- **本地开发：** Node 20+、MongoDB、Redis、Qdrant

### 进程启动必填（缺失则退出）

| 变量 | 用途 |
|------|------|
| `REDIS_URL` | BullMQ + worker 心跳 |
| `QDRANT_URL` | 向量库 |
| `FEED_EMBEDDING_API_KEY` | 监控 / 时间线 Embedding |
| `DEEPSEEK_API_KEY` | LLM（创建监控、富化、Brief） |

生产务必改强：`JWT_SECRET`、`MONGO_INITDB_ROOT_PASSWORD`、`ADMIN_PASSWORD`、`CRAWLER_INGEST_SECRET` / `CRAWLER_SECRET`。

## 部署（Compose）

```bash
git clone https://github.com/lqomg/ClueArk.git
cd ClueArk
cp .env.example .env
# 填上表必填项
docker compose up -d --build
```

- **用户 Web：** `WEB_PORT`（如 `8080`）；未设时可能映射宿主机 `80`
- **运营后台：** `ADMIN_WEB_PORT`（默认 `8081`）
- **API：** 经 gateway / 前端反代的 `/api`

有数据卷时**不要**随便 `docker compose down -v`。

## 本地开发

```bash
cd backend && cp .env.example .env   # 配置 Redis/Qdrant/Embedding/DeepSeek
npm install && npm run dev          # API + worker

cd frontend && npm install && npm run dev
cd admin-web && npm install && npm run dev
cd crawler && cp .env.example .env && npm install && npm run start:dev
```

## 合规

遵守法律、站点条款与 robots.txt；抓取合规责任由使用者承担。

## 许可证

**[MIT License](LICENSE)**

## 贡献

欢迎 Issue / PR。提交信息宜简洁（`fix` / `feature`）。架构约定见 [AGENTS.md](AGENTS.md)。
