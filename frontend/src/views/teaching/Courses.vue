<template>
  <div class="teaching-page">
    <div class="page-header">
      <div>
        <h2>课程管理</h2>
        <p class="page-desc">维护公共课和专业课，并按后端业务规则处理删除与归属关系。</p>
      </div>
      <div class="header-actions">
        <el-button @click="loadData">刷新</el-button>
        <el-button type="primary" @click="openCreateDialog">新增课程</el-button>
      </div>
    </div>

    <el-card class="filter-card">
      <el-form :inline="true" :model="filters">
        <el-form-item label="课程类型">
          <el-select v-model="filters.courseType" clearable placeholder="全部类型" style="width: 180px">
            <el-option v-for="option in COURSE_TYPE_OPTIONS" :key="option.value" :label="option.label" :value="option.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="归属专业">
          <el-select v-model="filters.majorId" clearable filterable placeholder="全部专业" style="width: 220px">
            <el-option v-for="major in majors" :key="major.id" :label="major.name" :value="major.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" clearable placeholder="全部状态" style="width: 180px">
            <el-option v-for="option in COURSE_STATUS_OPTIONS" :key="option.value" :label="option.label" :value="option.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="filters.keyword" clearable placeholder="请输入课程名称" style="width: 240px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadCourses">搜索</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <el-table v-loading="loading" :data="courses" stripe>
        <el-table-column prop="name" label="课程名称" min-width="220" />
        <el-table-column label="课程类型" width="120">
          <template #default="{ row }">
            <el-tag :type="row.courseType === 'PUBLIC' ? 'info' : 'success'">
              {{ getCourseTypeLabel(row.courseType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="归属专业" min-width="180">
          <template #default="{ row }">
            {{ row.major?.name || '公共课' }}
          </template>
        </el-table-column>
        <el-table-column label="来源类型" width="120">
          <template #default="{ row }">
            {{ getCourseSourceTypeLabel(row.sourceType) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'warning'">
              {{ getCourseStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="教学计划引用" width="120">
          <template #default="{ row }">
            {{ row._count?.teachingPlanRows ?? 0 }}
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

    <el-dialog v-model="dialogVisible" :title="dialogMode === 'create' ? '新增课程' : '编辑课程'" width="560px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="课程名称" prop="name">
          <el-input v-model="form.name" maxlength="100" placeholder="请输入课程名称" />
        </el-form-item>
        <el-form-item label="课程类型" prop="courseType">
          <el-select v-model="form.courseType" placeholder="请选择课程类型" style="width: 100%">
            <el-option v-for="option in COURSE_TYPE_OPTIONS" :key="option.value" :label="option.label" :value="option.value" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="showMajorSelect" label="归属专业" prop="majorId">
          <el-select v-model="form.majorId" filterable placeholder="请选择专业" style="width: 100%">
            <el-option v-for="major in majors" :key="major.id" :label="major.name" :value="major.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="来源类型" prop="sourceType">
          <el-select v-model="form.sourceType" placeholder="请选择来源类型" style="width: 100%">
            <el-option
              v-for="option in COURSE_SOURCE_TYPE_OPTIONS"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status" placeholder="请选择状态" style="width: 100%">
            <el-option v-for="option in COURSE_STATUS_OPTIONS" :key="option.value" :label="option.label" :value="option.value" />
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
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  createCourseRequest,
  deleteCourseRequest,
  fetchCoursesRequest,
  fetchMajorsRequest,
  updateCourseRequest,
} from '../../api/teaching'
import {
  COURSE_SOURCE_TYPE_OPTIONS,
  COURSE_STATUS_OPTIONS,
  COURSE_TYPE_OPTIONS,
  getCourseSourceTypeLabel,
  getCourseStatusLabel,
  getCourseTypeLabel,
  isMajorCourse,
  normalizeCoursePayload,
} from '../../constants/teaching'
import type {
  Course,
  CourseSourceType,
  CourseStatus,
  CourseType,
  Major,
} from '../../types/teaching'
import { extractErrorMessage, isDialogCancel } from '../../utils/api'
import {
  buildCourseQuery,
  getCourseDeleteErrorMessage,
  sanitizeCourseMajor,
  validateCourseMajor,
} from './helpers'

const majors = ref<Major[]>([])
const courses = ref<Course[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const submitting = ref(false)
const editingId = ref('')
const formRef = ref<FormInstance>()

const filters = reactive({
  majorId: '',
  courseType: '' as CourseType | '',
  status: '' as CourseStatus | '',
  keyword: '',
})

const form = reactive({
  name: '',
  courseType: 'PUBLIC' as CourseType,
  majorId: '',
  sourceType: 'MANUAL' as CourseSourceType,
  status: 'ACTIVE' as CourseStatus,
})

const rules: FormRules<typeof form> = {
  name: [{ required: true, message: '请输入课程名称', trigger: 'blur' }],
  courseType: [{ required: true, message: '请选择课程类型', trigger: 'change' }],
  sourceType: [{ required: true, message: '请选择来源类型', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
  majorId: [
    {
      validator: (_rule, value, callback) => {
        const message = validateCourseMajor(form.courseType, value)
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

const showMajorSelect = computed(() => isMajorCourse(form.courseType))

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

watch(
  () => form.courseType,
  (courseType) => {
    const nextMajorId = sanitizeCourseMajor(courseType, form.majorId)
    if (nextMajorId !== form.majorId) {
      form.majorId = nextMajorId
      formRef.value?.clearValidate('majorId')
    }
  },
)

const loadCourses = async () => {
  loading.value = true
  try {
    courses.value = await fetchCoursesRequest(buildCourseQuery(filters))
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '课程列表加载失败'))
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
  await Promise.all([loadMajors(), loadCourses()])
}

const resetForm = () => {
  form.name = ''
  form.courseType = 'PUBLIC'
  form.majorId = ''
  form.sourceType = 'MANUAL'
  form.status = 'ACTIVE'
  editingId.value = ''
  formRef.value?.clearValidate()
}

const openCreateDialog = () => {
  dialogMode.value = 'create'
  resetForm()
  dialogVisible.value = true
}

const openEditDialog = (course: Course) => {
  dialogMode.value = 'edit'
  editingId.value = course.id
  form.name = course.name
  form.courseType = course.courseType
  form.majorId = course.majorId || ''
  form.sourceType = course.sourceType
  form.status = course.status
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
    const payload = normalizeCoursePayload({
      name: form.name,
      courseType: form.courseType,
      majorId: form.majorId || null,
      sourceType: form.sourceType,
      status: form.status,
    })

    if (dialogMode.value === 'create') {
      await createCourseRequest(payload)
      ElMessage.success('课程创建成功')
    } else {
      await updateCourseRequest(editingId.value, payload)
      ElMessage.success('课程更新成功')
    }

    dialogVisible.value = false
    await loadCourses()
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '课程保存失败'))
  } finally {
    submitting.value = false
  }
}

const handleDelete = async (course: Course) => {
  try {
    await ElMessageBox.confirm(`确定删除课程“${course.name}”吗？`, '删除确认', {
      type: 'warning',
    })
    const response = await deleteCourseRequest(course.id)
    ElMessage.success(response.message || '课程删除成功')
    await loadCourses()
  } catch (error) {
    if (isDialogCancel(error)) {
      return
    }
    ElMessage.error(getCourseDeleteErrorMessage(error))
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
