<template>
  <el-config-provider :theme="'dark'">
    <router-view />
  </el-config-provider>
</template>

<script setup lang="ts">
import { ElConfigProvider } from 'element-plus'
</script>

<style>
#app {
  width: 100%;
  height: 100%;
}
</style>
