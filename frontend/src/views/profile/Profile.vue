<template>
  <div class="profile-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>个人中心</span>
        </div>
      </template>

      <el-row :gutter="20">
        <el-col :span="16">
          <el-form
            ref="formRef"
            :model="form"
            :rules="rules"
            label-width="100px"
            disabled
          >
            <el-form-item label="用户名">
              <el-input v-model="form.username" />
            </el-form-item>
            <el-form-item label="姓名">
              <el-input v-model="form.name" />
            </el-form-item>
            <el-form-item label="邮箱">
              <el-input v-model="form.email" />
            </el-form-item>
            <el-form-item label="手机号">
              <el-input v-model="form.phone" />
            </el-form-item>
            <el-form-item label="身份">
              <el-select v-model="form.accountType" style="width: 100%">
                <el-option label="管理员" value="ADMIN" />
                <el-option label="主任" value="DIRECTOR" />
                <el-option label="副主任" value="VICE_DIRECTOR" />
                <el-option label="教研组长" value="GROUP_LEADER" />
                <el-option label="学生管理干事" value="STUDENT_STAFF" />
                <el-option label="教师" value="TEACHER" />
                <el-option label="学生" value="STUDENT" />
              </el-select>
            </el-form-item>
            <el-form-item label="账号状态">
              <el-tag :type="form.status === 'ACTIVE' ? 'success' : 'warning'">
                {{ form.status === 'ACTIVE' ? '正常' : '待审批' }}
              </el-tag>
            </el-form-item>
          </el-form>
        </el-col>

        <el-col :span="8">
          <div class="avatar-section">
            <el-avatar :size="100" :icon="UserFilled" />
            <p class="account-type">{{ getAccountTypeName(form.accountType) }}</p>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <el-card style="margin-top: 20px">
      <template #header>
        <div class="card-header">
          <span>隐私设置</span>
        </div>
      </template>

      <el-form label-width="120px">
        <el-form-item label="公开手机号">
          <el-switch
            v-model="privacyForm.phonePublic"
            active-text="公开"
            inactive-text="不公开"
            @change="handleUpdatePrivacy"
          />
          <div class="form-tip">开启后，其他用户可以在通讯录中查看您的手机号</div>
        </el-form-item>
        <el-form-item label="公开邮箱">
          <el-switch
            v-model="privacyForm.emailPublic"
            active-text="公开"
            inactive-text="不公开"
            @change="handleUpdatePrivacy"
          />
          <div class="form-tip">开启后，其他用户可以在通讯录中查看您的邮箱</div>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card style="margin-top: 20px">
      <template #header>
        <div class="card-header">
          <span>修改密码</span>
        </div>
      </template>

      <el-form
        ref="passwordFormRef"
        :model="passwordForm"
        :rules="passwordRules"
        label-width="100px"
      >
        <el-form-item label="当前密码" prop="oldPassword">
          <el-input v-model="passwordForm.oldPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="passwordForm.newPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="passwordForm.confirmPassword" type="password" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleChangePassword">修改密码</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { UserFilled } from '@element-plus/icons-vue'
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
})

const authStore = useAuthStore()
const passwordFormRef = ref<FormInstance>()

const form = reactive({
  username: '',
  name: '',
  email: '',
  phone: '',
  accountType: '',
  status: ''
})

const privacyForm = reactive({
  phonePublic: false,
  emailPublic: false
})

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const validateConfirmPassword = (_rule: any, value: string, callback: any) => {
  if (value !== passwordForm.newPassword) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const rules: FormRules = {}

const passwordRules: FormRules = {
  oldPassword: [
    { required: true, message: '请输入当前密码', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码至少6个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

const getAccountTypeName = (type: string) => {
  const names: Record<string, string> = {
    ADMIN: '管理员',
    DIRECTOR: '主任',
    VICE_DIRECTOR: '副主任',
    GROUP_LEADER: '教研组长',
    STUDENT_STAFF: '学生管理干事',
    TEACHER: '教师',
    STUDENT: '学生'
  }
  return names[type] || type
}

const handleChangePassword = async () => {
  const valid = await passwordFormRef.value?.validate().catch(() => false)
  if (!valid) return

  try {
    await authStore.changePassword(passwordForm.oldPassword, passwordForm.newPassword)
    ElMessage.success('密码修改成功')
    passwordForm.oldPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
  } catch (error: any) {
    ElMessage.error(error.message || '密码修改失败')
  }
}

const handleUpdatePrivacy = async () => {
  try {
    const userId = authStore.userInfo?.id
    if (!userId) return
    await api.put(`/users/${userId}/privacy`, {
      phonePublic: privacyForm.phonePublic,
      emailPublic: privacyForm.emailPublic
    }, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    ElMessage.success('隐私设置已更新')
  } catch (error: any) {
    ElMessage.error(error.message || '更新失败')
  }
}

onMounted(async () => {
  // 从 authStore 获取用户信息
  const userInfo = authStore.userInfo
  if (userInfo) {
    form.username = userInfo.username || ''
    form.name = userInfo.name || ''
    form.email = userInfo.email || ''
    form.phone = userInfo.phone || ''
    form.accountType = userInfo.accountType || ''
    form.status = userInfo.status || ''
    privacyForm.phonePublic = userInfo.phonePublic || false
    privacyForm.emailPublic = userInfo.emailPublic || false
  }

  // 如果 authStore 没有完整信息，从 API 获取
  if (!userInfo?.phonePublic) {
    try {
      const userId = authStore.userInfo?.id
      if (userId) {
        const response = await api.get(`/users/${userId}`, {
          headers: { Authorization: `Bearer ${authStore.token}` }
        })
        const user = response.data
        privacyForm.phonePublic = user.phonePublic || false
        privacyForm.emailPublic = user.emailPublic || false
      }
    } catch (error) {
      // 忽略错误
    }
  }
})
</script>

<style scoped>
.profile-container {
  max-width: 800px;
}

.card-header {
  font-size: 16px;
  font-weight: 600;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.account-type {
  margin-top: 12px;
  font-size: 14px;
  color: var(--text-muted);
}

.form-tip {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-muted);
}
</style>
