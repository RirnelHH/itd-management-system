<template>
  <el-container class="layout-container">
    <!-- 侧边栏 -->
    <el-aside width="220px">
      <div class="logo">
        <span class="logo-text">IT&D</span>
        <span class="logo-sub">管理系统</span>
      </div>
      
      <el-menu
        :default-active="activeMenu"
        :router="true"
        class="sidebar-menu"
      >
        <el-menu-item index="/dashboard">
          <el-icon><House /></el-icon>
          <span>首页</span>
        </el-menu-item>

        <el-menu-item index="/users" v-if="authStore.isAdmin">
          <el-icon><User /></el-icon>
          <span>用户管理</span>
        </el-menu-item>

        <el-menu-item index="/students">
          <el-icon><UserFilled /></el-icon>
          <span>学生管理</span>
        </el-menu-item>

        <el-menu-item index="/teachers">
          <el-icon><Avatar /></el-icon>
          <span>教师管理</span>
        </el-menu-item>

        <el-menu-item index="/teaching-plan">
          <el-icon><Document /></el-icon>
          <span>授课计划</span>
        </el-menu-item>

        <el-menu-item index="/schedule">
          <el-icon><Calendar /></el-icon>
          <span>排课管理</span>
        </el-menu-item>

        <el-menu-item index="/grade">
          <el-icon><Memo /></el-icon>
          <span>成绩管理</span>
        </el-menu-item>

        <el-menu-item index="/leave">
          <el-icon><Clock /></el-icon>
          <span>请假管理</span>
        </el-menu-item>

        <el-menu-item index="/attendance">
          <el-icon><Timer /></el-icon>
          <span>签到管理</span>
        </el-menu-item>

        <el-menu-item index="/statistics">
          <el-icon><DataLine /></el-icon>
          <span>课时统计</span>
        </el-menu-item>

        <el-menu-item index="/settings">
          <el-icon><Setting /></el-icon>
          <span>系统设置</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <!-- 头部 -->
      <el-header>
        <div class="header-left">
          <h2 class="page-title">{{ pageTitle }}</h2>
        </div>
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-avatar size="small" :icon="UserFilled" />
              <span class="username">{{ authStore.userInfo?.name || '用户' }}</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人中心</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 主内容 -->
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import {
  House, User, UserFilled, Avatar, Document,
  Calendar, Clock, Timer, DataLine, Setting,
  ArrowDown, Memo
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const activeMenu = computed(() => route.path)
const pageTitle = computed(() => (route.meta.title as string) || '首页')

const handleCommand = (command: string) => {
  if (command === 'logout') {
    authStore.logout()
    router.push('/login')
  } else if (command === 'profile') {
    // TODO: 个人中心
  }
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid var(--border);
}

.logo-text {
  font-size: 20px;
  font-weight: 700;
  color: var(--accent);
  margin-right: 4px;
}

.logo-sub {
  font-size: 12px;
  color: var(--text-muted);
}

.sidebar-menu {
  border-right: none;
}

.header-left {
  display: flex;
  align-items: center;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.user-info:hover {
  background-color: var(--bg-hover);
}

.username {
  color: var(--text-primary);
  font-size: 14px;
}

.el-main {
  padding: 20px;
  overflow-y: auto;
}
</style>
