#!/bin/bash
# =====================================================
# IT&D Management System - 重启脚本
# =====================================================

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   IT&D 管理系统 - 重启服务${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 确定 docker compose 命令
if docker compose version > /dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker compose"
elif docker-compose --version > /dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    echo -e "${YELLOW}错误: Docker Compose 不可用${NC}"
    exit 1
fi

# 读取环境变量
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

echo -e "${YELLOW}停止服务...${NC}"
$DOCKER_COMPOSE_CMD down

echo -e "${YELLOW}启动服务...${NC}"
$DOCKER_COMPOSE_CMD up -d

echo -e "${YELLOW}等待服务启动 (20秒)...${NC}"
sleep 20

echo ""
echo -e "${GREEN}容器状态:${NC}"
$DOCKER_COMPOSE_CMD ps

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   重启完成${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "访问地址:"
echo -e "  前端:   http://localhost:${FRONTEND_PORT:-8080}"
echo -e "  后端:   http://localhost:${BACKEND_PORT:-3000}"
echo -e "  API文档: http://localhost:${BACKEND_PORT:-3000}/api/docs"
echo ""
