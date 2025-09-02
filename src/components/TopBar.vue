<template>
  <div class="h-12 bg-card border-b border-border flex items-center justify-between px-4">
    <!-- Left Section -->
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-1">
        <Button variant="ghost" size="sm" class="p-2 h-8 w-8">
          <Menu :size="16" />
        </Button>
        <span class="text-sm font-medium text-foreground">Robot Simulation IDE</span>
      </div>
    </div>

    <!-- Right Section -->
    <div class="flex items-center gap-5">
      <div class="relative">
        <div
          class="p-1 h-10 w-10 flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer"
          @mouseenter="showQR = true" @mouseleave="showQR = false" @click="showLargeImage">
          <XiaoHongshu class="w-8 h-8" />
        </div>
        <!-- Tooltip -->
        <div v-if="showQR" 
          class="absolute top-12 right-0 bg-black bg-opacity-80 text-white text-xs py-1 px-2 rounded z-50">
          点击查看大图
        </div>
        <!-- QR Code Popup -->
        <div v-if="showQR && !showLargeQR"
          class="absolute top-12 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 min-w-max">
          <img src="/xiaohongshu.jpeg" alt="小红书二维码" class="w-50 h-80" />
        </div>
      </div>
      <a href="https://github.com/transairobot/robot_ide" target="_blank" rel="noopener noreferrer"
        class="p-1 h-10 w-10 flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground">
        <GithubIcon class="w-8 h-8" />
      </a>
    </div>
  </div>

  <!-- Large Image Modal -->
  <div v-if="showLargeQR" 
    class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
    @click="showLargeQR = false">
    <div class="relative max-w-4xl max-h-full">
      <img src="/xiaohongshu.jpeg" alt="小红书二维码" class="max-w-full max-h-full object-contain" />
      <button 
        class="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-75"
        @click="showLargeQR = false">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Button from '@/components/ui/Button.vue'
import {
  Menu,
  Play,
  Square,
  RotateCcw,
  Settings,
  Maximize2
} from 'lucide-vue-next'
import GithubIcon from '@/components/icons/GithubIcon.vue'
import XiaoHongshu from '@/components/icons/XiaoHongshu.vue'

const showQR = ref(false)
const showLargeQR = ref(false)

const showLargeImage = () => {
  showLargeQR.value = true
}
</script>
