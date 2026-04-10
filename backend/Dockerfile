# IT&D Management System - Backend Dockerfile
# 多阶段构建：构建阶段 + 运行阶段

# ============ 构建阶段 ============
FROM node:20-slim AS builder

WORKDIR /app

# 安装构建所需的基础工具和 OpenSSL（Prisma 需要）
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    libssl-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 安装依赖
COPY package*.json ./
RUN npm install

# 复制源代码
COPY . .

# 生成 Prisma Client
RUN npx prisma generate

# 构建应用
RUN npm run build

# ============ 运行阶段 ============
FROM node:20-slim AS runner

WORKDIR /app

# 安装运行所需的基础工具
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# 创建非 root 用户
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# 安装生产依赖（仅运行时需要）
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# 从构建阶段复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma

# 设置用户
USER appuser

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
