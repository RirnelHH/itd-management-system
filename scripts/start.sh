#!/bin/bash
# =====================================================
# IT&D Management System - 启动脚本
# =====================================================

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   IT&D 管理系统 - 启动服务${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 读取环境变量文件（如果存在）
if [ -f .env ]; then
    echo -e "${YELLOW}加载环境变量配置...${NC}"
    export $(grep -v '^#' .env | xargs)
fi

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo -e "\033[0;31m错误: Docker 未运行，请先启动 Docker${NC}"
    exit 1
fi

# 检查端口占用
check_port() {
    local port=$1
    if lsof -i:$port > /dev/null 2>&1; then
        echo -e "\033[0;31m错误: 端口 $port 已被占用${NC}"
        return 1
    fi
    return 0
}

echo -e "${YELLOW}检查端口占用...${NC}"
check_port ${MYSQL_PORT:-3306} || exit 1
check_port ${BACKEND_PORT:-3000} || exit 1
check_port ${FRONTEND_PORT:-8080} || exit 1

# 创建必要的数据目录
echo -e "${YELLOW}创建数据目录...${NC}"
mkdir -p mysql_data 2>/dev/null || true

# 启动服务
echo -e "${GREEN}启动 Docker 服务...${NC}"
docker compose up -d

# 等待容器启动
echo -e "${YELLOW}等待服务启动 (15秒)...${NC}"
sleep 15

# 显示容器状态
echo ""
echo -e "${GREEN}容器状态:${NC}"
docker compose ps

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
echo -e "  查看日志: docker compose logs -f"
echo -e "  停止服务: ./scripts/stop.sh"
echo ""
