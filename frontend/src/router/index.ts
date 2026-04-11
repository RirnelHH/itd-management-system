import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/login/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/register/Register.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/dashboard'
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/dashboard/Dashboard.vue'),
        meta: { title: '首页' }
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('../views/users/Users.vue'),
        meta: { title: '用户管理', roles: ['ADMIN'] }
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('../views/profile/Profile.vue'),
        meta: { title: '个人中心' }
      },
      {
        path: 'contacts',
        name: 'Contacts',
        component: () => import('../views/contacts/Contacts.vue'),
        meta: { title: '通讯录' }
      },
      {
        path: 'teaching/majors',
        name: 'TeachingMajors',
        component: () => import('../views/teaching/Majors.vue'),
        meta: { title: '专业管理' }
      },
      {
        path: 'teaching/grades',
        name: 'TeachingGrades',
        component: () => import('../views/teaching/Grades.vue'),
        meta: { title: '年级管理' }
      },
      {
        path: 'teaching/courses',
        name: 'TeachingCourses',
        component: () => import('../views/teaching/Courses.vue'),
        meta: { title: '课程管理' }
      },
      {
        path: 'teaching/plans',
        name: 'TeachingPlans',
        component: () => import('../views/teaching/TeachingPlans.vue'),
        meta: { title: '教学计划列表' }
      },
      {
        path: 'teaching/plans/:id',
        name: 'TeachingPlanDetail',
        component: () => import('../views/teaching/TeachingPlanDetail.vue'),
        meta: { title: '教学计划详情' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  const requiresAuth = to.meta.requiresAuth !== false

  await authStore.initializeAuth()

  if (requiresAuth && !authStore.token) {
    return '/login'
  }

  if (to.path === '/login' && authStore.token) {
    return '/dashboard'
  }

  return true
})

export default router
