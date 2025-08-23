<template>
  <div class="h-12 bg-card border-b border-border flex items-center justify-between px-4">
    <!-- Left Section -->
    <div class="flex items-center gap-3">
      <Button
        variant="ghost"
        size="sm"
        @click="$emit('toggleSidebar')"
        class="p-2 h-8 w-8 text-foreground hover:bg-secondary hover:text-primary"
      >
        <PanelLeftOpen v-if="sidebarCollapsed" :size="16" />
        <PanelLeftClose v-else :size="16" />
      </Button>
      
      <div class="flex items-center gap-1">
        <Button variant="ghost" size="sm" class="p-2 h-8 w-8">
          <Menu :size="16" />
        </Button>
        <span class="text-sm font-medium text-foreground">Robot Simulation IDE</span>
      </div>
    </div>

    <!-- Center Section - Simulation Controls -->
    <div class="flex items-center gap-2">
      <Button 
        size="sm" 
        class="bg-green-600 hover:bg-green-700 text-white"
      >
        <Play :size="14" class="mr-1" />
        Start
      </Button>
      <Button 
        variant="secondary" 
        size="sm"
        class="hover:bg-secondary/80"
      >
        <Square :size="14" class="mr-1" />
        Stop
      </Button>
      <Button 
        variant="secondary" 
        size="sm"
        class="hover:bg-secondary/80"
      >
        <RotateCcw :size="14" class="mr-1" />
        Reset
      </Button>
    </div>

    <!-- Right Section -->
    <div class="flex items-center gap-2">
      <Button 
        variant="ghost" 
        size="sm" 
        class="p-2 h-8 w-8 text-foreground hover:bg-secondary"
      >
        <Maximize2 :size="16" />
      </Button>
      <Button 
        variant="ghost" 
        size="sm" 
        class="p-2 h-8 w-8 text-foreground hover:bg-secondary"
      >
        <Settings :size="16" />
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from '@/components/ui/Button.vue'
import { 
  Menu, 
  Play, 
  Square, 
  RotateCcw, 
  Settings, 
  Maximize2,
  PanelLeftOpen,
  PanelLeftClose
} from 'lucide-vue-next'

interface Props {
  sidebarCollapsed: boolean
}

defineProps<Props>()
defineEmits<{
  toggleSidebar: []
}>()
</script>
