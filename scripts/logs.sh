#!/bin/bash
# =====================================================
# IT&D Management System - 日志查看脚本
# =====================================================

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
    echo "错误: Docker Compose 不可用"
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
    echo "  -f        实时跟踪日志 (同 tail -f)"
    echo "  -n N      显示最近 N 行 (默认 100)"
    echo ""
    echo "示例:"
    echo "  $0                # 查看所有日志"
    echo "  $0 backend        # 只看后端日志"
    echo "  $0 backend -f     # 实时跟踪后端日志"
    echo "  $0 -n 50          # 查看最近 50 行"
}

# 默认参数
SERVICE=""
TAIL_FLAGS="--tail 100"

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        all)
            SERVICE=""
            shift
            ;;
        backend|frontend|mysql)
            SERVICE="$1"
            shift
            ;;
        -f)
            TAIL_FLAGS="-f --tail 200"
            shift
            ;;
        -n)
            TAIL_FLAGS="--tail ${2:-100}"
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

# 执行 docker compose logs
if [ -z "$SERVICE" ]; then
    $DOCKER_COMPOSE_CMD logs $TAIL_FLAGS
else
    $DOCKER_COMPOSE_CMD logs $TAIL_FLAGS "$SERVICE"
fi
