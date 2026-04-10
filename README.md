# 信息技术与设计系管理系统

> IT&D Department Management System

## 📋 项目简介

面向学校信息技术与设计系的综合管理平台，提供用户管理、授课计划、排课管理、成绩管理等模块。

## 🛠 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | NestJS + Prisma + MySQL |
| 前端 | Vue 3 + Element Plus + Vite |
| 数据库 | MySQL 8.0 |
| 部署 | Docker + Docker Compose |

## 🚀 快速开始

### 方式一：Docker 部署（推荐）

```bash
# 1. 复制环境变量配置
cp .env.example .env

# 2. 启动服务
./scripts/start.sh

# 3. 停止服务
./scripts/stop.sh
```

### 方式二：手动部署

```bash
# 后端
cd backend
npm install
cp .env.example .env
npx prisma migrate deploy
npm run start:prod

# 前端
cd frontend
npm install
npm run build
# 使用 nginx 运行 dist 目录
```

## 📁 项目结构

```
itd-management-system/
├── backend/                 # NestJS 后端
│   ├── src/
│   │   ├── auth/           # 认证模块
│   │   ├── users/          # 用户模块
│   │   ├── rbac/           # 权限模块
│   │   ├── prisma/         # Prisma 服务
│   │   └── common/         # 公共模块
│   ├── prisma/
│   │   └── schema.prisma   # 数据库模型
│   └── Dockerfile
├── frontend/                # Vue 3 前端
│   ├── src/
│   │   ├── views/          # 页面
│   │   ├── layouts/        # 布局
│   │   ├── router/        # 路由
│   │   ├── stores/        # 状态管理
│   │   └── api/           # API 接口
│   ├── nginx.conf         # Nginx 配置
│   └── Dockerfile
├── scripts/                 # 部署脚本
│   ├── deploy.sh          # 自动化部署
│   ├── start.sh           # 启动服务
│   └── stop.sh            # 停止服务
├── docker-compose.yml      # Docker Compose 配置
└── .env.example           # 环境变量示例
```

## 🔐 初始账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |

> ⚠️ **首次登录后请立即修改密码**

## 🌐 访问地址

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:8080 |
| 后端 API | http://localhost:3000 |
| API 文档 | http://localhost:3000/api/docs |

## 📜 常用命令

```bash
# Docker 操作
docker compose up -d              # 启动服务
docker compose down              # 停止服务
docker compose logs -f            # 查看日志
docker compose logs -f backend   # 查看后端日志
docker compose restart            # 重启服务
docker compose build              # 重新构建镜像

# 数据库操作
docker exec -it itd-mysql mysql -uitd -pitd123 itd_management
npx prisma studio                 # 打开 Prisma 数据库管理

# 后端操作
cd backend && npm run dev        # 开发模式
npm run build                     # 构建
npm run prisma:migrate           # 数据库迁移

# 前端操作
cd frontend && npm run dev       # 开发模式
npm run build                     # 生产构建
```

## 🔧 配置说明

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| MYSQL_ROOT_PASSWORD | MySQL root 密码 | root123 |
| MYSQL_DATABASE | 数据库名 | itd_management |
| MYSQL_USER | 数据库用户 | itd |
| MYSQL_PASSWORD | 数据库密码 | itd123 |
| MYSQL_PORT | MySQL 端口 | 3306 |
| BACKEND_PORT | 后端端口 | 3000 |
| FRONTEND_PORT | 前端端口 | 8080 |
| JWT_SECRET | JWT 密钥 | (需修改) |

## 📝 开发说明

### API 接口

所有 API 接口统一前缀: `/api/v1`

#### 认证接口

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /auth/register | 用户注册 | 公开 |
| POST | /auth/login | 用户登录 | 公开 |
| GET | /auth/profile | 获取用户信息 | 需要 Token |
| PUT | /auth/password | 修改密码 | 需要 Token |

#### 用户管理

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /users | 用户列表 | ADMIN |
| GET | /users/:id | 用户详情 | ADMIN |
| PUT | /users/:id | 更新用户 | ADMIN |
| PUT | /users/:id/status | 启用/禁用 | ADMIN |
| PUT | /users/:id/password | 重置密码 | ADMIN |
| DELETE | /users/:id | 删除用户 | ADMIN |

#### 权限管理

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /rbac/permissions | 权限列表 | ADMIN |
| GET | /rbac/permissions/:type | 角色权限 | ADMIN |
| PUT | /rbac/permissions/:type | 更新权限 | ADMIN |
| GET | /rbac/menus | 菜单列表 | 需要 Token |

## 📄 许可证

MIT License
