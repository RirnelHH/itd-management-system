#!/bin/bash
# =====================================================
# ITD 管理系统 - Docker 部署脚本
# =====================================================

set -e

echo "=========================================="
echo "ITD 管理系统 - Docker 部署"
echo "=========================================="

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "错误: Docker 未安装"
    exit 1
fi

if ! command -v docker compose &> /dev/null && ! command -v docker-compose &> /dev/null; then
    echo "错误: Docker Compose 未安装"
    exit 1
fi

# 使用 docker compose 或 docker-compose
DOCKER_COMPOSE="docker compose"
if ! docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
fi

echo "[1/4] 停止旧容器..."
$DOCKER_COMPOSE down 2>/dev/null || true

echo "[2/4] 清理旧构建..."
docker builder prune -f 2>/dev/null || true

echo "[3/4] 构建并启动容器..."
$DOCKER_COMPOSE up -d --build

echo "[4/4] 检查服务状态..."
sleep 5
$DOCKER_COMPOSE ps

echo ""
echo "=========================================="
echo "部署完成!"
echo "=========================================="
echo ""
echo "服务地址:"
echo "  前端: http://localhost:8080"
echo "  后端: http://localhost:3000"
echo "  API文档: http://localhost:3000/api/docs"
echo ""
echo "查看日志:"
echo "  $DOCKER_COMPOSE logs -f"
