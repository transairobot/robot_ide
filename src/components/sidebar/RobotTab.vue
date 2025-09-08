<template>
  <div class="h-full flex flex-col">
    <!-- Tab Header -->
    <div class="px-3 py-2 border-b border-border bg-muted/50">
      <h3 class="text-sm font-medium text-foreground">Robots</h3>
    </div>
    <div class="p-3 border-b border-border">
      <Input v-model="searchQuery" placeholder="Search for robots..." class="w-full" @keyup.enter="handleSearch" />
    </div>
    <ScrollArea class="flex-1 p-2">
      <div v-for="robot in robots" :key="robot.id"
        class="p-3 mb-2 bg-background rounded-lg border border-border hover:bg-muted transition-colors">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <h4 class="text-sm font-medium text-foreground">{{ robot.name }}</h4>
            <p class="text-xs text-muted-foreground mt-1">{{ robot.description }}</p>
          </div>
          <Button v-if="!isRobotAdded(robot.id)" size="sm" variant="outline" class="h-6 px-2 text-xs" title="Add robot to workspace"
            @click="addRobotToWorkspace(robot)">
            <Plus class="w-4 h-4" />
          </Button>
          <Button v-else size="sm" variant="outline" class="h-6 px-2 text-xs" disabled>
            <Plus class="w-4 h-4" />
          </Button>
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
import { ref, onMounted, computed } from 'vue'
import { Button } from '@/components/ui/button'
import Input from '@/components/ui/Input.vue'
import ScrollArea from '@/components/ui/ScrollArea.vue'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { fetchRobots, searchRobots, type Robot, type PaginationResponse, fetchRobotUrl } from '@/services'
import { useWorkplaceStore } from '@/stores/workplace'
import { useNotificationStore } from '@/stores/notification'
const robots = ref<Robot[]>([])
const searchQuery = ref('')
const workplaceStore = useWorkplaceStore()
const notificationStore = useNotificationStore()

// Pagination state
const currentPage = ref(1)
const totalPages = ref(1)
const totalItems = ref(0)
const itemsPerPage = ref(10)

const isRobotAdded = computed(() => (robotId: string) => {
  return !!workplaceStore.getRobotById(robotId)
})

const handleSearch = async () => {
  try {
    const response: PaginationResponse<Robot> = await searchRobots(searchQuery.value, currentPage.value, itemsPerPage.value)
    robots.value = response.items
    totalPages.value = response.total_pages
    totalItems.value = response.total
  } catch (error) {
    console.error('Failed to search robots:', error)
    notificationStore.showError(`Failed to search robots: ${(error as Error).message || 'Unknown error'}`)
  }
}

const loadRobots = async (page: number = 1) => {
  try {
    const response: PaginationResponse<Robot> = await fetchRobots(page, itemsPerPage.value)
    robots.value = response.items
    currentPage.value = response.page
    totalPages.value = response.total_pages
    totalItems.value = response.total
  } catch (error) {
    console.error('Failed to fetch robots:', error)
    notificationStore.showError(`Failed to fetch robots: ${(error as Error).message || 'Unknown error'}`)
  }
}

const addRobotToWorkspace = async (robot: Robot) => {
  try {
    workplaceStore.addRobot(robot)
    notificationStore.showSuccess(`Robot "${robot.name}" added successfully!`)
  } catch (error) {
    console.error(`Failed to add robot ${robot.name} to workspace:`, error)
    notificationStore.showError(`Add robot "${robot.name}" Failed: ${(error as Error).message || ''}`)
  }
}

const goToPreviousPage = () => {
  if (currentPage.value > 1) {
    if (searchQuery.value) {
      handleSearch()
    } else {
      loadRobots(currentPage.value - 1)
    }
  }
}

const goToNextPage = () => {
  if (currentPage.value < totalPages.value) {
    if (searchQuery.value) {
      handleSearch()
    } else {
      loadRobots(currentPage.value + 1)
    }
  }
}

onMounted(async () => {
  try {
    await loadRobots()
    console.log("robots.value=", robots.value)
  } catch (error) {
    console.error('Failed to fetch robots:', error)
    notificationStore.showError(`Failed to fetch robots: ${(error as Error).message || 'Unknown error'}`)
  }
})
</script>
