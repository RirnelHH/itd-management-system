# 用户隐私字段变更

**变更日期**: 2026-04-10
**变更类型**: 数据库 Schema 扩展
**影响范围**: User 模型、注册流程、个人中心

---

## 变更内容

### 背景
支持用户控制个人信息（手机号、邮箱）的公开范围，允许用户在通讯录中隐藏或显示这些信息。

### Schema 变更

**User 模型新增字段**:
```prisma
phonePublic Boolean @default(false)  // 手机号是否公开，默认不公开
emailPublic Boolean @default(false) // 邮箱是否公开，默认不公开
```

### API 变更

| 方法 | 路径 | 说明 |
|------|------|------|
| PUT | /users/:id/privacy | 更新用户隐私设置 |
| GET | /users/public | 获取公开联系信息的用户列表（通讯录） |

### 数据库迁移

```sql
ALTER TABLE `User` ADD COLUMN `phonePublic` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `User` ADD COLUMN `emailPublic` BOOLEAN NOT NULL DEFAULT false;
```

迁移文件: `20260410220000_add_privacy_fields/migration.sql`

---

## 对外接口影响

- 注册时无需额外字段（默认 false）
- 登录返回用户信息中包含 phonePublic/emailPublic
- 通讯录 API 过滤逻辑：只返回 emailPublic=true 或 phonePublic=true 的用户

---

## 测试要点

- [ ] 注册后默认 phonePublic=false, emailPublic=false
- [ ] 用户可在个人中心修改隐私设置
- [ ] 通讯录只显示已开启公开的用户
- [ ] 隐私设置变更后，通讯录实时反映

---

## 提交记录

- commit 516538f: fix(database): add migration for phonePublic and emailPublic fields
