<template>
  <div class="teaching-page">
    <div class="page-header">
      <div>
        <div class="header-title-row">
          <el-button link @click="goBack">返回列表</el-button>
          <h2>{{ plan?.name || '教学计划详情' }}</h2>
        </div>
        <p class="page-desc">
          按正式模板横向学期分栏维护教学计划。课程选择后自动带出周课时，不再维护任课老师和手填周课时。
        </p>
      </div>
      <div class="header-actions">
        <el-button @click="loadData">刷新</el-button>
        <el-button :loading="templateDownloading" @click="handleTemplateDownload">下载原模板</el-button>
        <el-button :loading="exporting" @click="handleExport">导出 Excel</el-button>
        <el-button :loading="importing" @click="triggerImport">导入 Excel</el-button>
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
      description="停用课程会继续展示；如需修改课程，请改选启用课程。"
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
            <span class="summary-label">模板学制</span>
            <strong>{{ plan.grade?.educationSystem === 'FIVE_YEAR' ? '五年制' : '三年制' }}</strong>
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
        <div class="table-header">
          <div>
            <strong>教学计划总表</strong>
            <span class="table-meta">{{ plan?.rows.length || 0 }} 行</span>
          </div>
          <span class="table-meta">导入会整表覆盖当前数据；导出严格按正式模板固定位置回填。</span>
        </div>
      </template>

      <template v-if="plan">
        <div class="matrix-wrapper">
          <table class="plan-matrix">
            <thead>
              <tr>
                <th class="slot-column">槽位</th>
                <th
                  v-for="section in termSections"
                  :key="section.key"
                  :class="{ internship: section.termType === 'INTERNSHIP' }"
                >
                  <div class="term-title">{{ section.shortTitle }}</div>
                  <div class="term-subtitle">{{ section.termType === 'INTERNSHIP' ? '实习栏位' : '校内课程栏位' }}</div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="slotIndex in maxSlotCount" :key="slotIndex">
                <th class="slot-column">第 {{ slotIndex }} 行</th>
                <td
                  v-for="section in termSections"
                  :key="`${section.key}-${slotIndex}`"
                  :class="{
                    unused: slotIndex > section.slotCount,
                    editing: isEditingCell(section, slotIndex),
                  }"
                >
                  <template v-if="slotIndex > section.slotCount">
                    <div class="unused-cell">该学期无此槽位</div>
                  </template>

                  <template v-else-if="isEditingCell(section, slotIndex)">
                    <div class="cell-editor">
                      <div class="editor-label">{{ section.shortTitle }}</div>
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

                      <div class="editor-field">
                        <span class="field-label">周课时</span>
                        <strong>{{ editingWeeklyHoursText }}</strong>
                      </div>

                      <div class="editor-field">
                        <span class="field-label">课程类型</span>
                        <strong>{{ getCourseTypeLabel(selectedCourse?.courseType) }}</strong>
                      </div>

                      <div class="editor-field">
                        <span class="field-label">归属专业</span>
                        <strong>{{ resolveSelectedCourseMajorName() }}</strong>
                      </div>

                      <el-input
                        v-model="draftForm.remark"
                        type="textarea"
                        :rows="3"
                        maxlength="255"
                        show-word-limit
                        placeholder="请输入备注"
                      />

                      <div v-if="disabledCourseSelected" class="warning-text">当前选中课程已停用，不能提交。</div>

                      <div class="cell-actions">
                        <el-button size="small" type="primary" :loading="submitting" @click="handleSave">保存</el-button>
                        <el-button size="small" @click="cancelEditing">取消</el-button>
                      </div>
                    </div>
                  </template>

                  <template v-else>
                    <div v-if="getCellRow(section, slotIndex)" class="course-card">
                      <div class="course-card-header">
                        <strong>{{ getCellRow(section, slotIndex)?.courseName }}</strong>
                        <el-tag
                          v-if="getCellRow(section, slotIndex)?.courseId === null"
                          size="small"
                          type="info"
                        >
                          课程已删除
                        </el-tag>
                        <el-tag
                          v-else-if="isDisabledCourse(getCellRow(section, slotIndex)?.course)"
                          size="small"
                          type="warning"
                        >
                          课程已停用
                        </el-tag>
                      </div>

                      <div class="course-meta">
                        <span>{{ getCourseTypeLabel(getCellRow(section, slotIndex)?.course?.courseType) }}</span>
                        <span>{{ resolveMajorName(getCellRow(section, slotIndex)!) }}</span>
                        <span>周课时 {{ resolveRowWeeklyHours(getCellRow(section, slotIndex)!) }}</span>
                      </div>

                      <p class="course-remark">{{ getCellRow(section, slotIndex)?.remark || '无备注' }}</p>

                      <div class="cell-actions">
                        <el-button size="small" type="primary" link :disabled="isEditing" @click="startEditCell(section, slotIndex)">
                          编辑
                        </el-button>
                        <el-button
                          size="small"
                          type="danger"
                          link
                          :disabled="isEditing"
                          @click="handleDelete(getCellRow(section, slotIndex)!)"
                        >
                          删除
                        </el-button>
                      </div>
                    </div>

                    <div v-else class="empty-cell">
                      <span>空</span>
                      <el-button size="small" type="primary" plain :disabled="isEditing" @click="startCreateCell(section, slotIndex)">
                        填写
                      </el-button>
                    </div>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <el-empty v-else-if="!loading" description="教学计划详情不存在或尚未加载完成。" />
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
import { getCourseTypeLabel } from '../../constants/teaching'
import type { Course, TeachingPlanDetail, TeachingPlanRow, TeachingPlanTermType } from '../../types/teaching'
import { extractErrorMessage, isDialogCancel } from '../../utils/api'
import {
  buildTeachingPlanSelectableCourses,
  buildTeachingPlanTermSchema,
  createTeachingPlanRowPayload,
  isDisabledCourse,
  validateTeachingPlanRowForm,
} from './helpers'

type TermSection = ReturnType<typeof buildTeachingPlanTermSchema>[number] & {
  shortTitle: string
  rows: TeachingPlanRow[]
}

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
const fileInputRef = ref<HTMLInputElement>()
const importStatus = ref<null | { type: 'success' | 'error'; title: string; description: string }>(null)
const activeCellKey = ref('')
const isCreating = ref(false)

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

const termSections = computed<TermSection[]>(() => {
  const schema = buildTeachingPlanTermSchema(plan.value?.grade?.educationSystem)
  const rowGroups = new Map<string, TeachingPlanRow[]>()

  ;(plan.value?.rows || []).forEach((row) => {
    const key = `${row.termType}-${row.termNo}`
    const current = rowGroups.get(key) || []
    current.push(row)
    rowGroups.set(key, current)
  })

  return schema.map((section) => ({
    ...section,
    shortTitle: `第${section.termNo}学期`,
    rows: (rowGroups.get(section.key) || []).slice().sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder
      }
      return left.courseName.localeCompare(right.courseName, 'zh-CN')
    }),
  }))
})

const maxSlotCount = computed(() =>
  Math.max(...termSections.value.map((section) => section.slotCount), 1),
)

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

const getCellRow = (section: TermSection, slotIndex: number) => section.rows[slotIndex - 1] || null

const buildCellKey = (section: { termNo: number; termType: TeachingPlanTermType }, slotIndex: number) =>
  `${section.termType}-${section.termNo}-${slotIndex}`

const isEditingCell = (section: TermSection, slotIndex: number) => activeCellKey.value === buildCellKey(section, slotIndex)

const buildCourseOptionLabel = (course: Course) => {
  const majorName = course.major?.name ? ` / ${course.major.name}` : ''
  const status = isDisabledCourse(course) ? ' / 已停用' : ''
  const weeklyHours = course.weeklyHours ? ` / ${course.weeklyHours}课时` : ' / 未设周课时'
  return `${course.name}${majorName}${weeklyHours}${status}`
}

const resolveMajorName = (row: TeachingPlanRow) =>
  row.course?.major?.name || (row.course?.courseType === 'PUBLIC' ? '公共课' : plan.value?.grade?.major?.name || '-')

const resolveSelectedCourseMajorName = () =>
  selectedCourse.value?.major?.name || (selectedCourse.value?.courseType === 'PUBLIC' ? '公共课' : plan.value?.grade?.major?.name || '-')

const resolveRowWeeklyHours = (row: TeachingPlanRow) => row.course?.weeklyHours || row.weeklyHoursRaw || '-'

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
    const [detail, courseList] = await Promise.all([fetchTeachingPlanDetailRequest(planId.value), fetchCoursesRequest()])
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
  activeCellKey.value = ''
  isCreating.value = false
  draftForm.termNo = 1
  draftForm.termType = 'SCHOOL'
  draftForm.courseId = ''
  draftForm.remark = ''
  draftForm.sortOrder = 0
}

const startCreateCell = (section: TermSection, slotIndex: number) => {
  if (isEditing.value) {
    return
  }

  resetDraft()
  editingRowId.value = '__new__'
  activeCellKey.value = buildCellKey(section, slotIndex)
  isCreating.value = true
  draftForm.termNo = section.termNo
  draftForm.termType = section.termType
  draftForm.sortOrder = slotIndex - 1
}

const startEditCell = (section: TermSection, slotIndex: number) => {
  if (isEditing.value) {
    return
  }

  const row = getCellRow(section, slotIndex)
  if (!row) {
    return
  }

  editingRowId.value = row.id
  originalCourseId.value = row.courseId
  activeCellKey.value = buildCellKey(section, slotIndex)
  draftForm.termNo = row.termNo
  draftForm.termType = row.termType
  draftForm.courseId = row.courseId || ''
  draftForm.remark = row.remark || ''
  draftForm.sortOrder = slotIndex - 1
  isCreating.value = false
}

const cancelEditing = () => {
  resetDraft()
}

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
      description: `${result.message}；源文件：${result.fileName}；模板：${result.templateFileName}`,
    }
    ElMessage.success(result.message || `成功导入 ${result.importedRows} 行`)
    resetDraft()
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
      resolveDownloadFileName(response.headers['content-disposition']) ||
      (plan.value?.grade?.educationSystem === 'THREE_YEAR' ? '课程实施计划三年制.xlsx' : '课程实施计划五年制.xlsx')
    downloadBlobFile(response.data, fileName)
    ElMessage.success('教学计划模板下载成功')
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '教学计划模板下载失败'))
  } finally {
    templateDownloading.value = false
  }
}

const handleSave = async () => {
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

.summary-label,
.table-meta,
.term-subtitle,
.field-label {
  color: var(--text-muted);
  font-size: 13px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.matrix-wrapper {
  overflow-x: auto;
}

.plan-matrix {
  width: 100%;
  min-width: 980px;
  border-collapse: separate;
  border-spacing: 0;
}

.plan-matrix th,
.plan-matrix td {
  border: 1px solid var(--el-border-color-light);
  vertical-align: top;
  padding: 12px;
  background: #fff;
}

.plan-matrix thead th {
  background: #f6f8fb;
  text-align: left;
  min-width: 220px;
}

.plan-matrix .slot-column {
  min-width: 88px;
  width: 88px;
  background: #fbfbfc;
}

.term-title {
  font-size: 15px;
  font-weight: 700;
}

.unused-cell {
  min-height: 112px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  background: repeating-linear-gradient(135deg, #fafbfd, #fafbfd 8px, #f5f7fa 8px, #f5f7fa 16px);
}

.empty-cell,
.course-card,
.cell-editor {
  min-height: 112px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.empty-cell {
  justify-content: center;
  align-items: flex-start;
  color: var(--text-muted);
}

.course-card-header,
.course-meta,
.cell-actions,
.editor-field {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.course-card-header {
  align-items: center;
}

.course-meta {
  color: var(--text-muted);
  font-size: 13px;
}

.course-remark {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: #334155;
}

.editor-label {
  font-weight: 600;
}

.editor-field {
  justify-content: space-between;
}

.warning-text {
  color: var(--el-color-warning);
  font-size: 12px;
}

.editing {
  background: #fffdf3;
}

.unused {
  padding: 0 !important;
}

.hidden-file-input {
  display: none;
}

@media (max-width: 900px) {
  .page-header,
  .table-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
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
