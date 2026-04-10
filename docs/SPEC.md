# IT&D 管理系统 - 系统规格文档

**项目名称**: 信息技术与设计系管理系统
**版本**: v1.0.0
**更新日期**: 2026-04-10
**技术栈**: NestJS + Prisma + MySQL + Vue 3 + Element Plus + Docker

---

## 目录

1. [项目概述](#1-项目概述)
2. [系统架构](#2-系统架构)
3. [模块列表](#3-模块列表)
4. [数据模型](#4-数据模型)
5. [API 规范](#5-api-规范)
6. [部署架构](#6-部署架构)

---

## 1. 项目概述

### 1.1 项目背景

信息技术与设计系管理系统，用于系部日常教学管理工作，包括用户管理、授课计划、排课管理、成绩管理等模块。

### 1.2 系统目标

- 提供完整的账号体系和权限管理
- 实现教学计划的电子化管理
- 支持排课、成绩、请假、签到等业务流程
- 提供数据统计和报表功能

---

## 2. 系统架构

### 2.1 技术架构

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   前端 Vue3  │────▶│  NestJS API │────▶│   MySQL 8   │
│ Element Plus │     │   Backend   │     │  Database   │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │
      │              Express.js            Prisma ORM
      │               JWT Auth
      ▼
   nginx 反向代理
```

### 2.2 目录结构

```
itd-management-system/
├── backend/                 # 后端 NestJS 应用
│   ├── src/
│   │   ├── auth/           # 认证模块
│   │   ├── users/          # 用户管理模块
│   │   ├── common/         # 公共模块
│   │   └── prisma/         # Prisma ORM
│   ├── prisma/
│   │   ├── migrations/     # 数据库迁移
│   │   └── schema.prisma   # 数据模型
│   └── Dockerfile
│
├── frontend/               # 前端 Vue3 应用
│   ├── src/
│   │   ├── views/          # 页面组件
│   │   ├── layouts/        # 布局组件
│   │   ├── stores/         # Pinia 状态管理
│   │   └── styles/         # 样式文件
│   └── Dockerfile
│
├── docs/                   # 项目文档
│   └── openspec/          # OpenSpec 变更记录
│
├── scripts/               # 部署脚本
├── docker-compose.yml     # Docker 编排配置
└── README.md
```

---

## 3. 模块列表

### 3.1 已完成模块

| 模块 | 路径 | 说明 | 状态 |
|------|------|------|------|
| 用户认证 | /auth | 登录、注册、Token | ✅ |
| 用户管理 | /users | 用户列表、审批、创建 | ✅ |
| 账号体系 | - | 角色、权限、状态 | ✅ |

### 3.2 待开发模块

| 模块 | 说明 | 优先级 |
|------|------|--------|
| 学生管理 | 学生信息 CRUD | P1 |
| 教师管理 | 教师信息 CRUD | P1 |
| 授课计划 | Excel 导入、审核 | P1 |
| 排课管理 | 排课算法、冲突检测 | P1 |
| 成绩管理 | 成绩录入、统计 | P2 |
| 请假管理 | 请假申请、审批 | P2 |
| 签到管理 | 签到打卡、统计 | P2 |
| 课时统计 | 教师课时汇总 | P2 |
| 系统设置 | 权限配置、系统参数 | P3 |

### 3.3 账号类型

| 类型 | 说明 | 可自主注册 |
|------|------|-----------|
| ADMIN | 系统管理员 | ❌ 需手动创建 |
| DIRECTOR | 主任 | ❌ 需手动创建 |
| VICE_DIRECTOR | 副主任 | ❌ 需手动创建 |
| GROUP_LEADER | 教研组长 | ❌ 需手动创建 |
| TEACHER | 教师 | ✅ 注册后需审批 |
| STUDENT | 学生 | ✅ 注册后需审批 |
| STUDENT_STAFF | 学生管理干事 | ✅ 注册后需审批 |

### 3.4 账号状态

| 状态 | 说明 |
|------|------|
| PENDING_APPROVAL | 待审批 - 注册后初始状态，需管理员审批 |
| ACTIVE | 正常 - 可以登录使用 |
| DISABLED | 禁用 - 不能登录 |

---

## 4. 数据模型

### 4.1 核心实体

```
User (用户)
├── id: 主键
├── username: 用户名 (唯一)
├── name: 姓名
├── email: 邮箱 (唯一)
├── phone: 手机号
└── createdAt/updatedAt

Account (账号)
├── id: 主键
├── userId: 用户 ID (外键 → User)
├── password: 密码 (bcrypt 加密)
├── accountType: 账号类型
├── status: 账号状态
└── createdAt/updatedAt

Permission (权限)
├── id: 主键
├── code: 权限码 (唯一)
├── name: 权限名称
├── module: 所属模块
└── createdAt

RolePermission (角色权限)
├── id: 主键
├── accountType: 账号类型
├── permissionId: 权限 ID (外键 → Permission)
└── createdAt
```

### 4.2 ER 关系

```
User 1:1 Account
Permission 1:N RolePermission
```

---

## 5. API 规范

### 5.1 认证模块 (/auth)

| 方法 | 端点 | 说明 | 认证 |
|------|------|------|------|
| POST | /auth/login | 用户登录 | ❌ |
| POST | /auth/register | 用户注册 | ❌ |
| GET | /auth/register-options | 获取注册身份选项 | ❌ |
| GET | /auth/profile | 获取当前用户信息 | ✅ |
| PUT | /auth/password | 修改密码 | ✅ |

### 5.2 用户管理模块 (/users)

| 方法 | 端点 | 说明 | 认证 |
|------|------|------|------|
| GET | /users | 获取用户列表 | ADMIN |
| GET | /users/:id | 获取用户详情 | ADMIN |
| POST | /users | 管理员创建用户 | ADMIN |
| PUT | /users/:id | 更新用户信息 | ADMIN |
| PUT | /users/:id/approve | 审批账号通过 | ADMIN |
| PUT | /users/:id/status | 启用/禁用账号 | ADMIN |
| PUT | /users/:id/password | 管理员重置密码 | ADMIN |
| DELETE | /users/:id | 删除用户 | ADMIN |

### 5.3 API 统一规范

**请求格式**:
```json
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
```

**响应格式**:
```json
// 成功
{
  "message": "操作成功",
  "data": { ... }
}

// 分页列表
{
  "list": [...],
  "total": 100,
  "page": 1,
  "pageSize": 10,
  "totalPages": 10
}

// 错误
{
  "statusCode": 400,
  "message": "错误描述",
  "error": "Bad Request"
}
```

**认证方式**: JWT Bearer Token

---

## 6. 部署架构

### 6.1 Docker 容器

| 容器名 | 服务 | 端口 | 说明 |
|--------|------|------|------|
| itd-mysql | MySQL 8.0 | 3306 | 数据库 |
| itd-backend | NestJS | 3000 | 后端 API |
| itd-frontend | nginx | 80/8080 | 前端 Web |

### 6.2 环境变量

**后端 (.env)**:
```
DATABASE_URL=mysql://itd:itd123@mysql:3306/itd_management
JWT_SECRET=<随机字符串>
PORT=3000
```

**前端**:
```
VITE_API_BASE_URL=http://itd-backend:3000/api/v1
```

### 6.3 部署流程

```bash
# 1. 拉取代码
git pull origin main

# 2. 启动服务
docker compose up -d --build

# 3. 查看日志
docker compose logs -f
```

### 6.4 初始账号

- **用户名**: admin
- **密码**: admin123
- **角色**: 管理员

---

## 7. OpenSpec 变更记录

| 日期 | 变更文件 | 说明 |
|------|----------|------|
| 2026-04-10 | auth-registration-flow-20260410 | 用户注册与账号管理流程改造 |

---

## 8. 已知问题与待办

### 已知问题
- 忘记密码功能未实现
- 个人中心页面未实现
- 大部分业务模块未实现

### 待办事项
- [ ] 忘记密码功能
- [ ] 个人中心页面
- [ ] 学生管理模块
- [ ] 教师管理模块
- [ ] 授课计划模块
- [ ] 排课管理模块
- [ ] 成绩管理模块
- [ ] 请假管理模块
- [ ] 签到管理模块
- [ ] 课时统计模块
- [ ] 系统设置模块

---

*本文档由 OpenSpec 自动生成，最后更新于 2026-04-10*
