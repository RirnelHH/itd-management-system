<template>
  <div class="teaching-page">
    <div class="page-header">
      <div>
        <div class="header-title-row">
          <el-button link @click="goBack">返回列表</el-button>
          <h2>{{ plan?.name || '教学计划详情' }}</h2>
        </div>
        <p class="page-desc">
          维护教学计划明细行，按学期区分课程安排、教师与周学时。
        </p>
      </div>
      <div class="header-actions">
        <el-button @click="loadData">刷新</el-button>
        <el-button type="primary" @click="openCreateDialog">新增计划行</el-button>
      </div>
    </div>

    <el-alert
      v-if="hasDisabledRows"
      type="warning"
      show-icon
      :closable="false"
      title="当前计划中包含停用课程"
      description="停用课程会继续展示在明细中，但新增时不可选择；编辑已有停用课程行时，如不更换课程，仅允许修改其他字段。"
    />

    <el-card v-loading="loading" class="summary-card">
      <template v-if="plan">
        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-label">所属年级</span>
            <strong>{{ plan.grade?.name || '-' }}</strong>
          </div>
          <div class="summary-item">
            <span class="summary-label">所属专业</span>
            <strong>{{ plan.grade?.major?.name || '-' }}</strong>
          </div>
          <div class="summary-item">
            <span class="summary-label">总行数</span>
            <strong>{{ plan.rows.length }}</strong>
          </div>
          <div class="summary-item">
            <span class="summary-label">更新时间</span>
            <strong>{{ formatDateTime(plan.updatedAt) }}</strong>
          </div>
        </div>
      </template>
    </el-card>

    <template v-if="plan && rowGroups.length">
      <el-card v-for="group in rowGroups" :key="group.key" class="table-card">
        <template #header>
          <div class="group-header">
            <div>
              <strong>{{ group.title }}</strong>
              <span class="group-count">{{ group.rows.length }} 行</span>
            </div>
          </div>
        </template>

        <el-table :data="group.rows" stripe>
          <el-table-column label="课程名称" min-width="220">
            <template #default="{ row }">
              <div class="course-cell">
                <span>{{ row.courseName }}</span>
                <el-tag v-if="row.courseId === null" size="small" type="info">课程已删除</el-tag>
                <el-tag v-else-if="isDisabledCourse(row.course)" size="small" type="warning">课程已停用</el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="课程类型" width="100">
            <template #default="{ row }">
              {{ getCourseTypeLabel(row.course?.courseType) }}
            </template>
          </el-table-column>
          <el-table-column label="周学时" width="110">
            <template #default="{ row }">
              {{ row.weeklyHoursRaw || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="任课教师" min-width="140">
            <template #default="{ row }">
              {{ row.teacherName || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="备注" min-width="180">
            <template #default="{ row }">
              {{ row.remark || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="排序" width="80">
            <template #default="{ row }">
              {{ row.sortOrder }}
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
    </template>

    <el-empty
      v-else-if="!loading"
      description="当前教学计划还没有明细行，请先新增第一条计划行。"
    />

    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增教学计划行' : '编辑教学计划行'"
      width="640px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="rowForm" :rules="rules" label-width="110px">
        <el-form-item label="学期序号" prop="termNo">
          <el-input-number v-model="rowForm.termNo" :min="1" :step="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="学期类型" prop="termType">
          <el-select v-model="rowForm.termType" placeholder="请选择学期类型" style="width: 100%">
            <el-option
              v-for="option in TEACHING_PLAN_TERM_TYPE_OPTIONS"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="课程" prop="courseId">
          <el-select
            v-model="rowForm.courseId"
            filterable
            placeholder="请选择课程"
            style="width: 100%"
            @change="handleCourseChange"
          >
            <el-option
              v-for="course in selectableCourses"
              :key="course.id"
              :label="buildCourseOptionLabel(course)"
              :value="course.id"
              :disabled="isDisabledCourse(course)"
            />
          </el-select>
          <div v-if="disabledCourseSelected" class="field-tip warning-text">
            当前选中课程已停用，不能作为新选项提交。若这是已有行的历史课程，请保留原课程并仅修改其他字段，或改选启用课程。
          </div>
        </el-form-item>
        <el-form-item label="周学时" prop="weeklyHoursRaw">
          <el-input
            v-model="rowForm.weeklyHoursRaw"
            maxlength="50"
            placeholder="请输入周学时，如 4、4.5 或 4学时"
          />
        </el-form-item>
        <el-form-item label="任课教师">
          <el-input v-model="rowForm.teacherName" maxlength="100" placeholder="请输入任课教师" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="rowForm.remark"
            type="textarea"
            :rows="3"
            maxlength="255"
            show-word-limit
            placeholder="请输入备注"
          />
        </el-form-item>
        <el-form-item label="排序序号">
          <el-input-number v-model="rowForm.sortOrder" :min="0" :step="1" style="width: 100%" />
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
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  createTeachingPlanRowRequest,
  deleteTeachingPlanRowRequest,
  fetchCoursesRequest,
  fetchTeachingPlanDetailRequest,
  updateTeachingPlanRowRequest,
} from '../../api/teaching'
import { TEACHING_PLAN_TERM_TYPE_OPTIONS, getCourseTypeLabel } from '../../constants/teaching'
import type { Course, TeachingPlanDetail, TeachingPlanRow, TeachingPlanTermType } from '../../types/teaching'
import { extractErrorMessage, isDialogCancel } from '../../utils/api'
import {
  buildTeachingPlanRowGroups,
  buildTeachingPlanSelectableCourses,
  createTeachingPlanRowPayload,
  isDisabledCourse,
  validateTeachingPlanRowForm,
} from './helpers'

const route = useRoute()
const router = useRouter()
const planId = computed(() => String(route.params.id || ''))

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const plan = ref<TeachingPlanDetail | null>(null)
const courses = ref<Course[]>([])
const editingRowId = ref('')
const originalCourseId = ref<string | null>(null)
const formRef = ref<FormInstance>()

const rowForm = reactive<{
  termNo: number | null
  termType: TeachingPlanTermType | ''
  courseId: string
  weeklyHoursRaw: string
  teacherName: string
  remark: string
  sortOrder: number
}>({
  termNo: 1,
  termType: 'SCHOOL',
  courseId: '',
  weeklyHoursRaw: '',
  teacherName: '',
  remark: '',
  sortOrder: 0,
})

const rules: FormRules<typeof rowForm> = {
  termNo: [
    {
      validator: (_rule, value, callback) => {
        const message = validateTeachingPlanRowForm({
          termNo: value,
          termType: rowForm.termType,
          courseId: rowForm.courseId,
          weeklyHoursRaw: rowForm.weeklyHoursRaw,
        }).termNo
        if (message) {
          callback(new Error(message))
          return
        }
        callback()
      },
      trigger: 'change',
    },
  ],
  termType: [
    {
      validator: (_rule, value, callback) => {
        const message = validateTeachingPlanRowForm({
          termNo: rowForm.termNo,
          termType: value,
          courseId: rowForm.courseId,
          weeklyHoursRaw: rowForm.weeklyHoursRaw,
        }).termType
        if (message) {
          callback(new Error(message))
          return
        }
        callback()
      },
      trigger: 'change',
    },
  ],
  courseId: [
    {
      validator: (_rule, value, callback) => {
        const message = validateTeachingPlanRowForm({
          termNo: rowForm.termNo,
          termType: rowForm.termType,
          courseId: value,
          weeklyHoursRaw: rowForm.weeklyHoursRaw,
        }).courseId
        if (message) {
          callback(new Error(message))
          return
        }
        callback()
      },
      trigger: 'change',
    },
  ],
  weeklyHoursRaw: [
    {
      validator: (_rule, value, callback) => {
        const message = validateTeachingPlanRowForm({
          termNo: rowForm.termNo,
          termType: rowForm.termType,
          courseId: rowForm.courseId,
          weeklyHoursRaw: value,
        }).weeklyHoursRaw
        if (message) {
          callback(new Error(message))
          return
        }
        callback()
      },
      trigger: 'blur',
    },
  ],
}

const selectableCourses = computed(() =>
  buildTeachingPlanSelectableCourses(courses.value, plan.value?.grade?.majorId),
)

const rowGroups = computed(() => buildTeachingPlanRowGroups(plan.value?.rows || []))

const selectedCourse = computed(() => courses.value.find((course) => course.id === rowForm.courseId) || null)

const disabledCourseSelected = computed(() => isDisabledCourse(selectedCourse.value))

const hasDisabledRows = computed(() => (plan.value?.rows || []).some((row) => isDisabledCourse(row.course)))

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

const buildCourseOptionLabel = (course: Course) => {
  const majorName = course.major?.name ? ` / ${course.major.name}` : ''
  const status = isDisabledCourse(course) ? ' / 已停用' : ''
  return `${course.name}${majorName}${status}`
}

const goBack = () => {
  router.push('/teaching/plans')
}

const loadData = async () => {
  if (!planId.value) {
    return
  }

  loading.value = true
  try {
    const [detail, courseList] = await Promise.all([
      fetchTeachingPlanDetailRequest(planId.value),
      fetchCoursesRequest(),
    ])
    plan.value = detail
    courses.value = courseList
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '教学计划详情加载失败'))
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  rowForm.termNo = 1
  rowForm.termType = 'SCHOOL'
  rowForm.courseId = ''
  rowForm.weeklyHoursRaw = ''
  rowForm.teacherName = ''
  rowForm.remark = ''
  rowForm.sortOrder = 0
  editingRowId.value = ''
  originalCourseId.value = null
  formRef.value?.clearValidate()
}

const openCreateDialog = () => {
  dialogMode.value = 'create'
  resetForm()
  dialogVisible.value = true
}

const openEditDialog = (row: TeachingPlanRow) => {
  dialogMode.value = 'edit'
  editingRowId.value = row.id
  originalCourseId.value = row.courseId
  rowForm.termNo = row.termNo
  rowForm.termType = row.termType
  rowForm.courseId = row.courseId || ''
  rowForm.weeklyHoursRaw = row.weeklyHoursRaw
  rowForm.teacherName = row.teacherName || ''
  rowForm.remark = row.remark || ''
  rowForm.sortOrder = row.sortOrder
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

const handleCourseChange = () => {
  if (disabledCourseSelected.value) {
    ElMessage.warning('停用课程不能新增或修改到教学计划中，请改选启用课程')
  }
}

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid || !planId.value || !rowForm.termNo || !rowForm.termType) {
    return
  }

  const selectedCourseId = rowForm.courseId || null
  const keepingOriginalDisabledCourse =
    dialogMode.value === 'edit' &&
    selectedCourseId !== null &&
    selectedCourseId === originalCourseId.value &&
    disabledCourseSelected.value

  if (disabledCourseSelected.value && !keepingOriginalDisabledCourse) {
    ElMessage.warning('停用课程不能新增或修改到教学计划中，请改选启用课程')
    return
  }

  submitting.value = true
  try {
    const payload = createTeachingPlanRowPayload({
      termNo: rowForm.termNo,
      termType: rowForm.termType,
      courseId: rowForm.courseId,
      weeklyHoursRaw: rowForm.weeklyHoursRaw,
      teacherName: rowForm.teacherName,
      remark: rowForm.remark,
      sortOrder: rowForm.sortOrder,
    })

    if (dialogMode.value === 'create') {
      await createTeachingPlanRowRequest(planId.value, payload)
      ElMessage.success('教学计划行创建成功')
    } else {
      const updatePayload: Partial<typeof payload> = { ...payload }
      if (keepingOriginalDisabledCourse) {
        delete updatePayload.courseId
      }
      await updateTeachingPlanRowRequest(planId.value, editingRowId.value, updatePayload)
      ElMessage.success('教学计划行更新成功')
    }

    dialogVisible.value = false
    await loadData()
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '教学计划行保存失败'))
  } finally {
    submitting.value = false
  }
}

const handleDelete = async (row: TeachingPlanRow) => {
  if (!planId.value) {
    return
  }

  try {
    await ElMessageBox.confirm(`确定删除计划行“${row.courseName}”吗？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      distinguishCancelAndClose: true,
    })
    const response = await deleteTeachingPlanRowRequest(planId.value, row.id)
    ElMessage.success(response.message || '教学计划行删除成功')
    await loadData()
  } catch (error) {
    if (isDialogCancel(error)) {
      return
    }
    ElMessage.error(extractErrorMessage(error, '教学计划行删除失败'))
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

.header-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
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

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.summary-label {
  color: var(--text-muted);
  font-size: 13px;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.group-count {
  margin-left: 10px;
  color: var(--text-muted);
  font-size: 13px;
}

.course-cell {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.field-tip {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
}

.warning-text {
  color: var(--el-color-warning);
}

@media (max-width: 900px) {
  .page-header {
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .header-title-row {
    align-items: flex-start;
    flex-direction: column;
    gap: 2px;
  }
}
</style>
