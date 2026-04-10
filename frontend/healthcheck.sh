#!/bin/sh
# 健康检查脚本

# 检查 nginx 进程
pgrep nginx > /dev/null
if [ $? -ne 0 ]; then
    echo "nginx is not running"
    exit 1
fi

# 检查前端页面是否可访问
curl -sf http://localhost/health > /dev/null
if [ $? -ne 0 ]; then
    echo "health check failed"
    exit 1
fi

echo "OK"
exit 0
