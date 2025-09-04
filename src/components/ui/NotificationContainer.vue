<template>
  <div class="fixed top-4 right-4 z-50 space-y-2">
    <div
      v-for="notification in notifications"
      :key="notification.id"
      class="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 min-w-64"
    >
      <CheckCircle class="w-4 h-4" />
      <span class="text-sm">{{ notification.message }}</span>
      <button
        @click="removeNotification(notification.id)"
        class="ml-auto hover:bg-green-600 rounded p-1"
      >
        <X class="w-3 h-3" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CheckCircle, X } from 'lucide-vue-next'
import { useNotificationStore } from '@/stores/notification'
import { storeToRefs } from 'pinia'

const notificationStore = useNotificationStore()
const { notifications } = storeToRefs(notificationStore)
const { removeNotification } = notificationStore
</script>
