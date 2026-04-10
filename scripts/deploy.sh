#!/bin/bash
# =====================================================
# IT&D Management System - 自动化部署脚本
# =====================================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   IT&D 管理系统 - 自动化部署${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 显示当前版本
echo -e "${YELLOW}当前版本:${NC}"
git log --oneline -1 2>/dev/null || echo "Not a git repo"
echo ""

# 读取环境变量文件（如果存在）
if [ -f .env ]; then
    echo -e "${GREEN}加载环境变量配置...${NC}"
    export $(grep -v '^#' .env | xargs)
fi

# 步骤 1: 拉取最新代码
echo -e "${GREEN}[1/4] 拉取最新代码...${NC}"
if [ -d .git ]; then
    git pull origin main
else
    echo -e "${YELLOW}警告: 不是 Git 仓库，跳过拉取${NC}"
fi

# 步骤 2: 停止旧容器
echo -e "${GREEN}[2/4] 停止旧容器...${NC}"
docker compose down --remove-orphans 2>/dev/null || true

# 步骤 3: 构建新镜像
echo -e "${GREEN}[3/4] 构建 Docker 镜像...${NC}"
docker compose build --no-cache

# 步骤 4: 启动服务
echo -e "${GREEN}[4/4] 启动服务...${NC}"
docker compose up -d

# 等待服务启动
echo -e "${YELLOW}等待服务启动...${NC}"
sleep 10

# 健康检查
echo -e "${GREEN}执行健康检查...${NC}"

# 检查 MySQL
if docker exec itd-mysql mysqladmin ping -h localhost --silent 2>/dev/null; then
    echo -e "${GREEN}✓ MySQL 运行正常${NC}"
else
    echo -e "${RED}✗ MySQL 未运行${NC}"
fi

# 检查后端
if curl -sf http://localhost:3000/api/v1/auth/profile 2>/dev/null | grep -q "Unauthorized"; then
    echo -e "${GREEN}✓ 后端 API 运行正常${NC}"
else
    echo -e "${YELLOW}⚠ 后端 API 响应异常（可能是正常现象，如果未登录）${NC}"
fi

# 检查前端
if curl -sf http://localhost:8080 > /dev/null; then
    echo -e "${GREEN}✓ 前端运行正常${NC}"
else
    echo -e "${RED}✗ 前端未运行${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "访问地址:"
echo -e "  前端: http://localhost:${FRONTEND_PORT:-8080}"
echo -e "  后端: http://localhost:${BACKEND_PORT:-3000}"
echo -e "  API文档: http://localhost:${BACKEND_PORT:-3000}/api/docs"
echo ""
echo -e "常用命令:"
echo -e "  查看日志: docker compose logs -f"
echo -e "  停止服务: ./scripts/stop.sh"
echo -e "  重启服务: docker compose restart"
echo ""
