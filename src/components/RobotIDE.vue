<template>
  <div class="h-screen w-full flex flex-col bg-background">
    <!-- Top Bar -->
    <div class="h-12 flex-shrink-0">
      <TopBar />
    </div>
    
    <!-- Main Content Area -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Sidebar -->
      <div 
        :class="[
          'relative flex-shrink-0 flex flex-col',
          sidebarContentCollapsed ? 'w-16' : 'w-80 min-w-[240px] max-w-[400px]'
        ]"
        ref="sidebarRef"
      >
        <div class="flex-1 overflow-auto">
          <Sidebar @content-collapsed="handleSidebarContentCollapse" />
        </div>
        <!-- Resize Handle (only show when content is not collapsed) -->
        <div 
          v-if="!sidebarContentCollapsed"
          class="absolute right-0 top-0 w-1 h-full bg-border hover:bg-primary/50 transition-colors cursor-col-resize"
          @mousedown="startSidebarResize"
        ></div>
      </div>
      
      <!-- Main Editor Area -->
      <div class="flex-1 flex flex-col min-h-0 min-w-0">
        <!-- Canvas Area -->
        <div 
          class="flex-1 relative min-h-0"
          ref="canvasContainerRef"
        >
          <Canvas ref="canvasRef" />
        </div>
        
        <template v-if="showConsole">
          <!-- Resize Handle -->
          <div 
            class="h-1 bg-border hover:bg-primary/50 transition-colors cursor-row-resize flex-shrink-0"
            @mousedown="startConsoleResize"
          ></div>
          
          <!-- Console -->
          <div 
            class="h-64 relative flex-shrink-0"
            ref="consoleContainerRef"
            :style="{ height: `${consoleHeight}px` }"
          >
            <Console @close="showConsole = false" />
          </div>
        </template>
        
        <!-- Console Toggle Button (when console is hidden) -->
        <div 
          v-if="!showConsole" 
          class="h-8 bg-card border-t border-border flex items-center justify-center cursor-pointer hover:bg-secondary"
          @click="showConsole = true"
        >
          <Terminal class="w-4 h-4 mr-2" />
          <span class="text-sm">Open Console</span>
        </div>
      </div>
    </div>
    
    <!-- Status Bar -->
    <div class="h-6 bg-card border-t border-border flex items-center justify-between px-3 text-xs text-muted-foreground flex-shrink-0">
      <div class="flex items-center gap-4">
        <div>Ready</div>
      </div>
      <div class="flex items-center gap-4">
        <button 
          class="flex items-center gap-1 hover:text-foreground"
          @click="showConsole = !showConsole"
        >
          <Terminal class="w-3 h-3" />
          <span>{{ showConsole ? 'Hide Console' : 'Show Console' }}</span>
        </button>
        <div>Robot Simulation IDE</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import TopBar from './TopBar.vue'
import Sidebar from './Sidebar.vue'
import Canvas from './Canvas.vue'
import Console from './Console.vue'
import { Terminal } from 'lucide-vue-next'

const sidebarContentCollapsed = ref(false)
const consoleHeight = ref(200)
const showConsole = ref(true)

// References for resizing
const sidebarRef = ref<HTMLElement | null>(null)
const canvasContainerRef = ref<HTMLElement | null>(null)
const consoleContainerRef = ref<HTMLElement | null>(null)
const canvasRef = ref<InstanceType<typeof Canvas> | null>(null)

// Handle sidebar content collapse state
const handleSidebarContentCollapse = (collapsed: boolean) => {
  sidebarContentCollapsed.value = collapsed
  
  // Resize canvas when sidebar content is collapsed/expanded
  nextTick(() => {
    if (canvasRef.value) {
      canvasRef.value.resize()
    }
  })
}

// Watch for console visibility changes and resize canvas
watch(showConsole, () => {
  nextTick(() => {
    if (canvasRef.value) {
      canvasRef.value.resize()
    }
  })
})

// Sidebar resizing
const startSidebarResize = (e: MouseEvent) => {
  e.preventDefault()
  const startX = e.clientX
  const startWidth = sidebarRef.value?.offsetWidth || 320
  
  const doDrag = (e: MouseEvent) => {
    if (!sidebarRef.value) return
    const newWidth = startWidth + (e.clientX - startX)
    sidebarRef.value.style.width = Math.max(240, Math.min(400, newWidth)) + 'px'
    
    // Resize canvas when sidebar is resized
    if (canvasRef.value) {
      canvasRef.value.resize()
    }
  }
  
  const stopDrag = () => {
    document.removeEventListener('mousemove', doDrag)
    document.removeEventListener('mouseup', stopDrag)
  }
  
  document.addEventListener('mousemove', doDrag)
  document.addEventListener('mouseup', stopDrag)
}

// Console resizing
const startConsoleResize = (e: MouseEvent) => {
  e.preventDefault()
  const startY = e.clientY
  const startHeight = consoleHeight.value
  
  const doDrag = (e: MouseEvent) => {
    const newHeight = startHeight + (startY - e.clientY)
    consoleHeight.value = Math.max(100, Math.min(400, newHeight))
    
    // Resize canvas when console is resized
    if (canvasRef.value) {
      canvasRef.value.resize()
    }
  }
  
  const stopDrag = () => {
    document.removeEventListener('mousemove', doDrag)
    document.removeEventListener('mouseup', stopDrag)
  }
  
  document.addEventListener('mousemove', doDrag)
  document.addEventListener('mouseup', stopDrag)
}

onMounted(() => {
  // Any initialization logic
})

onUnmounted(() => {
  // Cleanup if needed
})
</script>
