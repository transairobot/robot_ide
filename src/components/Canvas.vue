<template>
  <div class="h-full bg-gray-900 border border-gray-700 relative overflow-hidden">
    <!-- Canvas Controls -->
    <div class="absolute top-4 right-4 z-10 flex flex-col gap-2">
      <!-- Zoom controls are handled by OrbitControls, but we can keep them for visual consistency if needed -->
      <!-- <div class="flex gap-1 bg-card/90 backdrop-blur-sm border border-border rounded-md p-1">
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
          @click="resetCamera"
        >
          <Move3D :size="14" />
        </Button>
      </div> -->
      
      <div class="flex gap-1 bg-card/90 backdrop-blur-sm border border-border rounded-md p-1">
        <!-- Grid toggle is not directly applicable in 3D, but could control helper visibility -->
        <!-- <Button
          size="sm"
          :variant="showGrid ? 'secondary' : 'ghost'"
          class="h-8 w-8 p-0"
          @click="showGrid = !showGrid"
        >
          <Grid3x3 :size="14" />
        </Button> -->
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
      <div>Status: <span :class="{'text-green-500': isModelLoaded, 'text-yellow-500': !isModelLoaded}">
        {{ isModelLoaded ? 'Model Loaded' : 'Loading Model...' }}
      </span></div>
      <div class="text-muted-foreground mt-1">Use mouse to control view</div>
    </div>

    <!-- Three.js Renderer Container -->
    <div
      ref="rendererContainerRef"
      class="w-full h-full"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, shallowRef } from 'vue'
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Button from '@/components/ui/Button.vue'
import { 
  ZoomIn, 
  ZoomOut, 
  Move3D, 
  Grid3x3,
  Maximize,
  Settings
} from 'lucide-vue-next'
import { MuJoCoInstance } from '@/mujoco_wasm/MujocoInstance';

const rendererContainerRef = ref<HTMLDivElement | null>(null);
const isModelLoaded = ref(false);

// Three.js related references
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
// 创建渲染器
const renderer = new THREE.WebGLRenderer({ 
  antialias: true,
  alpha: true,
  powerPreference: "high-performance"
});

// 设置像素比例以避免模糊
renderer.setPixelRatio(window.devicePixelRatio);

// 设置渲染质量
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
let controls: OrbitControls | null = null;
let animationRef: number | null = null;
let mujocoInstance: MuJoCoInstance | null = null;
let mujocoRenderableData: ReturnType<MuJoCoInstance['getThreeJSRenderableBodies']> | null = null;

// Set up basic scene
scene.background = new THREE.Color(0x1f2937); // Match the background color

// Position the camera
camera.position.set(0, 1, 2);

// Set up renderer
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

// Add some basic lighting if needed (MuJoCo might provide its own)
const ambientLight = new THREE.AmbientLight(0x404040, 2); // soft white light
scene.add(ambientLight);

const resizeRenderer = () => {
  if (rendererContainerRef.value) {
    const container = rendererContainerRef.value;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }
};

const resetCamera = () => {
  // Reset camera position and controls target
  camera.position.set(0, 1, 2);
  camera.lookAt(0, 0, 0);
  if (controls) {
    controls.target.set(0, 0, 0);
    controls.update();
  }
};

// Animation loop
const animate = () => {
  animationRef = requestAnimationFrame(animate);
  
  // Update MuJoCo simulation and Three.js objects
  if (mujocoInstance && mujocoRenderableData) {
    // Step the simulation (you might want to control the timestep)
    mujocoInstance.simulation.step(); 
    // Update the Three.js representation
    mujocoInstance.updateThreeJSBodies(mujocoRenderableData);
  }
  
  // Update controls
  if (controls) {
    controls.update(); // required if controls.enableDamping or controls.autoRotate are set to true
  }
  
  // Render the scene
  renderer.render(scene, camera);
};

onMounted(async () => {
  if (rendererContainerRef.value) {
    // Append the renderer's DOM element to the container
    rendererContainerRef.value.appendChild(renderer.domElement);
    
    // Set initial size
    resizeRenderer();
    
    // Add window resize listener
    window.addEventListener('resize', resizeRenderer);
    
    // Initialize OrbitControls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 0.5;
    controls.maxDistance = 10;
    
    try {
      // Initialize MuJoCoInstance
      mujocoInstance = new MuJoCoInstance();
      await mujocoInstance.init();
      
      // Get the Three.js renderable objects
      mujocoRenderableData = mujocoInstance.getThreeJSRenderableBodies();
      
      // Add the root object to the scene
      scene.add(mujocoRenderableData.mujocoRoot);
      
      isModelLoaded.value = true;
      
      // Start the animation loop
      animate();
    } catch (error) {
      console.error("Failed to load MuJoCo model:", error);
      isModelLoaded.value = false;
    }
  }
});

onUnmounted(() => {
  // Clean up resources
  window.removeEventListener('resize', resizeRenderer);
  
  if (animationRef) {
    cancelAnimationFrame(animationRef);
  }
  
  if (controls) {
    controls.dispose();
  }
  
  // Dispose of Three.js objects if necessary
  // This is a basic cleanup, you might need to dispose of geometries, materials, etc. more thoroughly
  renderer.dispose();
});
</script>
