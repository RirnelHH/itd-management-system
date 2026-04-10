# 密码重置功能变更记录

**日期**: 2026-04-10
**模块**: 认证模块 (Auth)
**变更类型**: 功能新增

---

## 背景

用户注册后如果忘记密码，需要提供通过邮箱重置密码的功能。

---

## 变更内容

### 1. 新增 API 端点

#### POST /auth/forgot-password
- **功能**: 发送密码重置验证码
- **请求体**: `{ email: string }`
- **响应**: `{ message: string }`
- **逻辑**:
  - 根据邮箱查找用户
  - 生成6位数字验证码
  - 验证码存储在内存中，15分钟有效期
  - **测试环境**: 验证码直接打印到后端控制台
  - **生产环境**: 需集成邮件服务发送验证码

#### POST /auth/reset-password
- **功能**: 使用验证码重置密码
- **请求体**: `{ email: string, token: string, newPassword: string }`
- **响应**: `{ message: string }`
- **逻辑**:
  - 验证验证码正确且未过期
  - 使用 bcrypt 加密新密码
  - 更新用户密码
  - 删除已使用的验证码

### 2. 数据模型变更

**ResetPasswordDto** (修改)
```typescript
export class ResetPasswordDto {
  email: string;      // 新增
  token: string;       // 新增
  newPassword: string; // 已有
}
```

### 3. 存储设计

**验证码存储**: 内存 Map（无 Redis 依赖）
```typescript
// key: email, value: { code: string, expiresAt: Date }
const verificationCodes = new Map<string, { code: string; expiresAt: Date }>();
```

**局限性**:
- 服务重启后验证码丢失
- 分布式部署下验证码不共享
- 生产环境建议使用 Redis 存储

---

## 前端变更

### 忘记密码流程 (Login.vue)
1. 用户点击"忘记密码"
2. 弹出对话框输入邮箱
3. 调用 `POST /auth/forgot-password`
4. 显示"验证码已发送"提示
5. 弹出对话框输入验证码
6. 弹出对话框输入新密码
7. 调用 `POST /auth/reset-password`
8. 显示"密码重置成功"提示

---

## 测试方式

1. **后端启动后查看控制台**获取验证码
2. **测试流程**:
   ```
   POST /auth/forgot-password { "email": "user@example.com" }
   → 查看后端控制台打印的验证码

   POST /auth/reset-password {
     "email": "user@example.com",
     "token": "123456",
     "newPassword": "newpass123"
   }
   → 密码重置成功
   ```

---

## 待完善

- [ ] 集成真实邮件服务（目前打印到控制台）
- [ ] 使用 Redis 替代内存存储（支持分布式）
- [ ] 限制验证码尝试次数（防暴力破解）
- [ ] 添加图形验证码防刷

---

## 提交记录

- `auth.dto.ts`: ResetPasswordDto 添加 email 和 token 字段
- `auth.service.ts`: 实现 forgotPassword 和 resetPassword 方法
- `auth.controller.ts`: 调用 service 实现
- `Login.vue`: 实现忘记密码 UI 流程
