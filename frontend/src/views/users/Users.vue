<template>
  <div class="users-page">
    <div class="page-header">
      <h2>用户管理</h2>
      <div class="header-actions">
        <el-button type="primary" @click="handleCreate">创建账号</el-button>
        <el-button type="primary" @click="handleRefresh">刷新</el-button>
      </div>
    </div>

    <el-card class="filter-card">
      <el-form :inline="true" :model="filters">
        <el-form-item label="账号类型">
          <el-select v-model="filters.accountType" placeholder="全部" clearable>
            <el-option label="管理员" value="ADMIN" />
            <el-option label="主任" value="DIRECTOR" />
            <el-option label="副主任" value="VICE_DIRECTOR" />
            <el-option label="教研组长" value="GROUP_LEADER" />
            <el-option label="学生管理干事" value="STUDENT_STAFF" />
            <el-option label="教师" value="TEACHER" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部" clearable>
            <el-option label="待审批" value="PENDING_APPROVAL" />
            <el-option label="正常" value="ACTIVE" />
            <el-option label="禁用" value="DISABLED" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="filters.keyword" placeholder="用户名/姓名/邮箱" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <el-table :data="users" v-loading="loading" stripe>
        <el-table-column prop="username" label="用户名" width="120" />
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="email" label="邮箱" width="180" />
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="account.accountType" label="角色" width="120">
          <template #default="{ row }">
            <el-tag :type="getAccountTypeTag(row.account.accountType)">
              {{ getAccountTypeName(row.account.accountType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="account.status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTag(row.account.status)">
              {{ getStatusName(row.account.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="280">
          <template #default="{ row }">
            <el-button size="small" type="warning" @click="handleEdit(row)">编辑</el-button>
            <el-button
              v-if="row.account.status === 'PENDING_APPROVAL'"
              size="small"
              type="success"
              @click="handleApprove(row)"
            >
              审批
            </el-button>
            <el-button
              size="small"
              :type="row.account.status === 'ACTIVE' ? 'danger' : 'success'"
              @click="handleToggleStatus(row)"
            >
              {{ row.account.status === 'ACTIVE' ? '禁用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, ElMessageBox as MB } from 'element-plus'
import axios from 'axios'
import type { FormInstance, FormRules } from 'element-plus'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

const users = ref<any[]>([])
const loading = ref(false)

// 创建账号对话框
const createDialogVisible = ref(false)
const createFormRef = ref<FormInstance>()
const createLoading = ref(false)

const createForm = reactive({
  username: '',
  name: '',
  email: '',
  phone: '',
  password: '',
  accountType: 'TEACHER'
})

const createRules: FormRules = {
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
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 个字符', trigger: 'blur' }
  ],
  accountType: [{ required: true, message: '请选择身份', trigger: 'change' }]
}

const filters = reactive({
  accountType: '',
  status: '',
  keyword: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 打开创建账号对话框
const handleCreate = () => {
  createForm.username = ''
  createForm.name = ''
  createForm.email = ''
  createForm.phone = ''
  createForm.password = ''
  createForm.accountType = 'TEACHER'
  createDialogVisible.value = true
}

// 提交创建账号
const submitCreate = async () => {
  const valid = await createFormRef.value?.validate().catch(() => false)
  if (!valid) return

  createLoading.value = true
  try {
    await api.post('/users', {
      username: createForm.username,
      name: createForm.name,
      email: createForm.email,
      phone: createForm.phone,
      password: createForm.password,
      accountType: createForm.accountType
    })
    ElMessage.success('账号创建成功')
    createDialogVisible.value = false
    fetchUsers()
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || error.message || '创建失败')
  } finally {
    createLoading.value = false
  }
}

// 审批账号
const handleApprove = async (row: any) => {
  try {
    await MB.confirm(`确定要审批通过用户 ${row.username} 吗？审批通过后该账号将可以直接登录。`, '审批账号', {
      confirmButtonText: '确定审批',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await api.put(`/users/${row.id}/approve`)
    ElMessage.success('审批成功，账号已激活')
    fetchUsers()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || error.message || '审批失败')
    }
  }
}

const fetchUsers = async () => {
  loading.value = true
  try {
    const params: any = {
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    if (filters.accountType) params.accountType = filters.accountType
    if (filters.status) params.status = filters.status
    if (filters.keyword) params.keyword = filters.keyword

    const { data } = await api.get('/users', { params })
    users.value = data.list
    pagination.total = data.total
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '获取用户列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  fetchUsers()
}

const handleRefresh = () => {
  fetchUsers()
}

const handleSizeChange = () => {
  pagination.page = 1
  fetchUsers()
}

const handlePageChange = () => {
  fetchUsers()
}

const handleEdit = (row: any) => {
  ElMessage.info(`编辑用户: ${row.username}`)
  // TODO: 打开编辑对话框
}

const handleToggleStatus = async (row: any) => {
  const newStatus = row.account.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
  const action = newStatus === 'ACTIVE' ? '启用' : '禁用'
  
  try {
    await ElMessageBox.confirm(`确定要${action}用户 ${row.username} 吗？`, '确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await api.put(`/users/${row.id}/status`, { status: newStatus })
    ElMessage.success(`${action}成功`)
    fetchUsers()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || `${action}失败`)
    }
  }
}

const getAccountTypeName = (type: string) => {
  const map: Record<string, string> = {
    ADMIN: '管理员',
    DIRECTOR: '主任',
    VICE_DIRECTOR: '副主任',
    GROUP_LEADER: '教研组长',
    STUDENT_STAFF: '学生管理干事',
    TEACHER: '教师'
  }
  return map[type] || type
}

const getAccountTypeTag = (type: string) => {
  const map: Record<string, string> = {
    ADMIN: 'danger',
    DIRECTOR: 'warning',
    VICE_DIRECTOR: 'warning',
    GROUP_LEADER: 'success',
    STUDENT_STAFF: 'success',
    TEACHER: 'info'
  }
  return map[type] || 'info'
}

const getStatusName = (status: string) => {
  const map: Record<string, string> = {
    PENDING_APPROVAL: '待审批',
    ACTIVE: '正常',
    DISABLED: '禁用'
  }
  return map[status] || status
}

const getStatusTag = (status: string) => {
  const map: Record<string, string> = {
    PENDING_APPROVAL: 'warning',
    ACTIVE: 'success',
    DISABLED: 'danger'
  }
  return map[status] || 'info'
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleString('zh-CN')
}

onMounted(() => {
  fetchUsers()
})
</script>

<style scoped>
.users-page {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.filter-card {
  margin-bottom: 20px;
}

.table-card {
  background-color: var(--bg-card);
}

.el-pagination {
  margin-top: 20px;
  justify-content: flex-end;
}
</style>
