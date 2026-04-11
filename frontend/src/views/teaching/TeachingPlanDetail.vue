<template>
  <div class="teaching-page">
    <div class="page-header">
      <div>
        <div class="header-title-row">
          <el-button link @click="goBack">返回列表</el-button>
          <h2>{{ plan?.name || '教学计划详情' }}</h2>
        </div>
        <p class="page-desc">
          按模板阅读方式维护教学计划明细。周课时从课程属性自动带出，表内可直接编辑。
        </p>
      </div>
      <div class="header-actions">
        <el-button @click="loadData">刷新</el-button>
        <el-button :loading="templateDownloading" @click="handleTemplateDownload">下载原模板</el-button>
        <el-button :loading="exporting" @click="handleExport">导出 Excel</el-button>
        <el-button :loading="importing" @click="triggerImport">导入 Excel</el-button>
        <el-button type="primary" :disabled="isEditing" @click="startCreateRow">新增计划行</el-button>
      </div>
    </div>

    <input
      ref="fileInputRef"
      type="file"
      accept=".xlsx"
      class="hidden-file-input"
      @change="handleFileChange"
    />

    <el-alert
      v-if="hasDisabledRows"
      type="warning"
      show-icon
      :closable="false"
      title="当前计划中包含停用课程"
      description="停用课程会继续展示；编辑历史行时，若不更换课程，可继续修改备注和排序。"
    />

    <el-alert
      v-if="importStatus"
      :type="importStatus.type"
      show-icon
      :closable="true"
      :title="importStatus.title"
      :description="importStatus.description"
      @close="importStatus = null"
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

    <el-card class="table-card">
      <template #header>
        <div class="group-header">
          <div>
            <strong>教学计划明细表</strong>
            <span class="group-count">{{ displayRows.length }} 行</span>
          </div>
          <span class="template-tip">导入会整表覆盖当前明细</span>
        </div>
      </template>

      <el-table v-if="plan" :data="displayRows" border stripe class="plan-table">
        <el-table-column label="学期序号" width="110">
          <template #default="{ row }">
            <el-input-number
              v-if="isEditingRow(row)"
              v-model="draftForm.termNo"
              :min="1"
              :step="1"
              controls-position="right"
              style="width: 100%"
            />
            <span v-else>{{ row.termNo }}</span>
          </template>
        </el-table-column>

        <el-table-column label="学期类型" width="140">
          <template #default="{ row }">
            <el-select v-if="isEditingRow(row)" v-model="draftForm.termType" style="width: 100%">
              <el-option
                v-for="option in TEACHING_PLAN_TERM_TYPE_OPTIONS"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
            <span v-else>{{ formatTermType(row.termType) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="课程" min-width="260">
          <template #default="{ row }">
            <template v-if="isEditingRow(row)">
              <el-select
                v-model="draftForm.courseId"
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
                当前选中课程已停用，不能作为新选项提交。
              </div>
            </template>
            <div v-else class="course-cell">
              <span>{{ row.courseName }}</span>
              <el-tag v-if="row.courseId === null" size="small" type="info">课程已删除</el-tag>
              <el-tag v-else-if="isDisabledCourse(row.course)" size="small" type="warning">课程已停用</el-tag>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="课程类型" width="110">
          <template #default="{ row }">
            {{ getCourseTypeLabel(isEditingRow(row) ? selectedCourse?.courseType : row.course?.courseType) }}
          </template>
        </el-table-column>

        <el-table-column label="归属专业" min-width="140">
          <template #default="{ row }">
            {{ isEditingRow(row) ? selectedCourse?.major?.name || (selectedCourse?.courseType === 'PUBLIC' ? '公共课' : '-') : row.course?.major?.name || (row.course?.courseType === 'PUBLIC' ? '公共课' : plan?.grade?.major?.name || '-') }}
          </template>
        </el-table-column>

        <el-table-column label="周课时" width="120">
          <template #default="{ row }">
            <span>{{ isEditingRow(row) ? editingWeeklyHoursText : row.weeklyHoursRaw || '-' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="备注" min-width="180">
          <template #default="{ row }">
            <el-input
              v-if="isEditingRow(row)"
              v-model="draftForm.remark"
              type="textarea"
              :rows="2"
              maxlength="255"
              show-word-limit
              placeholder="请输入备注"
            />
            <span v-else>{{ row.remark || '-' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="排序" width="100">
          <template #default="{ row }">
            <el-input-number
              v-if="isEditingRow(row)"
              v-model="draftForm.sortOrder"
              :min="0"
              :step="1"
              controls-position="right"
              style="width: 100%"
            />
            <span v-else>{{ row.sortOrder }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <template v-if="isEditingRow(row)">
              <el-button size="small" type="primary" :loading="submitting" @click="handleSave(row)">
                保存
              </el-button>
              <el-button size="small" @click="cancelEditing">取消</el-button>
            </template>
            <template v-else>
              <el-button size="small" type="primary" link :disabled="isEditing" @click="startEditRow(row)">
                编辑
              </el-button>
              <el-button size="small" type="danger" link :disabled="isEditing" @click="handleDelete(row)">
                删除
              </el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>

      <el-empty
        v-else-if="!loading"
        description="教学计划详情不存在或尚未加载完成。"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  createTeachingPlanRowRequest,
  deleteTeachingPlanRowRequest,
  downloadTeachingPlanTemplateRequest,
  exportTeachingPlanExcelRequest,
  fetchCoursesRequest,
  fetchTeachingPlanDetailRequest,
  importTeachingPlanExcelRequest,
  updateTeachingPlanRowRequest,
} from '../../api/teaching'
import { TEACHING_PLAN_TERM_TYPE_OPTIONS, getCourseTypeLabel, getTeachingPlanTermTypeLabel } from '../../constants/teaching'
import type { Course, TeachingPlanDetail, TeachingPlanRow, TeachingPlanTermType } from '../../types/teaching'
import { extractErrorMessage, isDialogCancel } from '../../utils/api'
import {
  buildTeachingPlanSelectableCourses,
  createTeachingPlanRowPayload,
  isDisabledCourse,
  validateTeachingPlanRowForm,
} from './helpers'

type EditableTeachingPlanRow = TeachingPlanRow & { __draft?: boolean }

const route = useRoute()
const router = useRouter()
const planId = computed(() => String(route.params.id || ''))

const loading = ref(false)
const submitting = ref(false)
const importing = ref(false)
const exporting = ref(false)
const templateDownloading = ref(false)
const plan = ref<TeachingPlanDetail | null>(null)
const courses = ref<Course[]>([])
const editingRowId = ref('')
const originalCourseId = ref<string | null>(null)
const isCreating = ref(false)
const fileInputRef = ref<HTMLInputElement>()
const importStatus = ref<null | { type: 'success' | 'error'; title: string; description: string }>(null)

const draftForm = reactive<{
  termNo: number | null
  termType: TeachingPlanTermType | ''
  courseId: string
  remark: string
  sortOrder: number
}>({
  termNo: 1,
  termType: 'SCHOOL',
  courseId: '',
  remark: '',
  sortOrder: 0,
})

const selectableCourses = computed(() =>
  buildTeachingPlanSelectableCourses(courses.value, plan.value?.grade?.majorId),
)

const selectedCourse = computed(() => courses.value.find((course) => course.id === draftForm.courseId) || null)

const disabledCourseSelected = computed(() => isDisabledCourse(selectedCourse.value))

const hasDisabledRows = computed(() => (plan.value?.rows || []).some((row) => isDisabledCourse(row.course)))

const isEditing = computed(() => Boolean(editingRowId.value))

const editingWeeklyHoursText = computed(() => selectedCourse.value?.weeklyHours || '-')

const draftRow = computed<EditableTeachingPlanRow | null>(() => {
  if (!editingRowId.value) {
    return null
  }

  return {
    id: editingRowId.value,
    teachingPlanId: planId.value,
    termNo: draftForm.termNo || 1,
    termType: (draftForm.termType || 'SCHOOL') as TeachingPlanTermType,
    courseId: selectedCourse.value?.id || draftForm.courseId || null,
    courseName: selectedCourse.value?.name || '',
    weeklyHoursRaw: selectedCourse.value?.weeklyHours || '',
    weeklyHoursValue: selectedCourse.value?.weeklyHours || null,
    remark: draftForm.remark || null,
    sortOrder: draftForm.sortOrder,
    createdAt: '',
    updatedAt: '',
    course: selectedCourse.value,
    __draft: true,
  }
})

const displayRows = computed<EditableTeachingPlanRow[]>(() => {
  const currentRows = (plan.value?.rows || []).slice()
  if (!draftRow.value) {
    return currentRows
  }

  if (isCreating.value) {
    return [draftRow.value, ...currentRows]
  }

  return currentRows.map((row) => (row.id === editingRowId.value ? draftRow.value as EditableTeachingPlanRow : row))
})

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

const formatTermType = (value: TeachingPlanTermType) => getTeachingPlanTermTypeLabel(value)

const buildCourseOptionLabel = (course: Course) => {
  const majorName = course.major?.name ? ` / ${course.major.name}` : ''
  const status = isDisabledCourse(course) ? ' / 已停用' : ''
  const weeklyHours = course.weeklyHours ? ` / ${course.weeklyHours}课时` : ' / 未设周课时'
  return `${course.name}${majorName}${weeklyHours}${status}`
}

const goBack = () => {
  router.push('/teaching/plans')
}

const resolveDownloadFileName = (headerValue?: string) => {
  if (!headerValue) {
    return ''
  }

  const utf8Match = headerValue.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1])
  }

  const plainMatch = headerValue.match(/filename="?([^"]+)"?/i)
  return plainMatch?.[1] || ''
}

const downloadBlobFile = (blob: Blob, fileName: string) => {
  const objectUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = fileName
  link.click()
  window.URL.revokeObjectURL(objectUrl)
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

const resetDraft = () => {
  editingRowId.value = ''
  originalCourseId.value = null
  isCreating.value = false
  draftForm.termNo = 1
  draftForm.termType = 'SCHOOL'
  draftForm.courseId = ''
  draftForm.remark = ''
  draftForm.sortOrder = 0
}

const startCreateRow = () => {
  if (isEditing.value) {
    return
  }

  resetDraft()
  editingRowId.value = '__new__'
  isCreating.value = true
}

const startEditRow = (row: TeachingPlanRow) => {
  if (isEditing.value) {
    return
  }

  editingRowId.value = row.id
  originalCourseId.value = row.courseId
  draftForm.termNo = row.termNo
  draftForm.termType = row.termType
  draftForm.courseId = row.courseId || ''
  draftForm.remark = row.remark || ''
  draftForm.sortOrder = row.sortOrder
  isCreating.value = false
}

const cancelEditing = () => {
  resetDraft()
}

const isEditingRow = (row: EditableTeachingPlanRow) => row.id === editingRowId.value

const handleCourseChange = () => {
  if (disabledCourseSelected.value) {
    ElMessage.warning('停用课程不能新增或修改到教学计划中，请改选启用课程')
  }
}

const validateDraft = () => {
  const messageSet = validateTeachingPlanRowForm({
    termNo: draftForm.termNo,
    termType: draftForm.termType,
    courseId: draftForm.courseId,
  })

  const firstMessage = Object.values(messageSet).find(Boolean)
  if (firstMessage) {
    ElMessage.warning(firstMessage)
    return false
  }

  if (!selectedCourse.value?.weeklyHours) {
    ElMessage.warning('所选课程未维护周课时，无法保存到教学计划')
    return false
  }

  return true
}

const triggerImport = () => {
  fileInputRef.value?.click()
}

const handleFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''

  if (!file || !planId.value) {
    return
  }

  importing.value = true
  importStatus.value = null
  try {
    const result = await importTeachingPlanExcelRequest(planId.value, file)
    importStatus.value = {
      type: 'success',
      title: '导入成功',
      description: `${result.message}，文件：${result.fileName}`,
    }
    ElMessage.success(result.message || `成功导入 ${result.importedRows} 行`)
    await loadData()
  } catch (error) {
    const message = extractErrorMessage(error, '教学计划 Excel 导入失败')
    importStatus.value = {
      type: 'error',
      title: '导入失败',
      description: message,
    }
    ElMessage.error(message)
  } finally {
    importing.value = false
  }
}

const handleExport = async () => {
  if (!planId.value) {
    return
  }

  exporting.value = true
  try {
    const response = await exportTeachingPlanExcelRequest(planId.value)
    const fileName =
      resolveDownloadFileName(response.headers['content-disposition']) ||
      `${plan.value?.name || 'teaching-plan'}-export.xlsx`
    downloadBlobFile(response.data, fileName)
    ElMessage.success('教学计划 Excel 导出成功')
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '教学计划 Excel 导出失败'))
  } finally {
    exporting.value = false
  }
}

const handleTemplateDownload = async () => {
  templateDownloading.value = true
  try {
    const response = await downloadTeachingPlanTemplateRequest(plan.value?.grade?.educationSystem || 'FIVE_YEAR')
    const fileName =
      resolveDownloadFileName(response.headers['content-disposition']) || '实施性教学计划模板.xlsx'
    downloadBlobFile(response.data, fileName)
    ElMessage.success('教学计划模板下载成功')
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '教学计划模板下载失败'))
  } finally {
    templateDownloading.value = false
  }
}

const handleSave = async (_row: EditableTeachingPlanRow) => {
  if (!planId.value || !draftForm.termNo || !draftForm.termType) {
    return
  }

  if (!validateDraft()) {
    return
  }

  const selectedCourseId = draftForm.courseId || null
  const keepingOriginalDisabledCourse =
    !isCreating.value &&
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
      termNo: draftForm.termNo,
      termType: draftForm.termType,
      courseId: draftForm.courseId,
      remark: draftForm.remark,
      sortOrder: draftForm.sortOrder,
    })

    if (isCreating.value) {
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

    resetDraft()
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
  flex-wrap: wrap;
  gap: 12px;
  justify-content: flex-end;
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
  gap: 16px;
}

.group-count,
.template-tip {
  color: var(--text-muted);
  font-size: 13px;
}

.plan-table :deep(.el-textarea__inner) {
  min-height: 58px !important;
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

.hidden-file-input {
  display: none;
}

@media (max-width: 900px) {
  .page-header {
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
  }

  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .group-header {
    flex-direction: column;
    align-items: flex-start;
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
