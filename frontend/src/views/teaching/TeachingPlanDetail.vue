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
        <el-button type="primary" :loading="importing" @click="triggerImport">导入 Excel</el-button>
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

    <el-card v-if="importStatus" class="feedback-card" :class="`feedback-card-${importStatus.type}`">
      <div class="feedback-header">
        <div>
          <div class="feedback-title-row">
            <strong>{{ importStatus.title }}</strong>
            <el-tag size="small" :type="importStatus.type === 'success' ? 'success' : 'danger'">{{ importStatus.tag }}</el-tag>
          </div>
          <p class="feedback-summary">{{ importStatus.summary }}</p>
        </div>
        <el-button link @click="importStatus = null">收起</el-button>
      </div>

      <div v-if="importStatus.meta.length" class="feedback-meta-grid">
        <div v-for="item in importStatus.meta" :key="item.label" class="feedback-meta-item">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </div>
      </div>

      <div v-if="importStatus.details.length" class="feedback-detail-block">
        <strong class="feedback-detail-title">{{ importStatus.type === 'success' ? '导入分布' : '问题明细' }}</strong>
        <ul class="feedback-detail-list">
          <li v-for="detail in importStatus.details" :key="detail">{{ detail }}</li>
        </ul>
      </div>
    </el-card>

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
          <div class="summary-item">
            <span class="summary-label">已填槽位</span>
            <strong>{{ filledSlotCount }} / {{ totalSlotCount }}</strong>
          </div>
          <div class="summary-item">
            <span class="summary-label">待填槽位</span>
            <strong>{{ emptySlotCount }}</strong>
          </div>
        </div>
      </template>
    </el-card>

    <el-card class="table-card">
      <template #header>
        <div class="table-header">
          <div class="table-header-main">
            <strong>教学计划总表</strong>
            <span class="table-meta">{{ plan?.rows.length || 0 }} 行，按正式模板固定槽位维护</span>
          </div>
          <span class="table-meta">导入会整表覆盖当前数据；导出严格按正式模板固定位置回填。</span>
        </div>
      </template>

      <template v-if="plan">
        <div class="term-overview-grid">
          <button
            v-for="section in termSections"
            :key="section.key"
            type="button"
            class="term-overview-card"
            :class="{
              internship: section.termType === 'INTERNSHIP',
              active: activeCellKey.startsWith(`${section.termType}-${section.termNo}-`),
            }"
            @click="handleSectionPrimaryAction(section)"
          >
            <div class="term-overview-top">
              <strong>{{ section.shortTitle }}</strong>
              <el-tag size="small" :type="section.termType === 'INTERNSHIP' ? 'warning' : 'success'">
                {{ section.termType === 'INTERNSHIP' ? '岗位实习' : '校内课程' }}
              </el-tag>
            </div>
            <div class="term-overview-count">
              {{ section.rows.length }} / {{ section.slotCount }}
              <span>{{ section.termType === 'INTERNSHIP' ? '栏位' : '课程槽位' }}</span>
            </div>
            <div class="term-overview-action">
              {{ hasAvailableSlot(section) ? '新增课程' : '查看已填槽位' }}
            </div>
          </button>
        </div>

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
                  <div class="term-heading">
                    <div>
                      <div class="term-title">{{ section.shortTitle }}</div>
                      <div class="term-subtitle">
                        {{ section.termType === 'INTERNSHIP' ? '实习栏位' : '校内课程栏位' }}
                      </div>
                    </div>
                    <div class="term-heading-actions">
                      <span class="term-count">{{ section.rows.length }} / {{ section.slotCount }}</span>
                      <el-button
                        size="small"
                        type="primary"
                        plain
                        :disabled="isEditing || !hasAvailableSlot(section)"
                        @click="startCreateInSection(section)"
                      >
                        新增
                      </el-button>
                    </div>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="slotIndex in maxSlotCount" :key="slotIndex">
                <th class="slot-column">第 {{ slotIndex }} 行</th>
                <td
                  v-for="section in termSections"
                  :key="`${section.key}-${slotIndex}`"
                  :data-cell-key="buildCellKey(section, slotIndex)"
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
                        <el-tag v-if="getCellRow(section, slotIndex)?.courseId === null" size="small" type="info">
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
                        <el-button
                          size="small"
                          type="primary"
                          plain
                          :disabled="isEditing"
                          @click="startEditCell(section, slotIndex)"
                        >
                          编辑
                        </el-button>
                        <el-button
                          size="small"
                          type="danger"
                          plain
                          :disabled="isEditing"
                          @click="handleDelete(getCellRow(section, slotIndex)!)"
                        >
                          删除
                        </el-button>
                      </div>
                    </div>

                    <div v-else class="empty-cell">
                      <strong>暂无课程</strong>
                      <span class="empty-cell-hint">点击新增，直接在当前学期第 {{ slotIndex }} 槽位填写课程。</span>
                      <el-button
                        size="small"
                        type="primary"
                        plain
                        :disabled="isEditing"
                        @click="startCreateCell(section, slotIndex)"
                      >
                        新增课程
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
import { getCourseTypeLabel, getEducationSystemLabel } from '../../constants/teaching'
import type { Course, TeachingPlanDetail, TeachingPlanRow, TeachingPlanTermType } from '../../types/teaching'
import { extractErrorMessage, extractErrorMessages, isDialogCancel } from '../../utils/api'
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

type ImportStatus = {
  type: 'success' | 'error'
  title: string
  tag: string
  summary: string
  details: string[]
  meta: Array<{ label: string; value: string }>
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
const importStatus = ref<ImportStatus | null>(null)
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

const totalSlotCount = computed(() =>
  termSections.value.reduce((total, section) => total + section.slotCount, 0),
)

const filledSlotCount = computed(() => plan.value?.rows.length || 0)

const emptySlotCount = computed(() => Math.max(totalSlotCount.value - filledSlotCount.value, 0))

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

const hasAvailableSlot = (section: TermSection) => section.rows.length < section.slotCount

const getNextAvailableSlot = (section: TermSection) => section.rows.length + 1

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

const startCreateInSection = (section: TermSection) => {
  if (!hasAvailableSlot(section)) {
    ElMessage.warning(`${section.shortTitle} 已无可新增槽位，请先调整现有课程`)
    return
  }

  startCreateCell(section, getNextAvailableSlot(section))
}

const handleSectionPrimaryAction = (section: TermSection) => {
  if (hasAvailableSlot(section) && !isEditing.value) {
    startCreateInSection(section)
    return
  }

  const targetSlot = section.rows.length > 0 ? 1 : getNextAvailableSlot(section)
  const targetCellKey = buildCellKey(section, targetSlot)
  document.querySelector(`[data-cell-key="${targetCellKey}"]`)?.scrollIntoView({
    block: 'nearest',
    inline: 'center',
    behavior: 'smooth',
  })
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
      tag: '已覆盖',
      summary: result.message,
      details: result.termSummaries.map((item) => `${item.title}：${item.rowCount} 行`),
      meta: [
        { label: '导入文件', value: result.fileName },
        { label: '使用模板', value: result.templateFileName },
        { label: '所属学制', value: getEducationSystemLabel(result.educationSystem) },
        { label: '写入行数', value: String(result.importedRows) },
        { label: '替换旧行', value: String(result.replacedRows) },
      ],
    }
    ElMessage.success(`导入成功，已写入 ${result.importedRows} 行`)
    resetDraft()
    await loadData()
  } catch (error) {
    const messages = extractErrorMessages(error)
    const summary = messages[0] || extractErrorMessage(error, '教学计划 Excel 导入失败')
    importStatus.value = {
      type: 'error',
      title: '导入失败',
      tag: '需修正',
      summary,
      details: messages.slice(1),
      meta: file
        ? [
            { label: '导入文件', value: file.name },
            { label: '期望模板', value: plan.value?.grade?.educationSystem === 'THREE_YEAR' ? '课程实施计划三年制.xlsx' : '课程实施计划五年制.xlsx' },
          ]
        : [],
    }
    ElMessage.error(summary)
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
    ElMessage.success(`教学计划 Excel 导出成功：${fileName}`)
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
    ElMessage.success(`教学计划模板下载成功：${fileName}`)
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

.feedback-card {
  border-radius: 16px;
}

.feedback-card-success {
  border-color: rgba(22, 163, 74, 0.22);
  background: linear-gradient(180deg, rgba(240, 253, 244, 0.95), rgba(255, 255, 255, 0.98));
}

.feedback-card-error {
  border-color: rgba(220, 38, 38, 0.22);
  background: linear-gradient(180deg, rgba(254, 242, 242, 0.96), rgba(255, 255, 255, 0.98));
}

.feedback-header,
.feedback-title-row,
.feedback-meta-grid,
.table-header,
.term-heading,
.term-heading-actions,
.course-card-header,
.course-meta,
.cell-actions,
.editor-field {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.feedback-header,
.table-header,
.term-heading,
.editor-field {
  justify-content: space-between;
}

.feedback-summary {
  margin: 8px 0 0;
  color: #475569;
  line-height: 1.6;
}

.feedback-meta-grid {
  margin-top: 16px;
  gap: 12px;
}

.feedback-meta-item {
  min-width: 140px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.78);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.feedback-meta-item span,
.feedback-detail-title {
  color: var(--text-muted);
  font-size: 13px;
}

.feedback-detail-block {
  margin-top: 16px;
}

.feedback-detail-list {
  margin: 8px 0 0;
  padding-left: 18px;
  color: #334155;
  line-height: 1.7;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 16px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  border-radius: 14px;
  background: linear-gradient(180deg, #f8fafc, #ffffff);
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.summary-label,
.table-meta,
.term-subtitle,
.field-label {
  color: var(--text-muted);
  font-size: 13px;
}

.table-header-main {
  display: flex;
  align-items: center;
  gap: 10px;
}

.term-overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.term-overview-card {
  border: 1px solid rgba(59, 130, 246, 0.18);
  border-radius: 16px;
  padding: 14px;
  background: linear-gradient(180deg, #ffffff, #f8fbff);
  text-align: left;
  cursor: pointer;
  transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
}

.term-overview-card:hover {
  transform: translateY(-1px);
  border-color: rgba(37, 99, 235, 0.34);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
}

.term-overview-card.internship {
  background: linear-gradient(180deg, #fffaf0, #ffffff);
  border-color: rgba(245, 158, 11, 0.2);
}

.term-overview-card.active {
  border-color: rgba(37, 99, 235, 0.46);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.08);
}

.term-overview-top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
}

.term-overview-count {
  margin-top: 14px;
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
}

.term-overview-count span,
.term-overview-action,
.term-count,
.empty-cell-hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-muted);
}

.term-overview-action {
  margin-top: 12px;
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
  background: #f7f9fc;
  text-align: left;
  min-width: 220px;
}

.plan-matrix thead th.internship {
  background: #fff8eb;
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

.term-heading {
  align-items: flex-start;
}

.term-heading-actions {
  align-items: center;
  justify-content: flex-end;
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
  border-radius: 12px;
}

.empty-cell {
  justify-content: center;
  align-items: flex-start;
  color: var(--text-muted);
  padding: 12px;
  background: linear-gradient(180deg, #f8fbff, #ffffff);
  border: 1px dashed rgba(59, 130, 246, 0.24);
}

.course-card,
.cell-editor {
  padding: 12px;
  background: linear-gradient(180deg, #ffffff, #fbfdff);
  border: 1px solid rgba(148, 163, 184, 0.16);
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
  white-space: pre-wrap;
}

.editor-label {
  font-weight: 600;
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
