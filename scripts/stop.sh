#!/bin/bash
# =====================================================
# IT&D Management System - 停止脚本
# =====================================================

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   IT&D 管理系统 - 停止服务${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 读取环境变量文件（如果存在）
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# 确认停止
echo -e "${YELLOW}即将停止以下服务:${NC}"
echo "  - itd-mysql (MySQL 数据库)"
echo "  - itd-backend (后端 API)"
echo "  - itd-frontend (前端 Web)"
echo ""

# 停止并删除容器
echo -e "${GREEN}停止 Docker 服务...${NC}"
docker compose down

# 清理未使用的镜像和网络
echo -e "${YELLOW}清理未使用的 Docker 资源...${NC}"
docker image prune -f > /dev/null 2>&1 || true

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   服务已停止${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "数据保留情况:"
echo -e "  ✓ MySQL 数据已保留在 docker volume 中"
echo -e "  ✓ 代码文件保持不变"
echo ""
echo -e "如需完全清除数据，请运行:"
echo -e "  docker volume rm itd-management-system_mysql_data"
echo "  rm -rf mysql_data"
echo ""
echo -e "如需重新启动，请运行:"
echo -e "  ./scripts/start.sh"
echo ""
