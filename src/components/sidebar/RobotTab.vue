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
          <Button size="sm" variant="outline" class="h-6 px-2 text-xs" title="Add robot to workspace"
            @click="addRobotToWorkspace(robot)">
            <Plus class="w-4 h-4" />
          </Button>
        </div>
      </div>
    </ScrollArea>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import Input from '@/components/ui/Input.vue'
import ScrollArea from '@/components/ui/ScrollArea.vue'
import { Plus } from 'lucide-vue-next'
import { fetchRobots, searchRobots, type Robot, fetchRobotUrl } from '@/services'
import { useFileTreeStore } from '@/stores/fileTree'
import { useNotificationStore } from '@/stores/notification'
const robots = ref<Robot[]>([])
const searchQuery = ref('')
const fileTreeStore = useFileTreeStore()
const notificationStore = useNotificationStore()

const handleSearch = async () => {
  robots.value = await searchRobots(searchQuery.value)
}

const addRobotToWorkspace = async (robot: Robot) => {
  try {
    const fileContent = await fetchRobotUrl(robot)
    fileTreeStore.AddRobot(fileContent)
    notificationStore.showSuccess(`Robot "${robot.name}" added successfully!`)
  } catch (error) {
    console.error(`Failed to add robot ${robot.name} to workspace:`, error)
  }
}


onMounted(async () => {
  robots.value = await fetchRobots()
})
</script>
