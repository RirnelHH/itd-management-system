import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'element-plus/theme-chalk/dark/css-vars.css'
import router from './router'
import App from './App.vue'
import './styles/dark-theme.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
