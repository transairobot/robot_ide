<template>
  <div class="fixed top-4 right-4 z-50 space-y-2">
    <div
      v-for="notification in notifications"
      :key="notification.id"
      :class="getNotificationClass(notification.type)"
    >
      <component :is="getIconComponent(notification.type)" class="w-4 h-4" />
      <span class="text-sm">{{ notification.message }}</span>
      <button
        @click="removeNotification(notification.id)"
        class="ml-auto hover:opacity-80 rounded p-1"
        :class="getCloseButtonClass(notification.type)"
      >
        <X class="w-3 h-3" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-vue-next'
import { useNotificationStore } from '@/stores/notification'
import { storeToRefs } from 'pinia'
import type { Notification } from '@/stores/notification'

const notificationStore = useNotificationStore()
const { notifications } = storeToRefs(notificationStore)
const { removeNotification } = notificationStore

const getNotificationClass = (type: Notification['type']) => {
  const baseClasses = 'px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 min-w-64'
  
  switch (type) {
    case 'success':
      return `${baseClasses} bg-green-500 text-white`
    case 'error':
      return `${baseClasses} bg-red-500 text-white`
    case 'warning':
      return `${baseClasses} bg-yellow-500 text-white`
    case 'info':
      return `${baseClasses} bg-blue-500 text-white`
    default:
      return `${baseClasses} bg-green-500 text-white`
  }
}

const getCloseButtonClass = (type: Notification['type']) => {
  switch (type) {
    case 'success':
      return 'hover:bg-green-600'
    case 'error':
      return 'hover:bg-red-600'
    case 'warning':
      return 'hover:bg-yellow-600'
    case 'info':
      return 'hover:bg-blue-600'
    default:
      return 'hover:bg-green-600'
  }
}

const getIconComponent = (type: Notification['type']) => {
  switch (type) {
    case 'success':
      return CheckCircle
    case 'error':
      return AlertCircle
    case 'warning':
      return AlertTriangle
    case 'info':
      return Info
    default:
      return CheckCircle
  }
}
</script>
