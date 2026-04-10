#!/bin/bash
# =====================================================
# IT&D Management System - 日志查看脚本
# =====================================================

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

# 确定 docker compose 命令
if docker compose version > /dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker compose"
elif docker-compose --version > /dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    echo -e "${YELLOW}错误: Docker Compose 不可用${NC}"
    exit 1
fi

# 显示用法
show_usage() {
    echo "用法: $0 [服务] [选项]"
    echo ""
    echo "服务:"
    echo "  all       查看所有服务日志 (默认)"
    echo "  backend   只看后端日志"
    echo "  frontend  只看前端日志"
    echo "  mysql     只看 MySQL 日志"
    echo ""
    echo "选项:"
    echo "  -f, --follow    实时跟踪日志 (同 tail -f)"
    echo "  --no-color     禁用颜色输出"
    echo "  -n, --lines    显示最近 N 行 (默认 100)"
    echo ""
    echo "示例:"
    echo "  $0                    # 查看所有日志"
    echo "  $0 backend            # 只看后端日志"
    echo "  $0 backend -f         # 实时跟踪后端日志"
    echo "  $0 all -n 50           # 查看最近 50 行所有日志"
}

# 默认参数
SERVICE="all"
FOLLOW=""
LINES="--tail 100"
COLOR_FLAG="--ansi always"

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        all|backend|frontend|mysql)
            SERVICE="$1"
            shift
            ;;
        -f|--follow)
            FOLLOW="-f"
            shift
            ;;
        --no-color)
            COLOR_FLAG="--no-color"
            shift
            ;;
        -n|--lines)
            LINES="--tail ${2:-100}"
            shift 2
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            echo "未知参数: $1"
            show_usage
            exit 1
            ;;
    esac
done

# 确定服务名
case $SERVICE in
    all)
        SERVICE_NAME=""
        ;;
    backend)
        SERVICE_NAME="backend"
        ;;
    frontend)
        SERVICE_NAME="frontend"
        ;;
    mysql)
        SERVICE_NAME="mysql"
        ;;
esac

echo -e "${GREEN}查看日志: ${SERVICE}${NC}"
echo ""

# 执行 docker compose logs
if [ -z "$SERVICE_NAME" ]; then
    $DOCKER_COMPOSE_CMD logs $FOLLOW $LINES $COLOR_FLAG
else
    $DOCKER_COMPOSE_CMD logs $FOLLOW $LINES $COLOR_FLAG "$SERVICE_NAME"
fi
