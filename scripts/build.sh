#!/bin/bash
# =====================================================
# ITD 管理系统 - 自动化构建部署脚本
# =====================================================

set -e

echo "=========================================="
echo "ITD 管理系统 - 构建部署"
echo "=========================================="

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo -e "${YELLOW}[1/6]${NC} 检查环境..."
cd "$PROJECT_DIR"

# 检查 .env 文件（多个可能的位置）
ENV_FILE=""
if [ -f ".env" ]; then
    ENV_FILE=".env"
elif [ -f "backend/.env" ]; then
    ENV_FILE="backend/.env"
elif [ -f "$BACKEND_DIR/.env" ]; then
    ENV_FILE="$BACKEND_DIR/.env"
fi

if [ -n "$ENV_FILE" ]; then
    echo -e "${YELLOW}加载环境变量配置 ($ENV_FILE)...${NC}"
    set -a
    source "$ENV_FILE"
    set +a
else
    echo -e "${RED}错误: .env 文件不存在${NC}"
    echo -e "${YELLOW}提示: 复制 .env.example 为 .env 并配置数据库${NC}"
    exit 1
fi

echo -e "${YELLOW}[2/6]${NC} 清理旧构建..."
rm -rf "$BACKEND_DIR/dist" 2>/dev/null || true
rm -rf "$FRONTEND_DIR/dist" 2>/dev/null || true
rm -rf "$BACKEND_DIR/node_modules/.cache" 2>/dev/null || true

echo -e "${YELLOW}[3/6]${NC} 构建后端..."
cd "$BACKEND_DIR"
npm run build
echo -e "${GREEN}后端构建完成${NC}"

echo -e "${YELLOW}[4/6]${NC} 构建前端..."
cd "$FRONTEND_DIR"
npm run build
echo -e "${GREEN}前端构建完成${NC}"

echo -e "${YELLOW}[5/6]${NC} 数据库初始化..."
cd "$BACKEND_DIR"

# 检查数据库连接
if [[ "$DATABASE_URL" =~ mysql:// ]]; then
    echo "使用 MySQL 数据库"
    
    # 提取数据库信息
    DB_USER=$(echo "$DATABASE_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')
    DB_PASS=$(echo "$DATABASE_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
    DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
    DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
    DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/||p')
    
    # 尝试连接 MySQL（不指定数据库）
    if mysql -u"$DB_USER" -p"$DB_PASS" -h"${DB_HOST:-localhost}" -P"${DB_PORT:-3306}" -e "SELECT 1" > /dev/null 2>&1; then
        echo "MySQL 连接成功"
        
        # 创建数据库（如果不存在）
        mysql -u"$DB_USER" -p"$DB_PASS" -h"${DB_HOST:-localhost}" -P"${DB_PORT:-3306}" -e "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null || true
        
        # 运行 Prisma 迁移
        npx prisma migrate deploy || npx prisma db push
        echo -e "${GREEN}MySQL 数据库初始化完成${NC}"
    else
        echo -e "${YELLOW}警告: MySQL 连接失败，跳过数据库初始化${NC}"
        echo -e "${YELLOW}提示: 确保 MySQL 服务正在运行，然后手动运行: cd backend && npx prisma db push${NC}"
    fi
    
elif [[ "$DATABASE_URL" =~ sqlite:// ]]; then
    echo "使用 SQLite 数据库"
    npx prisma db push
    echo -e "${GREEN}SQLite 数据库就绪${NC}"
fi

# 生成 Prisma Client
npx prisma generate
echo -e "${GREEN}Prisma Client 生成完成${NC}"

echo -e "${YELLOW}[6/6]${NC} 构建完成!"
echo ""
echo "=========================================="
echo -e "${GREEN}构建成功！${NC}"
echo "=========================================="
echo ""
echo "下一步："
echo "  启动服务: cd $PROJECT_DIR && docker compose up -d"
echo "  或手动启动:"
echo "    后端: cd $BACKEND_DIR && npm run start:prod"
echo "    前端: cd $FRONTEND_DIR && npm run preview"
