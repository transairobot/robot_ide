<template>
  <div class="h-screen w-full flex flex-col bg-background">
    <!-- Top Bar -->
    <TopBar 
      :sidebar-collapsed="sidebarCollapsed"
      @toggle-sidebar="sidebarCollapsed = !sidebarCollapsed"
    />
    
    <!-- Main Content Area -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Sidebar -->
      <div 
        v-if="!sidebarCollapsed"
        class="w-80 min-w-[240px] max-w-[400px] relative"
      >
        <Sidebar />
        <!-- Resize Handle -->
        <div class="absolute right-0 top-0 w-1 h-full bg-border hover:bg-primary/50 transition-colors cursor-col-resize"></div>
      </div>
      
      <!-- Main Editor Area -->
      <div class="flex-1 flex flex-col">
        <!-- Canvas Area -->
        <div 
          class="flex-1 relative"
          :style="{ height: showConsole ? `${100 - consoleHeight}%` : '100%' }"
        >
          <Canvas />
        </div>
        
        <template v-if="showConsole">
          <!-- Resize Handle -->
          <div 
            class="h-1 bg-border hover:bg-primary/50 transition-colors cursor-row-resize"
            @mousedown="startResize"
          ></div>
          
          <!-- Console -->
          <div 
            class="relative"
            :style="{ height: `${consoleHeight}%` }"
          >
            <Console @close="showConsole = false" />
          </div>
        </template>
      </div>
    </div>
    
    <!-- Status Bar -->
    <div class="h-8 bg-card border-t border-border flex items-center justify-between px-3 text-sm text-muted-foreground">
      <div class="flex items-center gap-4">
        <div>Ready</div>
        <div>Line 1, Column 1</div>
      </div>
      <div class="flex items-center gap-4">
        <button 
          class="flex items-center gap-1.5 hover:text-foreground"
          @click="showConsole = !showConsole"
        >
          <Terminal class="w-4 h-4" />
          <span>Open Console</span>
        </button>
        <div>UTF-8</div>
        <div>LF</div>
        <div>Robot Simulation IDE</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import TopBar from './TopBar.vue'
import Sidebar from './Sidebar.vue'
import Canvas from './Canvas.vue'
import Console from './Console.vue'
import { Terminal } from 'lucide-vue-next'

const sidebarCollapsed = ref(false)
const consoleHeight = ref(25)
const isResizing = ref(false)
const showConsole = ref(true)

const startResize = (e: MouseEvent) => {
  isResizing.value = true
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  e.preventDefault()
}

const handleResize = (e: MouseEvent) => {
  if (!isResizing.value) return
  
  const container = document.querySelector('.flex-1.flex.flex-col') as HTMLElement
  if (!container) return
  
  const rect = container.getBoundingClientRect()
  const mouseY = e.clientY - rect.top
  const newConsoleHeight = Math.max(15, Math.min(50, ((rect.height - mouseY) / rect.height) * 100))
  
  consoleHeight.value = newConsoleHeight
}

const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
}

onMounted(() => {
  // Any initialization logic
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
})
</script>
