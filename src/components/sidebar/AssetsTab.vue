<template>
  <div class="h-full flex flex-col">
    <!-- Tab Header -->
    <div class="px-3 py-2 border-b border-border bg-muted/50">
      <h3 class="text-sm font-medium text-foreground">Assets</h3>
    </div>
    <div class="p-3 border-b border-border">
      <Button size="sm" class="w-full">
        <Plus class="w-4 h-4 mr-1" />
        Import Asset
      </Button>
    </div>
    <ScrollArea class="flex-1 p-2">
      <div
        v-for="asset in assets"
        :key="asset.id"
        class="p-3 mb-2 bg-background rounded-lg border border-border hover:bg-muted transition-colors"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <h4 class="text-sm font-medium text-foreground">{{ asset.name }}</h4>
            <p class="text-xs text-muted-foreground mt-1">{{ asset.description }}</p>
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
import { Plus } from 'lucide-vue-next'

interface StoreItem {
  id: string
  name: string
  description: string
}

const assets = ref<StoreItem[]>([
  { id: "1", name: "bottle.stl", description: "A plastic water bottle" },
  { id: "2", name: "desktop.glb", description: "A modern office desk" },
  { id: "3", name: "mug.obj", description: "A ceramic coffee mug" },
])
</script>
