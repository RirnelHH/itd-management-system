<template>
  <div class="teaching-page">
    <div class="page-header">
      <div>
        <h2>专业管理</h2>
        <p class="page-desc">维护专业基础资料和学制信息。</p>
      </div>
      <div class="header-actions">
        <el-button @click="loadMajors">刷新</el-button>
        <el-button type="primary" @click="openCreateDialog">新增专业</el-button>
      </div>
    </div>

    <el-card class="filter-card">
      <el-form :inline="true" :model="filters">
        <el-form-item label="学制">
          <el-select v-model="filters.educationSystem" placeholder="全部" clearable style="width: 180px">
            <el-option
              v-for="option in EDUCATION_SYSTEM_OPTIONS"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="filters.keyword" clearable placeholder="请输入专业名称" style="width: 240px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadMajors">搜索</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <el-table v-loading="loading" :data="majors" stripe>
        <el-table-column prop="name" label="专业名称" min-width="220" />
        <el-table-column label="学制" width="120">
          <template #default="{ row }">
            {{ getEducationSystemLabel(row.educationSystem) }}
          </template>
        </el-table-column>
        <el-table-column label="关联年级" width="100">
          <template #default="{ row }">
            {{ row._count?.grades ?? 0 }}
          </template>
        </el-table-column>
        <el-table-column label="关联课程" width="100">
          <template #default="{ row }">
            {{ row._count?.courses ?? 0 }}
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="openEditDialog(row)">编辑</el-button>
            <el-button size="small" type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogMode === 'create' ? '新增专业' : '编辑专业'" width="520px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="专业名称" prop="name">
          <el-input v-model="form.name" maxlength="100" placeholder="请输入专业名称" />
        </el-form-item>
        <el-form-item label="学制" prop="educationSystem">
          <el-select v-model="form.educationSystem" placeholder="请选择学制" style="width: 100%">
            <el-option
              v-for="option in EDUCATION_SYSTEM_OPTIONS"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  createMajorRequest,
  deleteMajorRequest,
  fetchMajorsRequest,
  updateMajorRequest,
} from '../../api/teaching'
import { EDUCATION_SYSTEM_OPTIONS, getEducationSystemLabel } from '../../constants/teaching'
import type { EducationSystem, Major } from '../../types/teaching'
import { extractErrorMessage, isDialogCancel } from '../../utils/api'

const majors = ref<Major[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const submitting = ref(false)
const editingId = ref('')
const formRef = ref<FormInstance>()

const filters = reactive({
  keyword: '',
  educationSystem: '' as EducationSystem | '',
})

const form = reactive({
  name: '',
  educationSystem: 'THREE_YEAR' as EducationSystem,
})

const rules: FormRules<typeof form> = {
  name: [{ required: true, message: '请输入专业名称', trigger: 'blur' }],
  educationSystem: [{ required: true, message: '请选择学制', trigger: 'change' }],
}

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

const loadMajors = async () => {
  loading.value = true
  try {
    majors.value = await fetchMajorsRequest({
      keyword: filters.keyword || undefined,
      educationSystem: filters.educationSystem || undefined,
    })
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '专业列表加载失败'))
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  form.name = ''
  form.educationSystem = 'THREE_YEAR'
  editingId.value = ''
  formRef.value?.clearValidate()
}

const openCreateDialog = () => {
  dialogMode.value = 'create'
  resetForm()
  dialogVisible.value = true
}

const openEditDialog = (major: Major) => {
  dialogMode.value = 'edit'
  editingId.value = major.id
  form.name = major.name
  form.educationSystem = major.educationSystem
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }

  submitting.value = true
  try {
    if (dialogMode.value === 'create') {
      await createMajorRequest({ ...form })
      ElMessage.success('专业创建成功')
    } else {
      await updateMajorRequest(editingId.value, { ...form })
      ElMessage.success('专业更新成功')
    }

    dialogVisible.value = false
    await loadMajors()
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '专业保存失败'))
  } finally {
    submitting.value = false
  }
}

const handleDelete = async (major: Major) => {
  try {
    await ElMessageBox.confirm(`确定删除专业“${major.name}”吗？`, '删除确认', {
      type: 'warning',
    })
    const response = await deleteMajorRequest(major.id)
    ElMessage.success(response.message || '专业删除成功')
    await loadMajors()
  } catch (error) {
    if (isDialogCancel(error)) {
      return
    }
    ElMessage.error(extractErrorMessage(error, '专业删除失败'))
  }
}

onMounted(loadMajors)
</script>

<style scoped>
.teaching-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.page-desc {
  margin-top: 6px;
  color: var(--text-muted);
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.filter-card,
.table-card {
  border-radius: 12px;
}

@media (max-width: 900px) {
  .page-header {
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
