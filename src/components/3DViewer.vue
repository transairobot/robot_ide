<template>
  <div class="h-full flex flex-col bg-background">
    <!-- Viewer Toolbar -->
    <div class="h-8 bg-muted/50 border-b border-border flex items-center px-3 gap-2">
      <div class="flex items-center gap-1 text-xs text-muted-foreground">
        <span v-if="props.fileItem">{{ props.fileItem.name }}</span>
        <span v-else>3D Viewer</span>
      </div>
      <div class="flex-1"></div>
      <div class="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          class="h-6 px-2 text-xs"
          @click="resetView"
        >
          Reset View
        </Button>
        <Button
          size="sm"
          variant="ghost"
          class="h-6 px-2 text-xs"
          @click="setTopView"
        >
          Top
        </Button>
        <Button
          size="sm"
          variant="ghost"
          class="h-6 px-2 text-xs"
          @click="setFrontView"
        >
          Front
        </Button>
        <Button
          size="sm"
          variant="ghost"
          class="h-6 px-2 text-xs"
          @click="setSideView"
        >
          Side
        </Button>
        <Button
          size="sm"
          variant="ghost"
          class="h-6 px-2 text-xs"
          @click="toggleWireframe"
        >
          {{ wireframe ? 'Solid' : 'Wireframe' }}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          class="h-6 px-2 text-xs"
          @click="toggleGrid"
        >
          {{ showGrid ? 'Hide Grid' : 'Show Grid' }}
        </Button>
      </div>
    </div>

    <!-- 3D Viewer Content -->
    <div class="flex-1 relative">
      <div
        ref="containerRef"
        class="w-full h-full"
      />
      
      <!-- Loading Overlay -->
      <div
        v-if="isLoading"
        class="absolute inset-0 bg-black/50 flex items-center justify-center"
      >
        <div class="text-white text-sm">Loading 3D model...</div>
      </div>
      
      <!-- No Model Overlay -->
      <div
        v-if="!props.fileItem && !isLoading && !hasModel"
        class="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <div class="text-center text-muted-foreground">
          <Box class="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p class="text-lg mb-2">No 3D model loaded</p>
          <p class="text-sm">Select a 3D model file from the Explorer to view it here</p>
        </div>
      </div>
    </div>

    <!-- Status Bar -->
    <div class="h-6 bg-muted/50 border-t border-border flex items-center px-3 text-xs text-muted-foreground">
      <span>Camera: {{ cameraInfo }}</span>
      <div class="flex-1"></div>
      <span v-if="modelInfo">{{ modelInfo }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import Button from '@/components/ui/Button.vue'
import { Box } from 'lucide-vue-next'
import * as THREE from 'three'
import { GLTFLoader } from 'three-stdlib'
import { STLLoader } from 'three-stdlib'
import { OrbitControls } from 'three-stdlib'

interface FileItem {
  name: string
  path: string
  type: 'file' | 'folder'
  size?: number
  modified?: Date
  content?: ArrayBuffer
  children?: FileItem[]
  expanded?: boolean
}

interface Props {
  fileItem?: FileItem
  isActive?: boolean // 添加 isActive prop 来指示标签页是否活跃
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'model-loaded': [success: boolean]
}>()

const containerRef = ref<HTMLDivElement | null>(null)
const isLoading = ref(false)
const wireframe = ref(false)
const showGrid = ref(true)
const hasModel = ref(false)

// Three.js objects
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls // OrbitControls for camera control
let grid: THREE.GridHelper
let animationId: number | null = null

// Loaders
let gltfLoader: GLTFLoader
let stlLoader: STLLoader

let inited = false;
// Loaded model
let loadedModel: THREE.Object3D | null = null

// Model info
const modelInfo = ref('')
const cameraInfo = ref('Position: (0, 0, 5)')

// Initialize Three.js
const initThreeJS = () => {
  if (!containerRef.value) return false
  if (inited) {
    return true;
  }
  inited = true;
  try {
    // Scene
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x2a2a2f)

    // Camera
    camera = new THREE.PerspectiveCamera(
      75,
      containerRef.value.clientWidth / containerRef.value.clientHeight,
      0.1,
      1000
    )
    camera.position.set(5, 5, 5)
    camera.lookAt(0, 0, 0)

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(containerRef.value.clientWidth, containerRef.value.clientHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    containerRef.value.appendChild(renderer.domElement)

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(10, 10, 5)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    scene.add(directionalLight)

    // Grid
    grid = new THREE.GridHelper(10, 10, 0x444444, 0x444444)
    if (showGrid.value) {
      scene.add(grid)
    }

    // Initialize OrbitControls
    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true // 启用阻尼效果
    controls.dampingFactor = 0.05 // 阻尼系数
    controls.screenSpacePanning = false // 禁用屏幕空间平移
    controls.minDistance = 1 // 最小缩放距离
    controls.maxDistance = 100 // 最大缩放距离
    controls.maxPolarAngle = Math.PI // 允许完全垂直旋转
    
    // 设置控制器事件监听
    controls.addEventListener('change', () => {
      updateCameraInfo()
    })

    // Initialize loaders
    gltfLoader = new GLTFLoader()
    stlLoader = new STLLoader()

    console.log('Three.js initialized successfully')
    return true
  } catch (error) {
    console.error('Failed to initialize Three.js:', error)
    return false
  }
}

// Load GLTF model from ArrayBuffer
const loadGLTFFromArrayBuffer = async (data: ArrayBuffer) => {
  let gltf = await gltfLoader.parseAsync(data, "");
  const model = gltf.scene;

  // --- 居中并缩放模型 ---
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = 3 / maxDim; // 目标最大尺寸为 3 单位

  model.position.sub(center); // 居中
  model.scale.set(scale, scale, scale);

  scene.add(model);
}

// Load STL model from ArrayBuffer
const loadSTLFromArrayBuffer = async (data: ArrayBuffer) => {
  // STLLoader can parse ArrayBuffer directly
  const geometry = stlLoader.parse(data)
  
  // Create material for STL
  const material = new THREE.MeshLambertMaterial({ 
    color: 0x888888,
    side: THREE.DoubleSide
  })
  
  // Create mesh
  loadedModel = new THREE.Mesh(geometry, material)
  loadedModel.castShadow = true
  loadedModel.receiveShadow = true
  
  scene.add(loadedModel)
  
  // Center and scale the model
  centerAndScaleModel(loadedModel)
}

// Center and scale model to fit in view
const centerAndScaleModel = (model: THREE.Object3D) => {
  const box = new THREE.Box3().setFromObject(model)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  
  // Center the model
  model.position.sub(center)
  
  // Scale the model to fit in a 4x4x4 box
  const maxDimension = Math.max(size.x, size.y, size.z)
  if (maxDimension > 4) {
    const scale = 4 / maxDimension
    model.scale.setScalar(scale)
  }
  
  console.log('Model centered and scaled:', { center, size, maxDimension })
}

// Load model from FileItem
const loadModelFromFileItem = async (fileItem: FileItem) => {
  if (!fileItem.content) {
    console.error('No content in FileItem')
    return
  }
  
  // Ensure Three.js is initialized
  if (!gltfLoader || !stlLoader || !scene) {
    console.warn('Three.js not initialized yet, initializing now...')
    if (!initThreeJS()) {
      console.error('Failed to initialize Three.js')
      return
    }
  }
  
  isLoading.value = true
  
  try {    
    // Determine file type from file name
    const fileExtension = fileItem.name.split('.').pop()?.toLowerCase() || ''
    
    console.log('Loading model from FileItem:', fileItem.name, 'extension:', fileExtension, 'size:', fileItem.content.byteLength)
    
    if (fileExtension === 'stl') {
      // Load as STL
      await loadSTLFromArrayBuffer(fileItem.content)
      modelInfo.value = `STL: ${fileItem.name} (${fileItem.content.byteLength} bytes)`
    } else if (fileExtension === 'glb' || fileExtension === 'gltf') {
      // Load as GLTF/GLB
      await loadGLTFFromArrayBuffer(fileItem.content)
      modelInfo.value = `${fileExtension.toUpperCase()}: ${fileItem.name} (${fileItem.content.byteLength} bytes)`
    } else {
      throw new Error(`Unsupported file format: ${fileExtension}`)
    }
    
    hasModel.value = true
    emit('model-loaded', true)
    
  } catch (error) {
    console.error('Failed to load model from FileItem:', error)
    emit('model-loaded', false)
  } finally {
    isLoading.value = false
  }
}

// Watch for active state changes
watch(() => props.isActive, (isActive) => {
  if (isActive) {
    // 标签页变为活跃时，启动渲染循环
    startRenderLoop()
    // 启用控制器
    if (controls) {
      controls.enabled = true
    }
  } else {
    // 标签页变为非活跃时，停止渲染循环以节省性能
    stopRenderLoop()
    // 禁用控制器
    if (controls) {
      controls.enabled = false
    }
  }
})

// Watch for model changes (but don't execute immediately)
watch(() => props.fileItem, (newFileItem) => {
  if (newFileItem && newFileItem.content) {
    loadModelFromFileItem(newFileItem)
  }
})

// Render loop
const render = () => {
  if (!renderer || !scene || !camera) return

  // 只在标签页活跃时进行实际渲染
  if (props.isActive) {
    // Update controls (for damping)
    if (controls) {
      controls.update()
    }

    renderer.render(scene, camera)
  }
  
  // 继续动画循环（但只在活跃时实际渲染）
  animationId = requestAnimationFrame(render)
}

// 启动渲染循环
const startRenderLoop = () => {
  if (!animationId) {
    render()
  }
}

// 停止渲染循环
const stopRenderLoop = () => {
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
}

// Toolbar actions
const resetView = () => {
  if (!camera || !controls) return
  
  // 重置相机位置
  camera.position.set(5, 5, 5)
  camera.lookAt(0, 0, 0)
  
  // 重置控制器
  controls.reset()
  
  updateCameraInfo()
}

const toggleWireframe = () => {
  wireframe.value = !wireframe.value
  
  // Apply wireframe to all meshes in scene
  scene.traverse((object: any) => {
    if (object instanceof THREE.Mesh && object.material instanceof THREE.Material) {
      if (Array.isArray(object.material)) {
        object.material.forEach(mat => {
          if ('wireframe' in mat) {
            mat.wireframe = wireframe.value
          }
        })
      } else if ('wireframe' in object.material) {
        object.material.wireframe = wireframe.value
      }
    }
  })
}

const toggleGrid = () => {
  showGrid.value = !showGrid.value
  
  if (showGrid.value) {
    scene.add(grid)
  } else {
    scene.remove(grid)
  }
}

// 视角控制函数
const setTopView = () => {
  if (!camera || !controls) return
  
  camera.position.set(0, 10, 0)
  camera.lookAt(0, 0, 0)
  controls.update()
  updateCameraInfo()
}

const setFrontView = () => {
  if (!camera || !controls) return
  
  camera.position.set(0, 0, 10)
  camera.lookAt(0, 0, 0)
  controls.update()
  updateCameraInfo()
}

const setSideView = () => {
  if (!camera || !controls) return
  
  camera.position.set(10, 0, 0)
  camera.lookAt(0, 0, 0)
  controls.update()
  updateCameraInfo()
}

const updateCameraInfo = () => {
  if (!camera) return
  
  const pos = camera.position
  cameraInfo.value = `Position: (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})`
}

// Resize handler
const resize = () => {
  if (!containerRef.value || !camera || !renderer) return

  const width = containerRef.value.clientWidth
  const height = containerRef.value.clientHeight

  camera.aspect = width / height
  camera.updateProjectionMatrix()

  renderer.setSize(width, height)
}

// Lifecycle
onMounted(() => {
  nextTick(() => {
    console.log('3DViewer mounted, initializing Three.js...')
    if (initThreeJS()) {
      // 只在标签页活跃时启动渲染循环
      if (props.isActive) {
        startRenderLoop()
      }
      console.log('3DViewer initialized successfully')
      
      // Load model if FileItem is provided
      if (props.fileItem && props.fileItem.content) {
        loadModelFromFileItem(props.fileItem)
      }
    } else {
      console.error('Failed to initialize 3DViewer')
    }
    
    window.addEventListener('resize', resize)
  })
})

onUnmounted(() => {
  stopRenderLoop()
  
  if (controls) {
    controls.dispose()
  }
  
  if (renderer) {
    renderer.dispose()
  }
  
  window.removeEventListener('resize', resize)
})

// Expose resize method for parent component
defineExpose({
  resize
})
</script>
