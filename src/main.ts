import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'

const app = createApp(App)

export const pinia = createPinia()

app.use(pinia)

app.mount('#app')
