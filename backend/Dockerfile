# 使用Node.js 22 LTS作为基础镜像
FROM node:22-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装所有依赖（包括devDependencies，用于构建）
RUN npm ci && npm cache clean --force

# 复制源代码
COPY . .

# nest build 易触发 V8 默认堆上限 OOM（约 2GB）；3.6G 机器用 3072 较稳妥
ENV NODE_OPTIONS="--max-old-space-size=3072"
RUN npm run build

# 生产环境镜像
FROM node:22-alpine

# 安装 dumb-init 和 wget（用于健康检查）
RUN apk add --no-cache dumb-init wget

# 设置工作目录
WORKDIR /app

# 复制依赖和构建产物
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# 以root用户运行（允许访问任何目录）
USER root

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api/health/ready || exit 1

# 使用dumb-init启动应用
CMD ["dumb-init", "node", "dist/main"]
