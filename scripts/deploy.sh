#!/bin/bash
# =====================================================
# IT&D Management System - 自动化部署脚本
# =====================================================

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

# 显示大标题
show_banner() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}   IT&D 管理系统 - 自动化部署${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 检查 Docker
check_docker() {
    echo -e "${YELLOW}[检查 1/6]${NC} 检查 Docker..."
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}✗ Docker 未运行，请先启动 Docker Desktop${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Docker 运行中${NC}"
}

# 拉取代码
pull_code() {
    echo ""
    echo -e "${YELLOW}[检查 2/6]${NC} 拉取最新代码..."
    if [ -d ".git" ]; then
        git pull origin main
        echo -e "${GREEN}✓ 代码已更新${NC}"
    else
        echo -e "${YELLOW}⚠ 非 Git 仓库，跳过拉取${NC}"
    fi
}

# 检查并创建 .env 文件
check_env() {
    echo ""
    echo -e "${YELLOW}[检查 3/6]${NC} 检查环境配置文件..."
    
    if [ -f ".env" ]; then
        echo -e "${GREEN}✓ .env 文件已存在${NC}"
    elif [ -f ".env.example" ]; then
        echo -e "${YELLOW}⚠ .env 不存在，从 .env.example 创建...${NC}"
        cp .env.example .env
        echo -e "${GREEN}✓ .env 文件已创建${NC}"
        echo -e "${YELLOW}⚠ 请编辑 .env 文件填入实际配置（如果需要）${NC}"
    else
        echo -e "${RED}✗ .env.example 文件也不存在${NC}"
        exit 1
    fi
    
    # 加载环境变量
    set -a
    source .env 2>/dev/null || true
    set +a
}

# 检查 Docker Compose 版本
check_docker_compose() {
    echo ""
    echo -e "${YELLOW}[检查 4/6]${NC} 检查 Docker Compose..."
    
    if docker compose version > /dev/null 2>&1; then
        DOCKER_COMPOSE_CMD="docker compose"
    elif docker-compose --version > /dev/null 2>&1; then
        DOCKER_COMPOSE_CMD="docker-compose"
    else
        echo -e "${RED}✗ Docker Compose 不可用${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Docker Compose 可用 ($DOCKER_COMPOSE_CMD)${NC}"
}

# 停止旧服务
stop_old_services() {
    echo ""
    echo -e "${YELLOW}[检查 5/6]${NC} 停止旧服务..."
    
    # 尝试停止（如果服务不存在也不会报错）
    $DOCKER_COMPOSE_CMD down --remove-orphans 2>/dev/null || true
    echo -e "${GREEN}✓ 旧服务已清理${NC}"
}

# 构建并启动服务
start_services() {
    echo ""
    echo -e "${YELLOW}[检查 6/6]${NC} 构建并启动服务..."
    
    echo -e "${YELLOW}正在构建 Docker 镜像（首次可能需要几分钟）...${NC}"
    $DOCKER_COMPOSE_CMD up -d --build
    
    echo -e "${GREEN}✓ 服务已启动${NC}"
}

# 等待服务启动
wait_for_services() {
    echo ""
    echo -e "${YELLOW}等待服务启动...${NC}"
    echo "（MySQL 首次启动需要较长时间初始化）"
    
    # 等待 60 秒
    for i in {1..60}; do
        sleep 1
        if [ $((i % 10)) -eq 0 ]; then
            echo -n "."
        fi
    done
    echo ""
}

# 显示状态
show_status() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}   部署完成 - 服务状态${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    
    echo -e "${GREEN}容器状态:${NC}"
    $DOCKER_COMPOSE_CMD ps
    
    echo ""
    echo -e "${GREEN}访问地址:${NC}"
    echo -e "  前端:   http://localhost:${FRONTEND_PORT:-8080}"
    echo -e "  后端:   http://localhost:${BACKEND_PORT:-3000}"
    echo -e "  API文档: http://localhost:${BACKEND_PORT:-3000}/api/docs"
    
    echo ""
    echo -e "${GREEN}初始账号:${NC}"
    echo -e "  用户名: admin"
    echo -e "  密码:   admin123"
    
    echo ""
    echo -e "${YELLOW}常用命令:${NC}"
    echo -e "  查看日志: $DOCKER_COMPOSE_CMD logs -f"
    echo -e "  查看日志: $DOCKER_COMPOSE_CMD logs -f backend"
    echo -e "  停止服务: ./scripts/stop.sh"
    echo -e "  重启服务: ./scripts/restart.sh"
    echo ""
}

# 主流程
main() {
    show_banner
    check_docker
    pull_code
    check_env
    check_docker_compose
    stop_old_services
    start_services
    wait_for_services
    show_status
}

main "$@"
