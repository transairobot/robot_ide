<template>
  <div class="h-full flex flex-col">
    <!-- Tab Header -->
    <div class="px-3 py-2 border-b border-border bg-muted/50">
      <h3 class="text-sm font-medium text-foreground">Assets</h3>
    </div>
    <div class="p-3 border-b border-border">
      <Input v-model="searchQuery" placeholder="Search for asset categories..." class="w-full" @keyup.enter="handleSearch" />
    </div>
    <ScrollArea class="flex-1 p-2">
      <div
        v-for="category in categories"
        :key="category.id"
        class="p-3 mb-2 bg-background rounded-lg border border-border hover:bg-muted transition-colors cursor-pointer"
        @click="selectCategory(category)"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <h4 class="text-sm font-medium text-foreground">{{ category.name }}</h4>
            <p class="text-xs text-muted-foreground mt-1">{{ category.description }}</p>
            <div class="text-xs text-muted-foreground mt-2">
              {{ category.asset_count || 0 }} assets
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
    
    <!-- Pagination Controls -->
    <div class="p-2 border-t border-border flex items-center justify-between">
      <div class="text-xs text-muted-foreground">
        {{ totalItems }} categories
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
          :disabled="currentPage >= totalPages || totalPages === 0"
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
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { 
  fetchRobot3DAssetCategories, 
  searchRobot3DAssetCategories,
  type Robot3DAssetCategory
} from '@/services/robot3dAssetService'
import { 
  type PaginationResponse
} from '@/services/base'
import { useNotificationStore } from '@/stores/notification'

const categories = ref<Robot3DAssetCategory[]>([])
const searchQuery = ref('')
const notificationStore = useNotificationStore()

// Pagination state
const currentPage = ref(1)
const totalPages = ref(1)
const totalItems = ref(0)
const itemsPerPage = ref(10) // Changed from 10 to 5 for easier testing

const handleSearch = async () => {
  if (searchQuery.value.trim()) {
    // Search for categories when there's a search query
    await searchCategories(searchQuery.value, 1)
  } else {
    // Load all categories when search query is empty
    await loadCategories(1)
  }
  currentPage.value = 1
}

const loadCategories = async (page: number = 1) => {
  try {
    const response: PaginationResponse<Robot3DAssetCategory> = await fetchRobot3DAssetCategories(page, itemsPerPage.value)
    categories.value = response.items
    currentPage.value = page
    totalPages.value = response.total_pages
    totalItems.value = response.total
  } catch (error) {
    console.error('Failed to fetch categories:', error)
    notificationStore.showError(`Failed to fetch categories: ${(error as Error).message || 'Unknown error'}`)
  }
}

const searchCategories = async (keyword: string, page: number = 1) => {
  try {
    const response: PaginationResponse<Robot3DAssetCategory> = await searchRobot3DAssetCategories(keyword, page, itemsPerPage.value)
    categories.value = response.items
    currentPage.value = page
    totalPages.value = response.total_pages
    totalItems.value = response.total
  } catch (error) {
    console.error('Failed to search categories:', error)
    notificationStore.showError(`Failed to search categories: ${(error as Error).message || 'Unknown error'}`)
  }
}

const selectCategory = (category: Robot3DAssetCategory) => {
  // This is where you would implement navigation to the assets within this category
  console.log('Selected category:', category)
  // For now, just show a notification
  // notificationStore.showInfo(`Selected category: ${category.name}`)
}

const goToPreviousPage = async () => {
  if (currentPage.value > 1) {
    if (searchQuery.value.trim()) {
      await searchCategories(searchQuery.value, currentPage.value - 1)
    } else {
      await loadCategories(currentPage.value - 1)
    }
  }
}

const goToNextPage = async () => {
  if (currentPage.value < totalPages.value) {
    if (searchQuery.value.trim()) {
      await searchCategories(searchQuery.value, currentPage.value + 1)
    } else {
      await loadCategories(currentPage.value + 1)
    }
  }
}

onMounted(async () => {
  try {
    await loadCategories()
  } catch (error) {
    console.error('Failed to fetch categories:', error)
    notificationStore.showError(`Failed to fetch categories: ${(error as Error).message || 'Unknown error'}`)
  }
})
</script>
