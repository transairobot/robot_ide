import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Notification {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration?: number
}

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref<Notification[]>([])

  const addNotification = (notification: Omit<Notification, 'id'>): void => {
    const id = Date.now().toString()
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration || 10000
    }
    
    notifications.value.push(newNotification)
    
    // Auto remove after duration
    setTimeout(() => {
      removeNotification(id)
    }, newNotification.duration)
  }

  const removeNotification = (id: string): void => {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }

  const showSuccess = (message: string, duration?: number): void => {
    addNotification({ message, type: 'success', duration })
  }

  const showError = (message: string, duration?: number): void => {
    addNotification({ message, type: 'error', duration })
  }

  return {
    notifications,
    addNotification,
    removeNotification,
    showSuccess,
    showError
  }
})
