<template>
  <div class="dashboard">
    <div class="welcome-section">
      <h1>欢迎回来，{{ authStore.userInfo?.name }}</h1>
      <p class="subtitle">今天是 {{ currentDate }}</p>
    </div>

    <div class="dashboard-grid">
      <div 
        v-for="module in modules" 
        :key="module.path"
        class="module-card"
        @click="goTo(module.path)"
      >
        <div class="module-icon">
          <el-icon :size="28"><component :is="module.icon" /></el-icon>
        </div>
        <h3 class="module-title">{{ module.title }}</h3>
        <p class="module-desc">{{ module.description }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { User, UserFilled, Avatar, Document, Calendar, Memo, Clock, Timer, DataLine, Setting } from '@element-plus/icons-vue'

const router = useRouter()
const authStore = useAuthStore()

const currentDate = computed(() => {
  return new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })
})

const modules = computed(() => {
  const allModules = [
    { path: '/users', title: '用户管理', description: '管理系统用户账号', icon: User, roles: ['ADMIN'] },
    { path: '/students', title: '学生管理', description: '学生信息管理', icon: UserFilled },
    { path: '/teachers', title: '教师管理', description: '教师信息管理', icon: Avatar },
    { path: '/teaching-plan', title: '授课计划', description: '教案管理', icon: Document },
    { path: '/schedule', title: '排课管理', description: '课程安排', icon: Calendar },
    { path: '/grade', title: '成绩管理', description: '学生成绩', icon: Memo },
    { path: '/leave', title: '请假管理', description: '请假审批', icon: Clock },
    { path: '/attendance', title: '签到管理', description: '考勤打卡', icon: Timer },
    { path: '/statistics', title: '课时统计', description: '教师课时', icon: DataLine },
    { path: '/settings', title: '系统设置', description: '系统配置', icon: Setting },
  ]

  // 根据角色过滤
  return allModules.filter(m => {
    if (!m.roles) return true
    return m.roles.includes(authStore.userInfo?.accountType)
  })
})

const goTo = (path: string) => {
  router.push(path)
}
</script>

<style scoped>
.welcome-section {
  margin-bottom: 32px;
}

.welcome-section h1 {
  font-size: 28px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.subtitle {
  color: var(--text-muted);
  font-size: 14px;
}
</style>
