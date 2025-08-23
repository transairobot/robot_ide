<template>
  <div class="h-full bg-gray-900 border border-gray-700 relative overflow-hidden">
    <!-- Canvas Controls -->
    <div class="absolute top-4 right-4 z-10 flex flex-col gap-2">
      <div class="flex gap-1 bg-card/90 backdrop-blur-sm border border-border rounded-md p-1">
        <Button
          size="sm"
          variant="ghost"
          class="h-8 w-8 p-0 hover:bg-secondary"
          @click="handleZoom(0.1)"
        >
          <ZoomIn :size="14" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          class="h-8 w-8 p-0 hover:bg-secondary"
          @click="handleZoom(-0.1)"
        >
          <ZoomOut :size="14" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          class="h-8 w-8 p-0 hover:bg-secondary"
          @click="setZoom(1)"
        >
          <Move3D :size="14" />
        </Button>
      </div>
      
      <div class="flex gap-1 bg-card/90 backdrop-blur-sm border border-border rounded-md p-1">
        <Button
          size="sm"
          :variant="showGrid ? 'secondary' : 'ghost'"
          class="h-8 w-8 p-0"
          @click="showGrid = !showGrid"
        >
          <Grid3x3 :size="14" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          class="h-8 w-8 p-0 hover:bg-secondary"
        >
          <Maximize :size="14" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          class="h-8 w-8 p-0 hover:bg-secondary"
        >
          <Settings :size="14" />
        </Button>
      </div>
    </div>

    <!-- Status Info -->
    <div class="absolute bottom-4 left-4 z-10 bg-card/90 backdrop-blur-sm border border-border rounded-md p-2 text-xs text-foreground">
      <div>Zoom: {{ Math.round(zoom * 100) }}%</div>
      <div>Status: <span class="text-green-500">Running</span></div>
      <div class="text-muted-foreground mt-1">Click to set robot target</div>
    </div>

    <!-- Canvas -->
    <canvas
      ref="canvasRef"
      class="w-full h-full cursor-crosshair"
      style="image-rendering: pixelated"
      @click="handleCanvasClick"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import Button from '@/components/ui/Button.vue'
import { 
  ZoomIn, 
  ZoomOut, 
  Move3D, 
  Grid3x3,
  Maximize,
  Settings
} from 'lucide-vue-next'

const canvasRef = ref<HTMLCanvasElement>()
const zoom = ref(1)
const showGrid = ref(true)
let animationRef: number | null = null

// Robot state
let robotX = 0
let robotY = 0
let robotRotation = 0
let targetX = 0
let targetY = 0

const handleZoom = (delta: number) => {
  zoom.value = Math.max(0.1, Math.min(3, zoom.value + delta))
}

const setZoom = (value: number) => {
  zoom.value = value
}

const handleCanvasClick = (e: MouseEvent) => {
  const canvas = canvasRef.value
  if (!canvas) return
  
  const rect = canvas.getBoundingClientRect()
  targetX = e.clientX - rect.left
  targetY = e.clientY - rect.top
}

const drawGrid = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
  if (!showGrid.value) return
  
  const gridSize = 20 * zoom.value
  const width = canvas.width
  const height = canvas.height
  
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
  ctx.lineWidth = 0.5
  
  // Vertical lines
  for (let x = 0; x <= width; x += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }
  
  // Horizontal lines
  for (let y = 0; y <= height; y += gridSize) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
}

const drawRobot = (ctx: CanvasRenderingContext2D, x: number, y: number, rotation: number) => {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rotation)
  
  // Robot body
  ctx.fillStyle = '#3b82f6'
  ctx.fillRect(-15, -10, 30, 20)
  
  // Robot direction indicator
  ctx.fillStyle = '#60a5fa'
  ctx.beginPath()
  ctx.moveTo(15, 0)
  ctx.lineTo(10, -5)
  ctx.lineTo(10, 5)
  ctx.fill()
  
  ctx.restore()
}

const animate = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  // Clear canvas
  ctx.fillStyle = '#1f2937'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  
  // Draw grid
  drawGrid(ctx, canvas)
  
  // Move robot towards target
  const dx = targetX - robotX
  const dy = targetY - robotY
  const distance = Math.sqrt(dx * dx + dy * dy)
  
  if (distance > 2) {
    robotX += dx * 0.02
    robotY += dy * 0.02
    robotRotation = Math.atan2(dy, dx)
  }
  
  // Draw robot
  drawRobot(ctx, robotX, robotY, robotRotation)
  
  // Draw target
  ctx.strokeStyle = '#10b981'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(targetX, targetY, 8, 0, Math.PI * 2)
  ctx.stroke()
  
  animationRef = requestAnimationFrame(animate)
}

const resizeCanvas = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  
  const container = canvas.parentElement
  if (container) {
    canvas.width = container.clientWidth
    canvas.height = container.clientHeight
    
    // Initialize robot position
    if (robotX === 0 && robotY === 0) {
      robotX = canvas.width / 2
      robotY = canvas.height / 2
      targetX = robotX
      targetY = robotY
    }
  }
}

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return
  
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
  
  animate()
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
  if (animationRef) {
    cancelAnimationFrame(animationRef)
  }
})
</script>
