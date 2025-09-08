<template>
  <div class="h-full flex flex-col">
    <!-- Tab Header -->
    <div class="px-3 py-2 border-b border-border bg-muted/50">
      <h3 class="text-sm font-medium text-foreground">Apps</h3>
    </div>
    <div class="p-3 border-b border-border">
      <Input v-model="searchQuery" placeholder="Search for apps..." class="w-full" @keyup.enter="handleSearch" />
    </div>
    <ScrollArea class="flex-1 p-2">
      <div
        v-for="app in robotApps"
        :key="app.id"
        class="p-3 mb-2 bg-background rounded-lg border border-border hover:bg-muted transition-colors"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <h4 class="text-sm font-medium text-foreground">{{ app.name }}</h4>
            <p class="text-xs text-muted-foreground mt-1">{{ app.description }}</p>
          </div>
          <div class="flex flex-col gap-1">
            <Button
              size="sm"
              variant="outline"
              class="h-6 px-2 text-xs"
            >
              <Download class="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    </ScrollArea>
    
    <!-- Pagination Controls -->
    <div class="p-2 border-t border-border flex items-center justify-between">
      <div class="text-xs text-muted-foreground">
        {{ totalItems }} items
      </div>
      <div class="flex items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          class="h-6 px-2 text-xs"
          :disabled="currentPage <= 1"
          @click="goToPreviousPage"
        >
          <ChevronLeft class="w-4 h-4" />
        </Button>
        <div class="text-xs text-muted-foreground px-2">
          {{ currentPage }} / {{ totalPages }}
        </div>
        <Button
          size="sm"
          variant="outline"
          class="h-6 px-2 text-xs"
          :disabled="currentPage >= totalPages"
          @click="goToNextPage"
        >
          <ChevronRight class="w-4 h-4" />
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import Input from '@/components/ui/Input.vue'
import ScrollArea from '@/components/ui/ScrollArea.vue'
import { Plus, Download, Trash2, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { fetchRobotApps, searchRobotApps, type RobotApp, type PaginationResponse } from '@/services'
import { useNotificationStore } from '@/stores/notification'

interface StoreItem {
  id: string
  name: string
  description: string
}

const robotApps = ref<StoreItem[]>([])
const searchQuery = ref('')
const notificationStore = useNotificationStore()

// Pagination state
const currentPage = ref(1)
const totalPages = ref(1)
const totalItems = ref(0)
const itemsPerPage = ref(10)

const handleSearch = async () => {
  try {
    const response: PaginationResponse<RobotApp> = await searchRobotApps(searchQuery.value, currentPage.value, itemsPerPage.value)
    robotApps.value = response.items
    totalPages.value = response.total_pages
    totalItems.value = response.total
  } catch (error) {
    console.error('Failed to search robot apps:', error)
    notificationStore.showError(`Failed to search robot apps: ${(error as Error).message || 'Unknown error'}`)
  }
}

const loadRobotApps = async (page: number = 1) => {
  try {
    const response: PaginationResponse<RobotApp> = await fetchRobotApps(page, itemsPerPage.value)
    robotApps.value = response.items
    currentPage.value = response.page
    totalPages.value = response.total_pages
    totalItems.value = response.total
  } catch (error) {
    console.error('Failed to fetch robot apps:', error)
    notificationStore.showError(`Failed to fetch robot apps: ${(error as Error).message || 'Unknown error'}`)
  }
}

const goToPreviousPage = () => {
  if (currentPage.value > 1) {
    if (searchQuery.value) {
      handleSearch()
    } else {
      loadRobotApps(currentPage.value - 1)
    }
  }
}

const goToNextPage = () => {
  if (currentPage.value < totalPages.value) {
    if (searchQuery.value) {
      handleSearch()
    } else {
      loadRobotApps(currentPage.value + 1)
    }
  }
}

onMounted(async () => {
  try {
    await loadRobotApps()
  } catch (error) {
    console.error('Failed to fetch robot apps:', error)
    notificationStore.showError(`Failed to fetch robot apps: ${(error as Error).message || 'Unknown error'}`)
  }
})
</script>
