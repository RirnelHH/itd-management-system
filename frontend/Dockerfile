# IT&D Management System - Frontend Dockerfile
# 多阶段构建：Node 构建 + Nginx 运行

# ============ 构建阶段 ============
FROM node:20-bullseye AS builder

WORKDIR /app

# 先复制 package 文件以利用 Docker 缓存
COPY package*.json ./
RUN npm install

# 复制源代码
COPY . .

# 设置 API 地址环境变量（构建时注入）
ARG VITE_API_BASE_URL=http://localhost:3000/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# 构建生产版本
RUN npm run build

# ============ 运行阶段 ============
FROM nginx:alpine AS runner

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 从构建阶段复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制健康检查脚本
COPY healthcheck.sh /usr/local/bin/

RUN chmod +x /usr/local/bin/healthcheck.sh

EXPOSE 80

CMD ["sh", "-c", "nginx -g 'daemon off;'"]
