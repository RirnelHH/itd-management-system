<template>
  <div class="login-container">
    <div class="login-box">
      <h1 class="login-title">信息技术与设计系</h1>
      <p class="login-subtitle">管理系统</p>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="handleLogin"
      >
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="用户名"
            size="large"
            prefix-icon="User"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            size="large"
            prefix-icon="Lock"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            style="width: 100%"
            @click="handleLogin"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>

      <div class="login-footer">
        <router-link to="/register">注册账号</router-link>
        <span class="divider">|</span>
        <span class="forgot-link" @click="handleForgotPassword">忘记密码</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { ElMessage, ElMessageBox } from 'element-plus'
import { forgotPasswordRequest, resetPasswordRequest } from '../../api/auth'

const router = useRouter()
const authStore = useAuthStore()

const formRef = ref()
const loading = ref(false)

const form = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const handleForgotPassword = async () => {
  try {
    const email = await ElMessageBox.prompt(
      '请输入您注册的邮箱地址，验证码将发送至该邮箱',
      '忘记密码',
      {
        confirmButtonText: '发送验证码',
        cancelButtonText: '取消',
        inputPattern: /[\w.-]+@[\w.-]+\.\w+/,
        inputErrorMessage: '请输入正确的邮箱格式'
      }
    )

    if (!email.value) return

    await forgotPasswordRequest(email.value)
    ElMessage.success('验证码已发送，请查收邮件')

    // 询问验证码和新密码
    const tokenResult = await ElMessageBox.prompt(
      '请输入邮箱中收到的6位验证码',
      '输入验证码',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPattern: /^\d{6}$/,
        inputErrorMessage: '验证码为6位数字'
      }
    )

    if (!tokenResult.value) return

    const newPasswordResult = await ElMessageBox.prompt(
      '请输入新密码（至少6位）',
      '设置新密码',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputType: 'password',
        inputPattern: /^.{6,}$/,
        inputErrorMessage: '密码至少6位'
      }
    )

    if (!newPasswordResult.value) return

    await resetPasswordRequest({
      email: email.value,
      token: tokenResult.value,
      newPassword: newPasswordResult.value
    })

    ElMessage.success('密码重置成功，请使用新密码登录')
  } catch (error: any) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error.response?.data?.message || error.message || '操作失败')
    }
  }
}

const handleLogin = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await authStore.login(form.username, form.password)
    ElMessage.success('登录成功')
    router.push('/dashboard')
  } catch (error: any) {
    ElMessage.error(error.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-footer {
  text-align: center;
  margin-top: 24px;
  font-size: 14px;
}

.login-footer a {
  color: var(--accent);
  text-decoration: none;
}

.login-footer a:hover,
.forgot-link:hover {
  text-decoration: underline;
  cursor: pointer;
}

.divider {
  color: var(--text-muted);
  margin: 0 12px;
}
</style>
