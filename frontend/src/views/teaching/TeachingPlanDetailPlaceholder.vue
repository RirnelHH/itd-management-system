<template>
  <el-card class="placeholder-card">
    <template #header>
      <div class="card-header">
        <div>
          <h2>教学计划详情</h2>
          <p class="placeholder-desc">计划 ID：{{ route.params.id }}</p>
        </div>
        <el-button @click="router.push('/teaching/plans')">返回列表</el-button>
      </div>
    </template>

    <el-empty description="第三批将继续实现教学计划详情编辑器，本批仅保留入口占位。" />
  </el-card>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
</script>

<style scoped>
.placeholder-card {
  border-radius: 12px;
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.placeholder-desc {
  margin-top: 6px;
  color: var(--text-muted);
  font-size: 14px;
}
</style>
