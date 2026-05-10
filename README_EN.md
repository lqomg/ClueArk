<div align="center">
  <img src="./assets/apple-touch-icon.png" width="96" height="96" alt="ClueArk Logo" />

  <h1>ClueArk</h1>

  <p>
    <a href="./README.md">简体中文</a> |
    <a href="./README_EN.md">English</a>
  </p>

  <p>
    <strong>An AI-powered intelligence aggregation platform for individuals and teams.</strong>
  </p>

  <p>
    ClueArk organizes information around <strong>topic monitoring</strong>, continuously ingesting public sources such as RSS feeds, web crawling, and hot-topic APIs. It combines optional LLM enrichment, embedding-based semantic matching, and clustering of similar stories so users can surface actionable signals in noisy streams. The project is a lightweight, self-hostable information workspace suited to industry research, technology trend tracking, public-event observation, and personal knowledge intake.
  </p>
</div>

Repository: [https://github.com/lqomg/ClueArk](https://github.com/lqomg/ClueArk)

Demo: [https://clueark.com](https://clueark.com)

> Built with React + TypeScript + NestJS + MongoDB + Docker, ClueArk is a full-stack reference with a frontend-oriented perspective, and can serve as a practical starting point for frontend developers learning full-stack delivery.

<img width="1920" height="919" alt="ClueArk preview" src="/assets/demo.png" />

## Features

- **Unified source model**: Official built-in entries and user-created sources share the same types and fingerprinting strategy for easier extension and operations.
- **Custom monitoring topics**: Create personal monitors from keywords or topics; filter and browse aggregated content on top of the shared source pool, with support for new-item alerts.
- **Multiple ingestion paths**: One pool supports **RSS/Atom**, **Web (optional list-page crawling)**, and **JSON hot-topic APIs (configurable field mapping)**—pick what fits instead of a single crawl mode.
- **Standalone web crawler service**: For sites without a stable feed, list pages are parsed with **CSS selectors** (NestJS + Cheerio) and reported to the main app with a **contract-aligned** payload; the crawler does not depend on an LLM. See [`crawler/README.md`](crawler/README.md).
- **Optional intelligence**: Wire in DeepSeek, embeddings, and related features via environment variables (root `.env.example` and `backend/.env.example`).
- **Docker Compose single-node stack**: MongoDB, backend API, frontend (Nginx reverse proxy), and crawler are built and started together by default for quick deployment.

## Source types

| Type | Description | Typical use |
|------|-------------|-------------|
| **RSS / Atom** | Incremental fetch from standard feed URLs | News sites, blogs, and other sources that publish feeds |
| **Web** | Site URL; optional `crawlListUrl` + `crawlSelectors` for the crawler to parse list pages | Pages with HTML lists only, where rule-based extraction is enough |
| **Hot API (`hot_api`)** | JSON over HTTP + configurable mapper (e.g. array path and field mapping) | Structured hot lists and leaderboard-style APIs |

Built-in seeds live in **`data/built-in-catalog.json`** (includes RSS examples). Set **`BUILTIN_CATALOG_PATH`** to point at a custom catalog at deploy time.

## Demo

- **URL:** [https://clueark.com](https://clueark.com) — anyone can register as a normal user.
- **Demo account:** `show@clueark.com` / `123456qian`

## At a glance

Personal intelligence collection and reading: topic subscriptions, a unified source pool, and alerts—less manual searching across the web.

- Topic- and keyword-driven monitoring and browsing
- Site-wide unified source pool (MongoDB `sources`): built-in official entries plus user-created sources
- RSS ingestion, web list crawling (standalone service, selector-based parsing), optional hot JSON pipelines
- **Docker Compose** one-command deploy: MongoDB, backend, frontend (Nginx), and crawler start together by default

## Tech stack

| Area | Stack |
|------|-------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Zustand, React Router |
| Backend | NestJS, MongoDB (Mongoose), JWT, scheduled tasks |
| Crawler | NestJS, Cheerio, configurable selectors (contract-aligned with the main app) |

`frontend/`, `backend/`, and `crawler/` are independent subprojects. There is no unified root `package.json`.

## Repository layout (excerpt)

```
├── backend/           # Main API (NestJS)
├── crawler/           # Web list crawler (NestJS); see crawler/README.md
├── frontend/          # Web app (Vite + React)
├── data/              # Built-in source seeds (e.g. built-in-catalog.json)
├── docker-compose.yml # Recommended deploy entry
├── .env.example       # Env template (copy to .env)
└── LICENSE            # MIT
```

## Sources and built-in catalog

All sources share one pool (MongoDB `sources` collection): official-style rows have empty `createdBy`; user-created rows record the creator.

The repo’s **`data/built-in-catalog.json`** (`sources` array) is only a **bootstrap seed** for writing official-site-style sources. Override the path with **`BUILTIN_CATALOG_PATH`** (in Docker, this is typically a path mounted into the container).

## Requirements

- **Recommended:** Docker, Docker Compose (v2)
- **Local development:** Node.js 20+ (aligned with subprojects), MongoDB

## Deployment (Docker Compose, recommended)

Root `docker-compose.yml` is the **recommended single-machine entry**: MongoDB + backend + web (Nginx serves the frontend and proxies the API) + crawler.

### First start

```bash
git clone <repository-url>
cd <cloned-directory>

cp .env.example .env
# Edit .env: use strong passwords/secrets in production, including at least:
#   MONGO_INITDB_ROOT_PASSWORD, JWT_SECRET, ADMIN_PASSWORD
#   CRAWLER_INGEST_SECRET, CRAWLER_SECRET (crawler ↔ backend; see .env.example)

docker compose up -d --build
```

### Access

- **Web UI:** `http://<server-ip-or-domain>:<port>`
  - If you copied `.env.example` and keep `WEB_PORT=8080`, this is usually **`http://<host>:8080`**.
  - If there is no `.env` or `WEB_PORT`, Compose maps container port 80 to host **`80`** by default (`http://<host>/`).
- **HTTP API:** Nginx on the frontend proxies **`/api`** to the backend; the backend port is **not** exposed separately.

### Network and security

- Under default Compose, **`backend`** and **`crawler`** do **not** publish host ports; they talk on the internal network.
- MongoDB is published on **`MONGO_BIND_PORT`** (default **27017**). If the host is on the public internet, restrict source IPs in firewall/security groups; **avoid exposing the database port without protection**.

### Crawler service

It is **built and started by default** with `docker compose up`, fetching configured web sources and reporting to the main app. For manual runs, APIs, and schedules, see **[crawler/README.md](crawler/README.md)**.

If you only need the main app and database for now, adjust Compose (e.g. remove or disable the `crawler` service) according to your ops policy.

## Environment variables (summary)

Full keys and comments are in **`/.env.example`**; **`backend/.env.example`** and **`crawler/.env.example`** support local development.

| Category | Description |
|----------|-------------|
| Must change (production) | Mongo root password, `JWT_SECRET`, `ADMIN_PASSWORD`, crawler secrets such as `CRAWLER_INGEST_SECRET` / `CRAWLER_SECRET` |
| Optional | DeepSeek, embedding, RSS/hot API toggles and keys (see each `.env.example`) |

## Local development

Each subproject installs and runs on its own. Provide MongoDB and connection settings.

```bash
# Backend (example)
cd backend
cp .env.example .env   # adjust for your machine
npm install
npm run start:dev

# Frontend (example)
cd frontend
npm install
npm run dev

# Crawler (example)
cd crawler
cp .env.example .env
npm install
npm run start:dev
```

For local integration, keep API URLs, proxies, and env vars consistent with Vite / Nest configs.

## Compliance and security

When using this software to crawl or access third-party sites, comply with applicable laws, each site’s terms, `robots.txt`, and reasonable use. Do not use it for unauthorized bulk crawling or rights violations; **you are responsible for compliance**.

If you find security issues in deployment (default secrets, exposure, etc.), contact maintainers privately when appropriate; fixes and documentation/PRs are welcome.

## License

This project is open source under the **[MIT License](LICENSE)**.

## Contributing

Issues and pull requests are welcome. Keep commit messages concise; internal workflows may use types such as `fix` and `feature`.
