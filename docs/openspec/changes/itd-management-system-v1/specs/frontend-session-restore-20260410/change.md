# 前端会话恢复功能修复

**变更日期**: 2026-04-10
**变更类型**: Bug 修复
**影响范围**: 前端登录状态管理

---

## 变更内容

### 问题描述
用户登录后，刷新页面时登录状态丢失。虽然 Token 保存在 localStorage 中，但用户信息（userInfo）未从 localStorage 恢复，导致前端认为用户已登出。

### 根因分析
`auth.ts` Store 初始化时：
1. ✅ Token 从 localStorage 恢复
2. ✅ Authorization Header 被设置
3. ❌ `fetchUserInfo()` 未被调用，`userInfo.value` 保持为 `null`

### 修复方案
在 Store 初始化时，如果 Token 存在，自动调用 `fetchUserInfo()` 恢复用户信息。

```typescript
// 修复前
if (token.value) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
}

// 修复后
if (token.value) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
  // 恢复用户信息
  fetchUserInfo()
}
```

### 修改文件
- `frontend/src/stores/auth.ts`

---

## 测试要点

- [ ] 登录后刷新页面，用户信息是否正确恢复
- [ ] 刷新后是否有 API 请求发送到 `/auth/profile`
- [ ] 管理员权限是否正确恢复

---

## 提交记录

- commit 72770a2: fix(frontend): restore userInfo on page refresh by calling fetchUserInfo()
