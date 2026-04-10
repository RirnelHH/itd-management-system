<template>
  <div class="register-container">
    <div class="register-box">
      <h1 class="register-title">注册账号</h1>
      <p class="register-subtitle">信息技术与设计系管理系统</p>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="handleRegister"
      >
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="用户名"
            size="large"
            prefix-icon="User"
          />
        </el-form-item>

        <el-form-item prop="name">
          <el-input
            v-model="form.name"
            placeholder="姓名"
            size="large"
            prefix-icon="UserFilled"
          />
        </el-form-item>

        <el-form-item prop="email">
          <el-input
            v-model="form.email"
            placeholder="邮箱"
            size="large"
            prefix-icon="Message"
          />
        </el-form-item>

        <el-form-item prop="phone">
          <el-input
            v-model="form.phone"
            placeholder="手机号"
            size="large"
            prefix-icon="Phone"
          />
        </el-form-item>

        <el-form-item prop="accountType">
          <el-select
            v-model="form.accountType"
            placeholder="选择身份"
            size="large"
            style="width: 100%"
            :loading="loadingOptions"
          >
            <el-option
              v-for="option in accountTypeOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            size="large"
            prefix-icon="Lock"
            show-password
          />
        </el-form-item>

        <el-form-item prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            placeholder="确认密码"
            size="large"
            prefix-icon="Lock"
            show-password
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            style="width: 100%"
            @click="handleRegister"
          >
            注册
          </el-button>
        </el-form-item>
      </el-form>

      <div class="register-footer">
        <router-link to="/login">已有账号？去登录</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { fetchRegisterOptionsRequest, registerRequest } from '../../api/auth'

const router = useRouter()

const formRef = ref()
const loading = ref(false)
const loadingOptions = ref(false)

interface AccountTypeOption {
  value: string
  label: string
}

const accountTypeOptions = ref<AccountTypeOption[]>([])

// 获取注册身份选项
const fetchRegisterOptions = async () => {
  loadingOptions.value = true
  try {
    const data = await fetchRegisterOptionsRequest()
    accountTypeOptions.value = data
    if (data.length > 0) {
      form.accountType = data[0].value
    }
  } catch (error) {
    console.error('获取注册选项失败:', error)
    // 使用默认选项作为后备
    accountTypeOptions.value = [
      { value: 'TEACHER', label: '教师' },
      { value: 'STUDENT', label: '学生' },
      { value: 'STUDENT_STAFF', label: '学生管理干事' }
    ]
  } finally {
    loadingOptions.value = false
  }
}

onMounted(() => {
  fetchRegisterOptions()
})

const form = reactive({
  username: '',
  name: '',
  email: '',
  phone: '',
  accountType: 'TEACHER',
  password: '',
  confirmPassword: ''
})

const validateConfirmPassword = (_rule: any, value: string, callback: any) => {
  if (value !== form.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度为 3-20 个字符', trigger: 'blur' }
  ],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ],
  accountType: [{ required: true, message: '请选择身份', trigger: 'change' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

const handleRegister = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const response = await registerRequest({
      username: form.username,
      name: form.name,
      email: form.email,
      phone: form.phone,
      accountType: form.accountType,
      password: form.password
    })

    ElMessage.success(response.data.message || '注册成功，请等待审批')
    router.push('/login')
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || error.message || '注册失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
}

.register-box {
  width: 100%;
  max-width: 420px;
  padding: 48px;
  background: rgba(30, 30, 40, 0.9);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.register-title {
  font-size: 28px;
  font-weight: 600;
  color: #fff;
  text-align: center;
  margin-bottom: 8px;
}

.register-subtitle {
  font-size: 14px;
  color: #888;
  text-align: center;
  margin-bottom: 32px;
}

.register-footer {
  text-align: center;
  margin-top: 24px;
  font-size: 14px;
}

.register-footer a {
  color: #00d4ff;
  text-decoration: none;
}

.register-footer a:hover {
  text-decoration: underline;
}
</style>
