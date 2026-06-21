FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci && npm cache clean --force

COPY . .

ARG VITE_API_BASE=/api
ARG VITE_APP_ENV=production
ARG VITE_GOOGLE_CLIENT_ID=
ENV VITE_API_BASE=${VITE_API_BASE}
ENV VITE_APP_ENV=${VITE_APP_ENV}
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}

RUN npm run build

FROM nginx:1.27-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
