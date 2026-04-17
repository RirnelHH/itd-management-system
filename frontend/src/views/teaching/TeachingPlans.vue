<template>
  <div class="teaching-page">
    <div class="page-header">
      <div>
        <h2>教学计划列表</h2>
        <p class="page-desc">查看、创建和维护实施性教学计划，支持进入详情页维护计划明细。</p>
      </div>
      <div class="header-actions">
        <el-button @click="loadData">刷新</el-button>
        <el-button type="primary" @click="openCreateDialog">新建教学计划</el-button>
      </div>
    </div>

    <el-card class="filter-card">
      <el-form :inline="true" :model="filters">
        <el-form-item label="所属年级">
          <el-select v-model="filters.gradeId" clearable filterable placeholder="全部年级" style="width: 240px">
            <el-option
              v-for="grade in grades"
              :key="grade.id"
              :label="`${grade.name}${grade.major?.name ? ` / ${grade.major.name}` : ''}`"
              :value="grade.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="filters.keyword" clearable placeholder="请输入计划名称" style="width: 240px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadPlans">搜索</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <div class="summary-strip">
      <el-card class="summary-card">
        <span class="summary-label">教学计划总数</span>
        <strong>{{ plans.length }}</strong>
      </el-card>
      <el-card class="summary-card">
        <span class="summary-label">计划行总量</span>
        <strong>{{ totalPlanRows }}</strong>
      </el-card>
      <el-card class="summary-card">
        <span class="summary-label">可选年级</span>
        <strong>{{ grades.length }}</strong>
      </el-card>
    </div>

    <el-card class="table-card">
      <el-table v-loading="loading" :data="plans" stripe class="teaching-table">
        <el-table-column prop="name" label="教学计划名称" min-width="260" />
        <el-table-column label="所属年级" min-width="180">
          <template #default="{ row }">
            {{ row.grade?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="所属专业" min-width="180">
          <template #default="{ row }">
            {{ row.grade?.major?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="行数" width="100">
          <template #default="{ row }">
            {{ row._count?.rows ?? 0 }}
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button size="small" class="action-button action-button-edit" @click="openEditDialog(row)">编辑</el-button>
            <el-button size="small" class="action-button action-button-detail" @click="goToDetail(row.id)">详情</el-button>
            <el-button size="small" type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新建教学计划' : '编辑教学计划'"
      width="560px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="计划名称" prop="name">
          <el-input v-model="form.name" maxlength="100" placeholder="请输入教学计划名称" />
        </el-form-item>
        <el-form-item label="所属年级" prop="gradeId">
          <el-select v-model="form.gradeId" filterable placeholder="请选择年级" style="width: 100%">
            <el-option
              v-for="grade in grades"
              :key="grade.id"
              :label="`${grade.name}${grade.major?.name ? ` / ${grade.major.name}` : ''}`"
              :value="grade.id"
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
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  createTeachingPlanRequest,
  deleteTeachingPlanRequest,
  fetchGradesRequest,
  fetchTeachingPlansRequest,
  updateTeachingPlanRequest,
} from '../../api/teaching'
import type { Grade, TeachingPlan } from '../../types/teaching'
import { extractErrorMessage, isDialogCancel } from '../../utils/api'
import {
  buildTeachingPlanDetailPath,
  buildTeachingPlanQuery,
  validateTeachingPlanForm,
} from './helpers'

const router = useRouter()
const grades = ref<Grade[]>([])
const plans = ref<TeachingPlan[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const submitting = ref(false)
const editingId = ref('')
const formRef = ref<FormInstance>()

const filters = reactive({
  gradeId: '',
  keyword: '',
})

const form = reactive({
  name: '',
  gradeId: '',
})

const rules: FormRules<typeof form> = {
  name: [
    {
      validator: (_rule, value, callback) => {
        const message = validateTeachingPlanForm({
          name: value,
          gradeId: form.gradeId,
        }).name
        if (message) {
          callback(new Error(message))
          return
        }
        callback()
      },
      trigger: 'blur',
    },
  ],
  gradeId: [
    {
      validator: (_rule, value, callback) => {
        const message = validateTeachingPlanForm({
          name: form.name,
          gradeId: value,
        }).gradeId
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

const totalPlanRows = computed(() => plans.value.reduce((total, item) => total + (item._count?.rows ?? 0), 0))

const loadPlans = async () => {
  loading.value = true
  try {
    plans.value = await fetchTeachingPlansRequest(buildTeachingPlanQuery(filters))
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '教学计划列表加载失败'))
  } finally {
    loading.value = false
  }
}

const loadGrades = async () => {
  try {
    grades.value = await fetchGradesRequest()
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '年级数据加载失败'))
  }
}

const loadData = async () => {
  await Promise.all([loadGrades(), loadPlans()])
}

const resetForm = () => {
  form.name = ''
  form.gradeId = ''
  editingId.value = ''
  formRef.value?.clearValidate()
}

const openCreateDialog = () => {
  dialogMode.value = 'create'
  resetForm()
  dialogVisible.value = true
}

const openEditDialog = (plan: TeachingPlan) => {
  dialogMode.value = 'edit'
  editingId.value = plan.id
  form.name = plan.name
  form.gradeId = plan.gradeId
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
      await createTeachingPlanRequest({ ...form })
      ElMessage.success('教学计划创建成功')
    } else {
      await updateTeachingPlanRequest(editingId.value, { ...form })
      ElMessage.success('教学计划更新成功')
    }

    dialogVisible.value = false
    await loadPlans()
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '教学计划保存失败'))
  } finally {
    submitting.value = false
  }
}

const handleDelete = async (plan: TeachingPlan) => {
  try {
    await ElMessageBox.confirm(`确定删除教学计划“${plan.name}”吗？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      distinguishCancelAndClose: true,
    })
    const response = await deleteTeachingPlanRequest(plan.id)
    ElMessage.success(response.message || '教学计划删除成功')
    await loadPlans()
  } catch (error) {
    if (isDialogCancel(error)) {
      return
    }
    ElMessage.error(extractErrorMessage(error, '教学计划删除失败'))
  }
}

const goToDetail = (id: string) => {
  router.push(buildTeachingPlanDetailPath(id))
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

.action-button-edit,
.action-button-detail {
  border-color: rgba(14, 116, 144, 0.24);
  background: rgba(14, 116, 144, 0.08);
  color: #0f766e;
}

.action-button-detail {
  border-color: rgba(37, 99, 235, 0.24);
  background: rgba(37, 99, 235, 0.08);
  color: #1d4ed8;
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
