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
        <Button size="sm" variant="ghost" class="h-8 w-8 p-0 hover:bg-secondary">
          <Maximize :size="14" />
        </Button>
        <Button size="sm" variant="ghost" class="h-8 w-8 p-0 hover:bg-secondary">
          <Settings :size="14" />
        </Button>
      </div>
    </div>

    <!-- Status Info -->
    <div
      class="absolute bottom-4 left-4 z-10 bg-card/90 backdrop-blur-sm border border-border rounded-md p-2 text-xs text-foreground">
      <div>Status: <span :class="{ 'text-green-500': isModelLoaded, 'text-yellow-500': !isModelLoaded }">
          {{ isModelLoaded ? 'Model Loaded' : 'Loading Model...' }}
        </span></div>
      <div class="text-muted-foreground mt-1">Use mouse to control view</div>
      <div class="text-muted-foreground mt-1">FPS: <span id="stats-panel">{{ fps }}</span></div>
    </div>

    <!-- Controls Panel -->
    <div v-if="isModelLoaded && actuators.length > 0"
      class="absolute top-4 right-4 z-10 bg-card/90 backdrop-blur-sm border border-border rounded-md text-xs text-foreground max-h-80 overflow-hidden flex flex-col">
      <div class="flex justify-between items-center p-2 bg-secondary cursor-pointer" @click="toggleControlsPanel">
        <div class="text-muted-foreground">Controls</div>
        <div>{{ isJointPanelCollapsed ? '▼' : '▲' }}</div>
      </div>
      <div v-show="!isJointPanelCollapsed" class="overflow-y-auto p-2">
        <div v-for="(actuator, index) in actuators" :key="index" class="mb-3 last:mb-0">
          <div class="text-muted-foreground mb-1">{{ actuator.name }}</div>
          <input type="range" :min="actuator.ctrl_min" :max="actuator.ctrl_max" step="0.01"
            :value="actuatorValues[index] || 0" @input="onActuatorChange(index, $event)" class="w-full" />
          <div class="text-muted-foreground text-xs mt-1">
            Value: {{ (actuatorValues[index] || 0).toFixed(2) }} [{{ actuator.ctrl_min.toFixed(2) }}, {{
              actuator.ctrl_max.toFixed(2) }}]
          </div>
        </div>
      </div>
    </div>

    <!-- Three.js Renderer Container -->
    <div ref="rendererContainerRef" class="w-full h-full" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, shallowRef, watch } from 'vue'
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import Button from '@/components/ui/Button.vue'
import {
  ZoomIn,
  ZoomOut,
  Move3D,
  Grid3x3,
  Maximize,
  Settings
} from 'lucide-vue-next'
import { MuJoCoInstance, ActuatorInfo } from '@/mujoco_wasm/MujocoInstance';
import { WeiruiKernelWorkerClient } from '@/lib/weirui_kernel/worker_client';
import { globalFileTree } from '../sidebar/FileTree';

interface Props {
  filePath?: string
  robotAppPath?: string
  scenePath?: string
  isActive?: boolean
}

const props = defineProps<Props>()

const rendererContainerRef = ref<HTMLDivElement | null>(null);
const isModelLoaded = ref(false);
const fps = ref(0);
const mujocoInstanceRef = shallowRef<MuJoCoInstance | null>(null); // Expose mujocoInstance to template
const weiruiKernelWorkerClient = shallowRef<WeiruiKernelWorkerClient | null>(null);
const actuators = ref<Array<ActuatorInfo>>([]); // Store actuator names and ranges
const actuatorValues = ref<{ [key: number]: number }>({}); // Store actuator values
const isJointPanelCollapsed = ref(false); // Track if joint panel is collapsed
const timestep = ref<number>(0.016); // Default timestep value

// Variables for simulation timing
let simulationInterval: number | null = null;

// Three.js related references
const scene = new THREE.Scene();
let camera: THREE.PerspectiveCamera;
// 创建渲染器
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: "high-performance"
});

// 设置像素比例以避免模糊
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// 设置渲染质量
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
let controls: OrbitControls | null = null;
let animationRef: number | null = null;
let mujocoRenderableData: ReturnType<MuJoCoInstance['getThreeJSRenderableBodies']> | null = null;
const stats: Stats | null = null;

// FPS calculation variables
let lastTime = performance.now();
let frameCount = 0;

const startSimulation = () => {
  if (isModelLoaded.value && !simulationInterval && mujocoInstanceRef.value && timestep.value > 0) {
    simulationInterval = window.setInterval(() => {
      if (mujocoInstanceRef.value) {
        mujocoInstanceRef.value.simulation.step();
      }
    }, timestep.value * 1000);
  }
};

const stopSimulation = () => {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
};

watch(() => props.isActive, (newIsActive) => {
  if (newIsActive) {
    startSimulation();
  } else {
    stopSimulation();
  }
});

// Function to toggle controls panel collapse
const toggleControlsPanel = () => {
  isJointPanelCollapsed.value = !isJointPanelCollapsed.value;
};

// Function to handle actuator slider change
const onActuatorChange = (index: number, event: Event) => {
  const target = event.target as HTMLInputElement;
  const value = parseFloat(target.value);
  actuatorValues.value[index] = value;

  if (mujocoInstanceRef.value) {
    mujocoInstanceRef.value.setActuatorControl(index, value);
  }
};

const resizeRenderer = () => {
  if (rendererContainerRef.value) {
    const container = rendererContainerRef.value;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Initialize camera if not already done
    if (!camera) {
      camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
      camera.position.set(0, 1, 2);
      camera.lookAt(0, 0, 0);
    } else {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    renderer.setSize(width, height);
  }
};

const resetCamera = () => {
  // Reset camera position and controls target
  if (camera) {
    camera.position.set(0, 1, 2);
    camera.lookAt(0, 0, 0);
  }
  if (controls) {
    controls.target.set(0, 0, 0);
    controls.update();
  }
};

// Expose resize method for parent component to call
defineExpose({
  resize: resizeRenderer
});

// Animation loop
const animate = () => {
  animationRef = requestAnimationFrame(animate);

  // Calculate FPS
  frameCount++;
  const currentTime = performance.now();
  if (currentTime >= lastTime + 1000) {
    fps.value = Math.round((frameCount * 1000) / (currentTime - lastTime));
    frameCount = 0;
    lastTime = currentTime;
  }

  // Update Three.js objects
  if (mujocoInstanceRef.value && mujocoRenderableData) {
    // Update the Three.js representation
    mujocoInstanceRef.value.updateThreeJSBodies(mujocoRenderableData);
  }

  // Update controls
  if (controls) {
    controls.update(); // required if controls.enableDamping or controls.autoRotate are set to true
  }

  // Render the scene
  renderer.render(scene, camera);
};

// Watch for filePath changes
watch(() => [props.filePath, props.robotAppPath, props.scenePath], ([newFilePath, newRobotAppPath, newScenePath]) => {
  if (newFilePath) {
    console.log('File path changed, reinitializing MuJoCo with:', newFilePath, newRobotAppPath, newScenePath)
    initializeMuJoCo(newFilePath, newRobotAppPath, newScenePath)
  }
})

// Extract MuJoCo initialization logic
const initializeMuJoCo = async (modelPath: string, robotAppPath?: string, scenePath?: string) => {
  try {
    // Clean up existing instance
    if (mujocoInstanceRef.value) {
      // Clean up previous instance if needed
      mujocoInstanceRef.value = null
    }

    if (weiruiKernelWorkerClient.value) {
      weiruiKernelWorkerClient.value = null;
    }

    // Clear scene
    if (mujocoRenderableData) {
      scene.remove(mujocoRenderableData.mujocoRoot)
      mujocoRenderableData = null
    }

    // Stop simulation interval
    stopSimulation();

    isModelLoaded.value = false

    // Convert file path to MuJoCo FS path format
    let mujocoPath = modelPath

    console.log('Loading MuJoCo model from path:', mujocoPath)

    // Initialize new MuJoCoInstance with all paths
    const instance = new MuJoCoInstance(mujocoPath);

    mujocoInstanceRef.value = instance; // Expose to template

    // Get timestep
    timestep.value = instance.getTimestep();
    console.log('Timestep:', timestep.value);

    // Get actuator names and ranges
    actuators.value = instance.getActuatorInfo();
    console.log('Actuators:', actuators.value);
    let jointInfo = instance.getJointInfo();
    console.log('Joints:', jointInfo);
    for (let i = 0; i < actuators.value.length; i++) {
      // Initialize with a default value, e.g., 0 or the middle of the range
      const actuator = actuators.value[i];
      actuatorValues.value[i] = actuator.ctrl || 0;
    }

    // Get the Three.js renderable objects
    mujocoRenderableData = instance.getThreeJSRenderableBodies();

    // Add the root object to the scene
    scene.add(mujocoRenderableData.mujocoRoot);

    isModelLoaded.value = true;
    let robotAppWasm = globalFileTree.findItemByPath(robotAppPath || '')?.content;
    if (robotAppWasm) {
      const client = new WeiruiKernelWorkerClient(instance);
      client.init(robotAppWasm!)
      weiruiKernelWorkerClient.value = client;
    }

    // Start the simulation loop if active
    if (props.isActive) {
      startSimulation();
    }

  } catch (error) {
    console.error("Failed to load MuJoCo model:", error);
    isModelLoaded.value = false;
  }
}

onMounted(async () => {
  if (rendererContainerRef.value) {
    // Append the renderer's DOM element to the container
    rendererContainerRef.value.appendChild(renderer.domElement);

    // Set initial size
    resizeRenderer();

    // Add window resize listener
    window.addEventListener('resize', resizeRenderer);

    // Initialize OrbitControls after camera is created
    if (camera) {
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
      controls.dampingFactor = 0.05;
      controls.screenSpacePanning = false;
      controls.minDistance = 0.5;
      controls.maxDistance = 10;
    }

    // Initialize MuJoCo with provided file path or default
    const modelPath = props.filePath || "/SO101/so101_new_calib.xml"
    await initializeMuJoCo(modelPath, props.robotAppPath, props.scenePath)

    // Start the animation loop
    animate();
  }
});

onUnmounted(() => {
  // Clean up resources
  window.removeEventListener('resize', resizeRenderer);

  if (animationRef) {
    cancelAnimationFrame(animationRef);
  }

  stopSimulation();

  if (controls) {
    controls.dispose();
  }

  // Dispose of Three.js objects if necessary
  // This is a basic cleanup, you might need to dispose of geometries, materials, etc. more thoroughly
  renderer.dispose();

  // Clean up mujocoInstanceRef
  if (mujocoInstanceRef.value) {
    // If there are any specific cleanup methods for MuJoCoInstance, call them here
    mujocoInstanceRef.value = null;
  }

  // Clean up actuators and actuatorValues
  actuators.value = [];
  actuatorValues.value = {};
});
</script>