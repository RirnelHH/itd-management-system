<template>
  <div class="contacts-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>通讯录</span>
        </div>
      </template>

      <el-form inline @submit.prevent="handleSearch">
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="搜索姓名或用户名" clearable />
        </el-form-item>
        <el-form-item label="身份">
          <el-select v-model="searchForm.accountType" placeholder="全部" clearable style="width: 120px">
            <el-option label="教师" value="TEACHER" />
            <el-option label="教研组长" value="GROUP_LEADER" />
            <el-option label="主任" value="DIRECTOR" />
            <el-option label="副主任" value="VICE_DIRECTOR" />
            <el-option label="学生管理干事" value="STUDENT_STAFF" />
            <el-option label="学生" value="STUDENT" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="username" label="用户名" width="150" />
        <el-table-column prop="accountType" label="身份" width="120">
          <template #default="{ row }">
            {{ getAccountTypeName(row.accountType) }}
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="手机号">
          <template #default="{ row }">
            <span v-if="row.phone">{{ row.phone }}</span>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="email" label="邮箱">
          <template #default="{ row }">
            <span v-if="row.email">{{ row.email }}</span>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        style="margin-top: 20px; justify-content: center"
        @size-change="handleSearch"
        @current-change="handleSearch"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
})

const loading = ref(false)
const tableData = ref<any[]>([])
const token = localStorage.getItem('token') || ''

const searchForm = reactive({
  keyword: '',
  accountType: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

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

const fetchContacts = async () => {
  loading.value = true
  try {
    const params: any = {
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    if (searchForm.keyword) params.keyword = searchForm.keyword
    if (searchForm.accountType) params.accountType = searchForm.accountType

    const response = await api.get('/users/public', {
      params,
      headers: { Authorization: `Bearer ${token}` }
    })

    tableData.value = response.data.list || []
    pagination.total = response.data.total || 0
  } catch (error: any) {
    ElMessage.error(error.message || '获取通讯录失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  fetchContacts()
}

const handleReset = () => {
  searchForm.keyword = ''
  searchForm.accountType = ''
  pagination.page = 1
  fetchContacts()
}

onMounted(() => {
  fetchContacts()
})
</script>

<style scoped>
.contacts-container {
  padding: 20px;
}

.card-header {
  font-size: 16px;
  font-weight: 600;
}

.text-muted {
  color: var(--text-muted, #999);
}
</style>
