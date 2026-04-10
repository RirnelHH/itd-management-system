# 通讯录与隐私设置功能变更记录

**日期**: 2026-04-10
**模块**: 用户模块 (Users) + 通讯录 (Contacts)
**变更类型**: 功能新增

---

## 背景

用户需要在个人中心设置是否公开自己的联系方式（手机号、邮箱），以便其他用户在通讯录中查找联系信息。

---

## 变更内容

### 1. 数据模型变更

**User 表新增字段**:
```prisma
phonePublic Boolean @default(false)  // 手机号是否公开
emailPublic Boolean @default(false)   // 邮箱是否公开
```

### 2. 后端 API 变更

#### PUT /users/:id/privacy
- **功能**: 更新当前用户的隐私设置
- **认证**: 需要 JWT Token
- **请求体**: `{ phonePublic?: boolean, emailPublic?: boolean }`
- **权限**: 用户只能修改自己的设置

#### GET /users/public
- **功能**: 通讯录搜索（只返回公开的信息）
- **认证**: 需要 JWT Token
- **查询参数**:
  - `page`: 页码（默认1）
  - `pageSize`: 每页数量（默认20）
  - `keyword`: 搜索关键词（姓名/用户名）
  - `accountType`: 身份类型筛选
- **返回**: 只返回设置了公开的用户联系方式

### 3. 前端变更

#### Profile.vue (个人中心)
- 新增"隐私设置"卡片
- 手机号公开开关（el-switch）
- 邮箱公开开关（el-switch）
- 修改设置后自动保存

#### Contacts.vue (通讯录) - 新增
- 通讯录页面（支持搜索和分页）
- 按姓名/用户名搜索
- 按身份类型筛选
- 分页展示

#### 侧边栏菜单
- 新增"通讯录"菜单项（所有用户可见）

#### 路由
- 新增 /contacts 路由

---

## 数据流

```
用户设置隐私 → Profile.vue → PUT /users/:id/privacy → 更新 User.phonePublic/emailPublic

其他用户查找 → Contacts.vue → GET /users/public → 返回 phonePublic=true 或 emailPublic=true 的用户信息
```

---

## 安全说明

- 用户只能查看自己联系方式公开的其他用户
- 未公开的用户在通讯录中显示为 "-"
- 管理员可以查看所有用户完整信息（通过用户管理页面）

---

## 待完善

- [ ] 管理员查看用户详情时不受隐私限制
- [ ] 通讯录导出功能
- [ ] 批量设置公开/不公开

---

## 提交记录

- `schema.prisma`: 新增 phonePublic, emailPublic 字段
- `users.service.ts`: 添加 updatePrivacySettings, findPublicUsers 方法
- `users.controller.ts`: 添加 PUT /users/:id/privacy, GET /users/public 端点
- `Profile.vue`: 新增隐私设置卡片
- `Contacts.vue`: 新增通讯录页面
- `MainLayout.vue`: 添加通讯录菜单项
- `router/index.ts`: 添加 /contacts 路由
