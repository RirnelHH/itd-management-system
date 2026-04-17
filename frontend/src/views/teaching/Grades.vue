<template>
  <div class="teaching-page">
    <div class="page-header">
      <div>
        <h2>年级管理</h2>
        <p class="page-desc">维护年级、专业归属、学制和毕业状态。</p>
      </div>
      <div class="header-actions">
        <el-button @click="loadData">刷新</el-button>
        <el-button type="primary" @click="openCreateDialog">新增年级</el-button>
      </div>
    </div>

    <el-card class="filter-card">
      <el-form :inline="true" :model="filters">
        <el-form-item label="专业">
          <el-select v-model="filters.majorId" clearable filterable placeholder="全部专业" style="width: 220px">
            <el-option v-for="major in majors" :key="major.id" :label="major.name" :value="major.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" clearable placeholder="全部状态" style="width: 180px">
            <el-option v-for="option in GRADE_STATUS_OPTIONS" :key="option.value" :label="option.label" :value="option.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="filters.keyword" clearable placeholder="请输入年级名称" style="width: 240px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadGrades">搜索</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <div class="summary-strip">
      <el-card class="summary-card">
        <span class="summary-label">年级总数</span>
        <strong>{{ grades.length }}</strong>
      </el-card>
      <el-card class="summary-card">
        <span class="summary-label">在读年级</span>
        <strong>{{ activeGradeCount }}</strong>
      </el-card>
      <el-card class="summary-card">
        <span class="summary-label">教学计划总数</span>
        <strong>{{ totalTeachingPlans }}</strong>
      </el-card>
    </div>

    <el-card class="table-card">
      <el-table v-loading="loading" :data="grades" stripe class="teaching-table">
        <el-table-column prop="name" label="年级名称" min-width="220" />
        <el-table-column label="归属专业" min-width="180">
          <template #default="{ row }">
            {{ row.major?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="学制" width="120">
          <template #default="{ row }">
            {{ getEducationSystemLabel(row.educationSystem) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getGradeStatusTagType(row.status)">
              {{ getGradeStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="毕业时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.graduatedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="教学计划数" width="100">
          <template #default="{ row }">
            {{ row._count?.teachingPlans ?? 0 }}
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" class="action-button action-button-edit" @click="openEditDialog(row)">编辑</el-button>
            <el-button size="small" type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogMode === 'create' ? '新增年级' : '编辑年级'" width="560px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="年级名称" prop="name">
          <el-input v-model="form.name" maxlength="100" placeholder="请输入年级名称" />
        </el-form-item>
        <el-form-item label="归属专业" prop="majorId">
          <el-select v-model="form.majorId" filterable placeholder="请选择专业" style="width: 100%">
            <el-option v-for="major in majors" :key="major.id" :label="major.name" :value="major.id" />
          </el-select>
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
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status" placeholder="请选择状态" style="width: 100%">
            <el-option v-for="option in GRADE_STATUS_OPTIONS" :key="option.value" :label="option.label" :value="option.value" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.status === 'GRADUATED'" label="毕业时间" prop="graduatedAt">
          <el-date-picker v-model="form.graduatedAt" type="date" placeholder="请选择毕业时间" style="width: 100%" value-format="YYYY-MM-DD" />
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
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  createGradeRequest,
  deleteGradeRequest,
  fetchGradesRequest,
  fetchMajorsRequest,
  updateGradeRequest,
} from '../../api/teaching'
import {
  EDUCATION_SYSTEM_OPTIONS,
  GRADE_STATUS_OPTIONS,
  getEducationSystemLabel,
  getGradeStatusLabel,
  toGraduatedAtPayload,
} from '../../constants/teaching'
import type { EducationSystem, Grade, GradeStatus, Major } from '../../types/teaching'
import { extractErrorMessage, isDialogCancel } from '../../utils/api'
import { buildGradeQuery, getGradeStatusTagType, validateGraduatedAt } from './helpers'

const majors = ref<Major[]>([])
const grades = ref<Grade[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const submitting = ref(false)
const editingId = ref('')
const formRef = ref<FormInstance>()

const filters = reactive({
  majorId: '',
  status: '' as GradeStatus | '',
  keyword: '',
})

const form = reactive({
  name: '',
  majorId: '',
  educationSystem: 'THREE_YEAR' as EducationSystem,
  status: 'ACTIVE' as GradeStatus,
  graduatedAt: '',
})

const rules: FormRules<typeof form> = {
  name: [{ required: true, message: '请输入年级名称', trigger: 'blur' }],
  majorId: [{ required: true, message: '请选择归属专业', trigger: 'change' }],
  educationSystem: [{ required: true, message: '请选择学制', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
  graduatedAt: [
    {
      validator: (_rule, value, callback) => {
        const message = validateGraduatedAt(form.status, value)
        if (message) {
          callback(new Error(message))
          return
        }
        callback()
      },
      trigger: 'change',
    },
  ],
}

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

const formatDate = (value?: string | null) => {
  if (!value) {
    return '-'
  }

  return new Date(value).toLocaleDateString('zh-CN')
}

const activeGradeCount = computed(() => grades.value.filter((grade) => grade.status === 'ACTIVE').length)

const totalTeachingPlans = computed(() =>
  grades.value.reduce((total, grade) => total + (grade._count?.teachingPlans ?? 0), 0),
)

const loadGrades = async () => {
  loading.value = true
  try {
    grades.value = await fetchGradesRequest(buildGradeQuery(filters))
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '年级列表加载失败'))
  } finally {
    loading.value = false
  }
}

const loadMajors = async () => {
  try {
    majors.value = await fetchMajorsRequest()
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '专业数据加载失败'))
  }
}

const loadData = async () => {
  await Promise.all([loadMajors(), loadGrades()])
}

const resetForm = () => {
  form.name = ''
  form.majorId = ''
  form.educationSystem = 'THREE_YEAR'
  form.status = 'ACTIVE'
  form.graduatedAt = ''
  editingId.value = ''
  formRef.value?.clearValidate()
}

const openCreateDialog = () => {
  dialogMode.value = 'create'
  resetForm()
  dialogVisible.value = true
}

const openEditDialog = (grade: Grade) => {
  dialogMode.value = 'edit'
  editingId.value = grade.id
  form.name = grade.name
  form.majorId = grade.majorId
  form.educationSystem = grade.educationSystem
  form.status = grade.status
  form.graduatedAt = grade.graduatedAt ? new Date(grade.graduatedAt).toISOString().slice(0, 10) : ''
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
    const payload = {
      name: form.name,
      majorId: form.majorId,
      educationSystem: form.educationSystem,
      status: form.status,
      graduatedAt: form.status === 'GRADUATED' ? toGraduatedAtPayload(form.graduatedAt) : null,
    }

    if (dialogMode.value === 'create') {
      await createGradeRequest(payload)
      ElMessage.success('年级创建成功')
    } else {
      await updateGradeRequest(editingId.value, payload)
      ElMessage.success('年级更新成功')
    }

    dialogVisible.value = false
    await loadGrades()
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '年级保存失败'))
  } finally {
    submitting.value = false
  }
}

const handleDelete = async (grade: Grade) => {
  try {
    await ElMessageBox.confirm(`确定删除年级“${grade.name}”吗？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      distinguishCancelAndClose: true,
    })
    const response = await deleteGradeRequest(grade.id)
    ElMessage.success(response.message || '年级删除成功')
    await loadGrades()
  } catch (error) {
    if (isDialogCancel(error)) {
      return
    }
    ElMessage.error(extractErrorMessage(error, '年级删除失败'))
  }
}

onMounted(loadData)
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
.table-card,
.summary-card {
  border-radius: 14px;
}

.summary-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.summary-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: linear-gradient(180deg, #f8fafc, #ffffff);
}

.summary-label {
  color: var(--text-muted);
  font-size: 13px;
}

.teaching-table {
  --el-table-row-hover-bg-color: rgba(14, 116, 144, 0.08);
}

.action-button {
  min-width: 64px;
}

.action-button-edit {
  border-color: rgba(14, 116, 144, 0.24);
  background: rgba(14, 116, 144, 0.08);
  color: #0f766e;
}

@media (max-width: 900px) {
  .page-header {
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .summary-strip {
    grid-template-columns: 1fr;
  }
}
</style>
