#!/bin/bash
# =====================================================
# ITD 管理系统 - 自动化构建部署脚本
# =====================================================

set -e  # 遇到错误立即退出

echo "=========================================="
echo "ITD 管理系统 - 构建部署"
echo "=========================================="

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 目录配置
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo -e "${YELLOW}[1/6]${NC} 检查环境..."
cd "$PROJECT_DIR"

# 检查 .env 文件
if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo -e "${RED}错误: $BACKEND_DIR/.env 文件不存在${NC}"
    echo -e "${YELLOW}提示: 复制 .env.example 为 .env 并配置数据库${NC}"
    exit 1
fi

# 加载环境变量
source "$BACKEND_DIR/.env" 2>/dev/null || true

echo -e "${YELLOW}[2/6]${NC} 清理旧构建..."
rm -rf "$BACKEND_DIR/dist"
rm -rf "$FRONTEND_DIR/dist"
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
    
    # 检查 MySQL 服务是否运行
    if ! mysql -u debian-sys-maint -p"$(cat /etc/mysql/debian.cnf | grep password | head -1 | cut -d'=' -f2)" -e "SELECT 1" > /dev/null 2>&1; then
        echo -e "${RED}错误: MySQL 服务未运行${NC}"
        exit 1
    fi
    
    # 提取数据库信息
    DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    DB_PASS=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\///')
    
    # 创建数据库（如果不存在）
    mysql -u debian-sys-maint -p"$(cat /etc/mysql/debian.cnf | grep password | head -1 | cut -d'=' -f2)" <<EOF || true
CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EOF
    
    # 运行 Prisma 迁移
    npx prisma migrate deploy || npx prisma db push
    echo -e "${GREEN}MySQL 数据库初始化完成${NC}"
    
elif [[ "$DATABASE_URL" =~ sqlite:// ]]; then
    echo "使用 SQLite 数据库"
    # SQLite 不需要特殊初始化
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
echo "启动服务："
echo "  后端: cd $BACKEND_DIR && npm run start:prod"
echo "  前端: cd $FRONTEND_DIR && npm run preview"
echo ""
echo "Docker 部署："
echo "  docker-compose up -d --build"
