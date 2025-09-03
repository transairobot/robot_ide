import { defineStore } from 'pinia'
import { ref, readonly } from 'vue'

export const useConsoleStore = defineStore('console', () => {
  const lastMessage = ref<{ content: string, id: number } | null>(null)
  let messageId = 0

  function write(content: string) {
    lastMessage.value = { content, id: ++messageId }
  }

  return { lastMessage: readonly(lastMessage), write }
})
