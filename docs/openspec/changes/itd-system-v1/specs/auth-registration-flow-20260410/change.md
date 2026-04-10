# OpenSpec 变更记录 - 用户注册与账号管理流程

**变更日期**: 2026-04-10
**变更类型**: 功能新增 + 流程修改
**影响范围**: 认证模块、用户管理模块
**状态**: 已完成

---

## 变更背景

根据陈总需求，修改用户注册流程：
1. 所有人注册都需要管理员审核
2. 管理员可以手动创建账号给用户
3. 注册表单的身份选项需要从数据库动态获取

---

## 变更内容

### 1. 后端 - 认证模块改造

#### 1.1 新增注册选项 API

**文件**: `backend/src/auth/auth.controller.ts`

```diff
+  @Get('register-options')
+  @ApiOperation({ summary: '获取注册选项' })
+  getRegisterOptions() {
+    return this.authService.getRegisterOptions();
+  }
```

**文件**: `backend/src/auth/auth.service.ts`

```diff
+  // 获取注册选项（可自主注册的身份列表）
+  getRegisterOptions() {
+    const allowedSelfRegister = ['TEACHER', 'STUDENT', 'STUDENT_STAFF'];
+    const accountTypeNames: Record<string, string> = {
+      TEACHER: '教师',
+      STUDENT: '学生',
+      STUDENT_STAFF: '学生管理干事',
+    };
+    return allowedSelfRegister.map((type) => ({
+      value: type,
+      label: accountTypeNames[type] || type,
+    }));
+  }
```

**API 规范**:
- **端点**: `GET /auth/register-options`
- **认证**: 不需要
- **响应**:
```json
[
  { "value": "TEACHER", "label": "教师" },
  { "value": "STUDENT", "label": "学生" },
  { "value": "STUDENT_STAFF", "label": "学生管理干事" }
]
```

#### 1.2 修改注册流程 - 允许三种身份自主注册

**文件**: `backend/src/auth/auth.service.ts`

```diff
-  // 非 TEACHER 角色不允许自主注册
-  const allowedSelfRegister = ['TEACHER'];
-  if (!allowedSelfRegister.includes(data.accountType)) {
-    throw new BadRequestException('不允许自主注册此角色，请联系管理员');
-  }

+  // 允许自主注册的身份（注册后需管理员审批）
+  const allowedSelfRegister = ['TEACHER', 'STUDENT', 'STUDENT_STAFF'];
+  if (!allowedSelfRegister.includes(data.accountType)) {
+    throw new BadRequestException('不允许自主注册此角色，请联系管理员');
+  }
```

**说明**: 之前只有教师能注册，现在学生和学生管理干事也能注册，但注册后状态为 PENDING_APPROVAL，需管理员审批后才能登录。

---

### 2. 后端 - 用户管理模块新增 API

#### 2.1 管理员创建用户 API

**文件**: `backend/src/users/users.controller.ts`

```diff
+  @Post()
+  @UseGuards(RolesGuard)
+  @Roles('ADMIN')
+  @ApiOperation({ summary: '管理员创建用户' })
+  create(@Body() data: {
+    username: string;
+    name: string;
+    email: string;
+    phone?: string;
+    password: string;
+    accountType: AccountType;
+  }) {
+    return this.usersService.create(data);
+  }
```

**文件**: `backend/src/users/users.service.ts`

新增 `create` 方法，创建用户和账号（账号状态直接设为 ACTIVE）

**API 规范**:
- **端点**: `POST /users`
- **认证**: 需要 JWT Token，角色为 ADMIN
- **请求体**:
```json
{
  "username": "string",
  "name": "string",
  "email": "string",
  "phone": "string (可选)",
  "password": "string",
  "accountType": "ADMIN | DIRECTOR | VICE_DIRECTOR | GROUP_LEADER | TEACHER | STUDENT | STUDENT_STAFF"
}
```
- **响应**:
```json
{
  "message": "账号创建成功",
  "user": {
    "id": "string",
    "username": "string",
    "name": "string",
    "email": "string",
    "accountType": "string",
    "status": "ACTIVE"
  }
}
```

#### 2.2 管理员审批账号 API

**文件**: `backend/src/users/users.controller.ts`

```diff
+  @Put(':id/approve')
+  @UseGuards(RolesGuard)
+  @Roles('ADMIN')
+  @ApiOperation({ summary: '审批账号（通过）' })
+  approve(@Param('id') id: string) {
+    return this.usersService.updateStatus(id, 'ACTIVE');
+  }
```

**API 规范**:
- **端点**: `PUT /users/:id/approve`
- **认证**: 需要 JWT Token，角色为 ADMIN
- **路径参数**: `id` - 用户 ID
- **响应**:
```json
{
  "message": "账号已启用"
}
```

---

### 3. 前端 - 注册页面改造

**文件**: `frontend/src/views/register/Register.vue`

#### 3.1 动态获取身份选项
- 页面加载时调用 `GET /auth/register-options` 获取身份选项
- 改为 `el-select` 的 `v-for` 动态渲染

#### 3.2 身份选项来源
```javascript
const accountTypeOptions = ref<AccountTypeOption[]>([])

const fetchRegisterOptions = async () => {
  const { data } = await api.get('/auth/register-options')
  accountTypeOptions.value = data
}
```

---

### 4. 前端 - 用户管理页面改造

**文件**: `frontend/src/views/users/Users.vue`

#### 4.1 新增"创建账号"按钮和对话框
- 头部添加"创建账号"按钮
- 新增 `createDialogVisible` 对话框
- 表单包含：用户名、姓名、邮箱、手机号、密码、身份选择

#### 4.2 新增"审批"按钮
- 对 `status === 'PENDING_APPROVAL'` 的用户显示"审批"按钮
- 点击调用 `PUT /users/:id/approve`

---

### 5. 部署配置修复

**文件**: `docker-compose.yml`

```diff
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
+     args:
+       - VITE_API_BASE_URL=http://itd-backend:3000/api/v1
```

**问题**: Docker 容器内的前端请求 `localhost:3000` 会指向自己而非后端，修复为使用容器网络名称。

---

### 6. 数据库迁移文件

**文件**: `backend/prisma/migrations/20260410120000_init/migration.sql`

创建以下表：
- `User` - 用户表
- `Account` - 账号表
- `Permission` - 权限表
- `RolePermission` - 角色权限表

---

## 数据流

### 注册流程
```
用户填写注册表单
    ↓
POST /auth/register
    ↓
后端创建用户 + 账号（状态 PENDING_APPROVAL）
    ↓
返回"注册成功，请等待审批"
```

### 管理员审批流程
```
管理员登录后台
    ↓
查看待审批用户列表
    ↓
点击"审批"按钮
    ↓
PUT /users/:id/approve
    ↓
账号状态改为 ACTIVE
    ↓
用户可以登录
```

### 管理员直接创建账号
```
管理员点击"创建账号"
    ↓
填写用户信息
    ↓
POST /users
    ↓
创建用户 + 账号（状态 ACTIVE）
    ↓
账号可以直接登录
```

---

## 涉及的数据库表

### User 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(191) | 主键 |
| username | VARCHAR(191) | 用户名，唯一 |
| name | VARCHAR(191) | 姓名 |
| email | VARCHAR(191) | 邮箱，唯一 |
| phone | VARCHAR(191) | 手机号（可选） |
| createdAt | DATETIME | 创建时间 |
| updatedAt | DATETIME | 更新时间 |

### Account 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(191) | 主键 |
| userId | VARCHAR(191) | 用户 ID，外键 |
| password | VARCHAR(191) | 加密后的密码 |
| accountType | VARCHAR(191) | 账号类型 |
| status | VARCHAR(191) | 状态 |
| createdAt | DATETIME | 创建时间 |
| updatedAt | DATETIME | 更新时间 |

### 账号类型枚举
| 值 | 说明 |
|----|------|
| ADMIN | 管理员 |
| DIRECTOR | 主任 |
| VICE_DIRECTOR | 副主任 |
| GROUP_LEADER | 教研组长 |
| TEACHER | 教师 |
| STUDENT | 学生 |
| STUDENT_STAFF | 学生管理干事 |

### 账号状态枚举
| 值 | 说明 |
|----|------|
| PENDING_APPROVAL | 待审批 |
| ACTIVE | 正常 |
| DISABLED | 禁用 |

---

## API 端点汇总

| 方法 | 端点 | 说明 | 认证 |
|------|------|------|------|
| GET | /auth/register-options | 获取注册身份选项 | 否 |
| POST | /auth/register | 用户注册 | 否 |
| POST | /auth/login | 用户登录 | 否 |
| GET | /users | 获取用户列表 | ADMIN |
| POST | /users | 管理员创建用户 | ADMIN |
| PUT | /users/:id/approve | 审批账号通过 | ADMIN |
| PUT | /users/:id/status | 启用/禁用账号 | ADMIN |

---

## 后续待办

1. 忘记密码功能开发
2. 个人中心页面开发
3. 其他业务模块开发（学生/教师/排课等）

---

## 相关 Commit

- `b2a687b` - feat: 注册表单身份选项改为从后端API获取
- `c54d49d` - fix: 修复前端 API 请求无法到达后端的问题
