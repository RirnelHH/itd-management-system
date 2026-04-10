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
          <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
            <el-form-item label="用户名">
              <el-input v-model="form.username" disabled />
            </el-form-item>
            <el-form-item label="姓名" prop="name">
              <el-input v-model="form.name" />
            </el-form-item>
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="form.email" />
            </el-form-item>
            <el-form-item label="手机号" prop="phone">
              <el-input v-model="form.phone" />
            </el-form-item>
            <el-form-item label="身份">
              <el-select v-model="form.accountType" style="width: 100%" disabled>
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
            <el-form-item>
              <el-button type="primary" :loading="profileSaving" @click="handleUpdateProfile">保存资料</el-button>
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
import api from '../../api/client'

const authStore = useAuthStore()
const formRef = ref<FormInstance>()
const passwordFormRef = ref<FormInstance>()
const profileSaving = ref(false)

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

const rules: FormRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ]
}

const validateConfirmPassword = (_rule: any, value: string, callback: any) => {
  if (value !== passwordForm.newPassword) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

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

const applyUserInfoToForm = (userInfo: any) => {
  form.username = userInfo?.username || ''
  form.name = userInfo?.name || ''
  form.email = userInfo?.email || ''
  form.phone = userInfo?.phone || ''
  form.accountType = userInfo?.accountType || userInfo?.account?.accountType || ''
  form.status = userInfo?.status || userInfo?.account?.status || ''
  privacyForm.phonePublic = !!userInfo?.phonePublic
  privacyForm.emailPublic = !!userInfo?.emailPublic
}

const refreshProfile = async () => {
  await authStore.fetchUserInfo()
  applyUserInfoToForm(authStore.userInfo)
}

const handleUpdateProfile = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  profileSaving.value = true
  try {
    await api.put('/auth/profile', {
      name: form.name,
      email: form.email,
      phone: form.phone || undefined
    })

    await refreshProfile()
    ElMessage.success('个人资料已更新')
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || error.message || '更新资料失败')
  } finally {
    profileSaving.value = false
  }
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
    await api.put('/users/me/privacy', {
      phonePublic: privacyForm.phonePublic,
      emailPublic: privacyForm.emailPublic
    })

    authStore.setUserInfo({
      ...(authStore.userInfo || {}),
      phonePublic: privacyForm.phonePublic,
      emailPublic: privacyForm.emailPublic
    })

    ElMessage.success('隐私设置已更新')
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || error.message || '更新失败')
    // 回滚 UI 状态
    applyUserInfoToForm(authStore.userInfo)
  }
}

onMounted(async () => {
  await authStore.initializeAuth()
  if (authStore.userInfo) {
    applyUserInfoToForm(authStore.userInfo)
  }

  try {
    await refreshProfile()
  } catch {
    // 初始化时失败时，保持本地缓存数据展示
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
  height: 100%;
}

.account-type {
  margin-top: 16px;
  color: var(--text-muted);
}

.form-tip {
  font-size: 12px;
  color: var(--text-muted);
  margin-left: 12px;
}
</style>
