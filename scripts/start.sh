#!/bin/bash
# =====================================================
# IT&D Management System - 启动脚本
# =====================================================

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 获取脚本所在目录（兼容 macOS 和 Linux）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   IT&D 管理系统 - 启动服务${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 读取 .env 文件（从项目根目录）
if [ -f ".env" ]; then
    echo -e "${YELLOW}加载环境变量配置...${NC}"
    set -a
    source .env
    set +a
elif [ -f "backend/.env" ]; then
    echo -e "${YELLOW}加载环境变量配置 (backend/.env)...${NC}"
    set -a
    source backend/.env
    set +a
else
    echo -e "${RED}警告: .env 文件不存在，使用默认配置${NC}"
fi

# 检查 Docker 是否运行
echo -e "${YELLOW}检查 Docker 状态...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}错误: Docker 未运行，请先启动 Docker Desktop${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker 运行中${NC}"

# 检查端口占用（兼容 macOS 和 Linux）
check_port() {
    local port=$1
    local description=${2:-""}
    
    # 尝试多种命令（macOS 和 Linux）
    if command -v lsof > /dev/null 2>&1; then
        if lsof -i:$port > /dev/null 2>&1; then
            echo -e "${RED}错误: 端口 $port ($description) 已被占用${NC}"
            lsof -i:$port | head -3
            return 1
        fi
    elif command -v netstat > /dev/null 2>&1; then
        if netstat -an 2>/dev/null | grep -q ":$port " ; then
            echo -e "${RED}错误: 端口 $port ($description) 已被占用${NC}"
            return 1
        fi
    elif command -v ss > /dev/null 2>&1; then
        if ss -ltn 2>/dev/null | grep -q ":$port "; then
            echo -e "${RED}错误: 端口 $port ($description) 已被占用${NC}"
            return 1
        fi
    fi
    # 如果所有命令都不可用，跳过检查
    return 0
}

echo -e "${YELLOW}检查端口占用...${NC}"
check_port ${MYSQL_PORT:-3306} "MySQL" || true
check_port ${BACKEND_PORT:-3000} "后端" || true
check_port ${FRONTEND_PORT:-8080} "前端" || true

# 检查 docker-compose 是否可用
DOCKER_COMPOSE_CMD="docker compose"
if ! docker compose version > /dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker-compose"
    if ! docker-compose --version > /dev/null 2>&1; then
        echo -e "${RED}错误: Docker Compose 不可用${NC}"
        exit 1
    fi
fi

# 启动服务
echo -e "${YELLOW}启动 Docker 服务...${NC}"
$DOCKER_COMPOSE_CMD up -d --build

# 等待容器启动
echo -e "${YELLOW}等待服务启动 (30秒)...${NC}"
sleep 30

# 检查容器状态
echo ""
echo -e "${GREEN}容器状态:${NC}"
$DOCKER_COMPOSE_CMD ps

# 显示访问信息
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   服务已启动！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "访问地址:"
echo -e "  前端: http://localhost:${FRONTEND_PORT:-8080}"
echo -e "  后端: http://localhost:${BACKEND_PORT:-3000}"
echo -e "  API文档: http://localhost:${BACKEND_PORT:-3000}/api/docs"
echo ""
echo -e "初始账号:"
echo -e "  用户名: admin"
echo -e "  密码: admin123"
echo ""
echo -e "常用命令:"
echo -e "  查看日志: $DOCKER_COMPOSE_CMD logs -f"
echo -e "  停止服务: ./scripts/stop.sh"
echo ""
