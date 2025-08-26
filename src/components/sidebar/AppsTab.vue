<template>
  <div class="h-full flex flex-col">
    <!-- Tab Header -->
    <div class="px-3 py-2 border-b border-border bg-muted/50">
      <h3 class="text-sm font-medium text-foreground">Apps</h3>
    </div>
    <div class="p-3 border-b border-border">
      <Button size="sm" class="w-full">
        <Plus class="w-4 h-4 mr-1" />
        Install App
      </Button>
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
            <div class="flex items-center gap-2 mt-2">
              <span class="text-xs text-muted-foreground">v{{ app.version }}</span>
              <span
                :class="[
                  'text-xs px-2 py-0.5 rounded-full',
                  app.installed
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                ]"
              >
                {{ app.installed ? 'Installed' : 'Available' }}
              </span>
            </div>
          </div>
          <div class="flex flex-col gap-1">
            <Button
              v-if="!app.installed"
              size="sm"
              variant="outline"
              class="h-6 px-2 text-xs"
            >
              <Download class="w-3 h-3" />
            </Button>
            <Button
              v-else
              size="sm"
              variant="outline"
              class="h-6 px-2 text-xs text-destructive hover:text-destructive"
            >
              <Trash2 class="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    </ScrollArea>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Button from '@/components/ui/Button.vue'
import ScrollArea from '@/components/ui/ScrollArea.vue'
import { Plus, Download, Trash2 } from 'lucide-vue-next'

interface StoreItem {
  id: string
  name: string
  description: string
  version?: string
  installed?: boolean
}

const robotApps = ref<StoreItem[]>([
  { id: "1", name: "Path Planning", description: "Advanced path planning algorithms", version: "1.0.2", installed: true },
  { id: "2", name: "Object Detection", description: "Real-time object detection", version: "2.1.0", installed: false },
  { id: "3", name: "SLAM Navigation", description: "Simultaneous localization and mapping", version: "1.5.3", installed: true },
])
</script>
