#!/bin/bash
# =====================================================
# IT&D Management System - 首次安装脚本
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

show_banner() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}   IT&D 管理系统 - 首次安装${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

# 检查系统要求
check_requirements() {
    echo -e "${YELLOW}[1/7]${NC} 检查系统要求..."
    
    # 检查 Docker
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}✗ Docker 未安装或未运行${NC}"
        echo "请先安装 Docker Desktop: https://docs.docker.com/desktop/"
        exit 1
    fi
    echo -e "${GREEN}✓ Docker 已安装${NC}"
    
    # 检查 Docker Compose
    if docker compose version > /dev/null 2>&1 || docker-compose --version > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Docker Compose 可用${NC}"
    else
        echo -e "${RED}✗ Docker Compose 不可用${NC}"
        exit 1
    fi
    
    # 检查 Git
    if command -v git > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Git 已安装${NC}"
    else
        echo -e "${RED}✗ Git 未安装${NC}"
        exit 1
    fi
}

# 创建 .env 文件
create_env() {
    echo ""
    echo -e "${YELLOW}[2/7]${NC} 配置环境变量..."
    
    if [ -f ".env" ]; then
        echo -e "${GREEN}✓ .env 已存在${NC}"
    else
        if [ -f ".env.example" ]; then
            cp .env.example .env
            echo -e "${GREEN}✓ .env 已创建${NC}"
            echo -e "${YELLOW}⚠ 请编辑 .env 文件修改密码等配置${NC}"
        else
            echo -e "${RED}✗ .env.example 不存在${NC}"
            exit 1
        fi
    fi
    
    # 加载环境变量
    set -a
    source .env
    set +a
}

# 构建 Docker 镜像
build_images() {
    echo ""
    echo -e "${YELLOW}[3/7]${NC} 构建 Docker 镜像..."
    echo "(首次构建需要几分钟下载依赖...)"
    
    if docker compose build; then
        echo -e "${GREEN}✓ 镜像构建成功${NC}"
    else
        echo -e "${RED}✗ 镜像构建失败${NC}"
        exit 1
    fi
}

# 创建数据库
setup_database() {
    echo ""
    echo -e "${YELLOW}[4/7]${NC} 初始化数据库..."
    
    # 启动 MySQL
    echo "启动 MySQL 服务..."
    docker compose up -d mysql
    
    # 等待 MySQL 启动
    echo "等待 MySQL 启动 (30秒)..."
    sleep 30
    
    # 检查 MySQL 是否就绪
    for i in {1..30}; do
        if docker compose exec mysql mysqladmin ping -h localhost --silent 2>/dev/null; then
            echo -e "${GREEN}✓ MySQL 已就绪${NC}"
            break
        fi
        if [ $i -eq 30 ]; then
            echo -e "${RED}✗ MySQL 启动超时${NC}"
            exit 1
        fi
        sleep 2
    done
    
    # 运行初始化 SQL
    if [ -f "backend/prisma/init.sql" ]; then
        docker compose exec -T mysql mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" < backend/prisma/init.sql 2>/dev/null || true
        echo -e "${GREEN}✓ 数据库初始化完成${NC}"
    fi
}

# 启动所有服务
start_all() {
    echo ""
    echo -e "${YELLOW}[5/7]${NC} 启动所有服务..."
    
    docker compose up -d
    echo -e "${GREEN}✓ 服务已启动${NC}"
}

# 等待服务就绪
wait_ready() {
    echo ""
    echo -e "${YELLOW}[6/7]${NC} 等待服务就绪..."
    
    echo "等待后端启动 (20秒)..."
    sleep 20
    
    # 检查后端
    for i in {1..30}; do
        if curl -s http://localhost:${BACKEND_PORT:-3000}/api/docs > /dev/null 2>&1; then
            echo -e "${GREEN}✓ 后端 API 已就绪${NC}"
            break
        fi
        if [ $i -eq 30 ]; then
            echo -e "${YELLOW}⚠ 后端 API 可能未就绪，请检查日志${NC}"
        fi
        sleep 2
    done
}

# 显示完成信息
show_complete() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}   安装完成！${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    
    echo -e "${GREEN}服务状态:${NC}"
    docker compose ps
    
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
    echo -e "${YELLOW}后续管理命令:${NC}"
    echo -e "  启动服务:   ./scripts/start.sh"
    echo -e "  停止服务:   ./scripts/stop.sh"
    echo -e "  重启服务:   ./scripts/restart.sh"
    echo -e "  查看日志:   ./scripts/logs.sh"
    echo -e "  完整部署:   ./scripts/deploy.sh"
    echo ""
}

# 主流程
main() {
    show_banner
    check_requirements
    create_env
    build_images
    setup_database
    start_all
    wait_ready
    show_complete
}

main "$@"
