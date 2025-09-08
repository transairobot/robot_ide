<template>
  <div class="h-screen w-full flex flex-col bg-background">
    <!-- Top Bar -->
    <div class="h-12 flex-shrink-0">
      <TopBar />
    </div>

    <!-- Main Content Area -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Sidebar -->
      <div :class="[
        'relative flex-shrink-0 flex flex-col',
        sidebarContentCollapsed ? 'w-16' : 'w-80 min-w-[240px] max-w-[800px]'
      ]" ref="sidebarContainerRef">
        <div class="flex-1 overflow-auto">
          <Sidebar @content-collapsed="handleSidebarContentCollapse" @file-selected="handleFileSelected"
            @simulation="handleSimulation" @files-loaded="syncFilesToMuJoCoFS" ref="sidebarRef" 
            :reset-simulation="resetSimulation" :stop-simulation="stopSimulation" />
        </div>
        <!-- Resize Handle (only show when content is not collapsed) -->
        <div v-if="!sidebarContentCollapsed"
          class="absolute right-0 top-0 w-1 h-full bg-border hover:bg-primary/50 transition-colors cursor-col-resize"
          @mousedown="startSidebarResize"></div>
      </div>

      <!-- Main Editor Area -->
      <div class="flex-1 flex flex-col min-h-0 min-w-0">
        <!-- Editor Tabs -->
        <div class="h-10 bg-card border-b border-border flex items-center overflow-x-auto">
          <div class="flex">
            <button v-for="tab in editorTabs" :key="tab.id" @click="setActiveEditorTab(tab.id)"
              @mousedown.middle="closeEditorTab(tab.id)" :class="[
                'px-4 py-2 text-sm border-r border-border flex items-center gap-2 hover:bg-accent transition-colors min-w-0',
                activeEditorTab === tab.id
                  ? 'bg-background text-foreground border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              ]">
              <component :is="getTabIcon(tab.type)" class="w-4 h-4 flex-shrink-0" />
              <span class="truncate">{{ tab.title }}</span>
              <button v-if="tab.closable !== false" @click.stop="closeEditorTab(tab.id)"
                class="ml-1 hover:bg-secondary rounded p-0.5 flex-shrink-0">
                <X class="w-3 h-3" />
              </button>
            </button>
          </div>

          <!-- Add Tab Button -->
          <button @click="showTabMenu = !showTabMenu"
            class="px-2 py-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Add Tab">
            <Plus class="w-4 h-4" />
          </button>

          <!-- Tab Menu -->
          <div v-if="showTabMenu"
            class="absolute top-10 right-4 bg-popover border border-border rounded-md shadow-lg py-1 z-10" @click.stop>
            <button @click="addCanvasTab"
              class="w-full px-3 py-1 text-xs text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-2">
              <Box class="w-3 h-3" />
              New Canvas
            </button>
            <button @click="addTextEditorTab"
              class="w-full px-3 py-1 text-xs text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-2">
              <FileText class="w-3 h-3" />
              New Text Editor
            </button>
            <button @click="add3DViewerTab"
              class="w-full px-3 py-1 text-xs text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-2">
              <Package class="w-3 h-3" />
              New 3D Viewer
            </button>
          </div>
        </div>

        <!-- Editor Content -->
        <div class="flex-1 relative min-h-0">
          <!-- Canvas Tab Content -->
          <div v-for="tab in editorTabs" :key="tab.id" v-show="activeEditorTab === tab.id" class="absolute inset-0">
            <Canvas v-if="tab.type === 'canvas'" :file-path="tab.simulationRobotPath"
              :robot-app-path="tab.simulationRobotAppPath" :scene-path="tab.simulationScenePath"
              :is-active="activeEditorTab === tab.id" :ref="el => setCanvasRef(tab.id, el)" />
            <TextEditor v-else-if="tab.type === 'text'" :content="tab.content" :file-path="tab.filePath"
              @content-change="updateTabContent(tab.id, $event)" />
            <ThreeDViewer v-else-if="tab.type === '3d-viewer'" :file-item="tab.fileItem"
              :is-active="activeEditorTab === tab.id" :ref="el => set3DViewerRef(tab.id, el)" />
          </div>
        </div>

        <template v-if="showConsole">
          <!-- Resize Handle -->
          <div class="h-1 bg-border hover:bg-primary/50 transition-colors cursor-row-resize flex-shrink-0"
            @mousedown="startConsoleResize"></div>

          <!-- Console -->
          <div class="h-64 relative flex-shrink-0" ref="consoleContainerRef" :style="{ height: `${consoleHeight}px` }">
            <Console @close="showConsole = false" />
          </div>
        </template>

        <!-- Console Toggle Button (when console is hidden) -->
        <div v-if="!showConsole"
          class="h-8 bg-card border-t border-border flex items-center justify-center cursor-pointer hover:bg-secondary"
          @click="showConsole = true">
          <Terminal class="w-4 h-4 mr-2" />
          <span class="text-sm">Open Console</span>
        </div>
      </div>
    </div>

    <!-- Status Bar -->
    <div
      class="h-6 bg-card border-t border-border flex items-center justify-between px-3 text-xs text-muted-foreground flex-shrink-0">
      <div class="flex items-center gap-4">
        <div>Ready</div>
        <button @click="syncFilesToMuJoCoFS" class="text-blue-500 hover:text-blue-700">
          Sync Files to MuJoCo
        </button>
      </div>
      <div class="flex items-center gap-4">
        <button class="flex items-center gap-1 hover:text-foreground" @click="showConsole = !showConsole">
          <Terminal class="w-3 h-3" />
          <span>{{ showConsole ? 'Hide Console' : 'Show Console' }}</span>
        </button>
        <div>Robot Simulation IDE</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch, getCurrentInstance } from 'vue'
import TopBar from './TopBar.vue'
import Sidebar from './sidebar'
import Canvas from './editor_tab/Canvas.vue'
import Console from './Console.vue'
import TextEditor from './editor_tab/TextEditor.vue'
import ThreeDViewer from './editor_tab/3DViewer.vue'
import { Terminal, X, Plus, Box, FileText, FileCode, Image, Video, Archive, Package } from 'lucide-vue-next'
import { writeFilesToMuJoCoFS } from '@/mujoco_wasm/MujocoInstance'
import type { FileItem } from "@/stores/workplace"

const sidebarContentCollapsed = ref(false)
const consoleHeight = ref(200)
const showConsole = ref(true)
const sidebarExpandedWidth = ref<number | null>(null) // Track the expanded width

// Editor tabs management
interface EditorTab {
  id: string
  title: string
  type: 'canvas' | 'text' | '3d-viewer'
  content?: string
  filePath?: string
  fileItem?: any // Add fileItem to store the complete file object
  closable?: boolean
  simulationRobotPath?: string // Add simulation file path for canvas tabs
  simulationRobotAppPath?: string,
  simulationScenePath?: string,
}

const editorTabs = ref<EditorTab[]>([])

const activeEditorTab = ref('')
const showTabMenu = ref(false)

// Canvas refs management
const canvasRefs = ref<Map<string, InstanceType<typeof Canvas>>>(new Map())
const threeDViewerRefs = ref<Map<string, InstanceType<typeof ThreeDViewer>>>(new Map())

// References for resizing
const sidebarRef = ref<InstanceType<typeof Sidebar> | null>(null)
const sidebarContainerRef = ref<HTMLElement | null>(null)
const consoleContainerRef = ref<HTMLElement | null>(null)

// Editor tab management functions
const setActiveEditorTab = (tabId: string) => {
  activeEditorTab.value = tabId
  showTabMenu.value = false
}

const closeEditorTab = (tabId: string) => {
  const tabIndex = editorTabs.value.findIndex(tab => tab.id === tabId)
  if (tabIndex === -1) return

  // Don't close if not closable
  if (editorTabs.value[tabIndex].closable === false) return

  // Remove tab
  editorTabs.value.splice(tabIndex, 1)

  // Remove canvas ref if it exists
  canvasRefs.value.delete(tabId)

  // Remove 3D viewer ref if it exists
  threeDViewerRefs.value.delete(tabId)

  // Switch to another tab if the closed tab was active
  if (activeEditorTab.value === tabId) {
    if (editorTabs.value.length > 0) {
      const newActiveIndex = Math.min(tabIndex, editorTabs.value.length - 1)
      activeEditorTab.value = editorTabs.value[newActiveIndex].id
    } else {
      activeEditorTab.value = ''
    }
  }
}

const addCanvasTab = () => {
  const newId = `canvas-${Date.now()}`
  const newTab: EditorTab = {
    id: newId,
    title: `Canvas ${editorTabs.value.filter(t => t.type === 'canvas').length + 1}`,
    type: 'canvas',
    closable: true
  }

  editorTabs.value.push(newTab)
  activeEditorTab.value = newId
  showTabMenu.value = false
}

const addTextEditorTab = () => {
  const newId = `text-${Date.now()}`
  const newTab: EditorTab = {
    id: newId,
    title: 'Untitled',
    type: 'text',
    content: '',
    closable: true
  }

  editorTabs.value.push(newTab)
  activeEditorTab.value = newId
  showTabMenu.value = false
}

const add3DViewerTab = () => {
  const newId = `3d-${Date.now()}`
  const newTab: EditorTab = {
    id: newId,
    title: '3D Viewer',
    type: '3d-viewer',
    closable: true
  }

  editorTabs.value.push(newTab)
  activeEditorTab.value = newId
  showTabMenu.value = false
}

const updateTabContent = (tabId: string, content: string) => {
  const tab = editorTabs.value.find(t => t.id === tabId)
  if (tab) {
    tab.content = content
  }
}

const setCanvasRef = (tabId: string, el: any) => {
  if (el) {
    canvasRefs.value.set(tabId, el)
  }
}

const set3DViewerRef = (tabId: string, el: any) => {
  if (el) {
    threeDViewerRefs.value.set(tabId, el)
  }
}

const getTabIcon = (type: string) => {
  switch (type) {
    case 'canvas':
      return Box
    case 'text':
      return FileText
    case '3d-viewer':
      return Package
    default:
      return FileCode
  }
}

// Handle simulation request from Explorer
const handleSimulation = (fileItem: FileItem, robotAppFile: FileItem | null, scenePath: FileItem | null) => {
  console.log('Creating simulation tab for:', fileItem.path)

  // Check if a simulation tab for this file already exists
  const existingTab = editorTabs.value.find(tab =>
    tab.type === 'canvas' && tab.simulationRobotPath === fileItem.path
  )

  if (existingTab) {
    activeEditorTab.value = existingTab.id
    return
  }

  // Create new canvas tab for simulation
  const newId = `simulation-${Date.now()}`
  const newTab: EditorTab = {
    id: newId,
    title: `Simulation - ${fileItem.name}`,
    type: 'canvas',
    simulationRobotPath: fileItem.path,
    simulationRobotAppPath: robotAppFile ? robotAppFile.path : "",
    simulationScenePath: scenePath ? scenePath.path : "",
    closable: true
  }

  editorTabs.value.push(newTab)
  activeEditorTab.value = newId
}

// Handle file selection from Explorer
const handleFileSelected = (fileItem: any) => {
  if (fileItem.type !== 'file') return

  // Check if file is already open
  const existingTab = editorTabs.value.find(tab => tab.filePath === fileItem.path)
  if (existingTab) {
    activeEditorTab.value = existingTab.id
    return
  }

  // Determine file type and create appropriate tab
  const fileExtension = fileItem.name.split('.').pop()?.toLowerCase()

  if (is3DFile(fileItem.name)) {
    // Create 3D viewer tab for 3D model files
    const newId = `3d-file-${Date.now()}`
    const newTab: EditorTab = {
      id: newId,
      title: fileItem.name,
      type: '3d-viewer',
      filePath: fileItem.path,
      fileItem: fileItem, // Pass the complete FileItem
      closable: true
    }

    editorTabs.value.push(newTab)
    activeEditorTab.value = newId
    console.log('Opening 3D file:', fileItem.name, 'Size:', fileItem.content?.byteLength, 'bytes')
  } else if (isTextFile(fileItem.name)) {
    // Create text editor tab for text files
    let content = ''
    if (fileItem.content) {
      try {
        const decoder = new TextDecoder('utf-8')
        content = decoder.decode(fileItem.content)
      } catch (error) {
        console.warn('Failed to decode file content as text:', error)
        content = '[Binary file - cannot display as text]'
      }
    }

    const newId = `file-${Date.now()}`
    const newTab: EditorTab = {
      id: newId,
      title: fileItem.name,
      type: 'text',
      content: content,
      filePath: fileItem.path,
      closable: true
    }

    editorTabs.value.push(newTab)
    activeEditorTab.value = newId
  } else {
    // For other file types, try to open as text first
    let content = '[Binary file - cannot display as text]'
    if (fileItem.content) {
      try {
        const decoder = new TextDecoder('utf-8')
        content = decoder.decode(fileItem.content)
      } catch (error) {
        console.warn('Failed to decode file content as text:', error)
      }
    }

    const newId = `file-${Date.now()}`
    const newTab: EditorTab = {
      id: newId,
      title: fileItem.name,
      type: 'text',
      content: content,
      filePath: fileItem.path,
      closable: true
    }

    editorTabs.value.push(newTab)
    activeEditorTab.value = newId
  }
}

const resetSimulation = () => {
  // Reset all active canvas instances
  canvasRefs.value.forEach(canvasRef => {
    if (canvasRef && canvasRef.reset) {
      canvasRef.reset()
    }
  })
}

const stopSimulation = () => {
  // Stop all active canvas instances
  canvasRefs.value.forEach(canvasRef => {
    if (canvasRef && canvasRef.stop) {
      canvasRef.stop()
    }
  })
}

/**
 * 同步explorer中的文件到MuJoCo FS
 * @param fileTree - 文件树结构
 */
const syncFilesToMuJoCo = (fileTree: any[]) => {
  // 调用MuJoCo实例的同步方法
  writeFilesToMuJoCoFS(fileTree);
  console.log('文件已同步到MuJoCo FS');
}

/**
 * 从Explorer获取文件树并同步到MuJoCo FS
 */
const syncFilesToMuJoCoFS = async () => {
  console.log("syncFilesToMuJoCoFS")
  // 获取ExplorerTab实例
  const sidebar = sidebarRef.value;
  if (!sidebar) {
    console.warn('无法获取Sidebar引用');
    return;
  }

  // 获取ExplorerTab实例
  const explorerTab = sidebar.getExplorerTab();
  if (!explorerTab) {
    console.warn('无法获取ExplorerTab引用');
    return;
  }

  // 获取文件树
  const fileTree = explorerTab.getFileTree();
  console.log('获取到文件树:', fileTree);

  // 同步文件到MuJoCo FS
  syncFilesToMuJoCo(fileTree);
}

// Helper function to determine if a file is a text file
const isTextFile = (filename: string): boolean => {
  const textExtensions = [
    'txt', 'md', 'json', 'xml', 'yaml', 'yml', 'csv',
    'js', 'ts', 'jsx', 'tsx', 'vue', 'html', 'css', 'scss', 'sass',
    'py', 'cpp', 'c', 'h', 'hpp', 'java', 'cs', 'php', 'rb', 'go', 'rs',
    'sh', 'bat', 'ps1', 'sql', 'log', 'ini', 'conf', 'config',
    'dockerfile', 'gitignore', 'gitattributes', 'editorconfig'
  ]

  const extension = filename.split('.').pop()?.toLowerCase()
  return extension ? textExtensions.includes(extension) : false
}

// Helper function to determine if a file is a 3D model file
const is3DFile = (filename: string): boolean => {
  const threeDExtensions = [
    'obj', 'fbx', 'dae', 'gltf', 'glb', '3ds', 'blend', 'x3d',
    'ply', 'stl', 'off', 'iges', 'step', 'stp', 'brep',
    'urdf', 'xacro', 'sdf', 'world'
  ]

  const extension = filename.split('.').pop()?.toLowerCase()
  return extension ? threeDExtensions.includes(extension) : false
}

// Handle sidebar content collapse state
const handleSidebarContentCollapse = (collapsed: boolean) => {
  const wasCollapsed = sidebarContentCollapsed.value
  sidebarContentCollapsed.value = collapsed

  if (sidebarContainerRef.value) {
    if (collapsed) {
      // When collapsing, save current width and remove inline style
      const currentWidth = sidebarContainerRef.value.offsetWidth
      if (currentWidth > 0 && !wasCollapsed) {
        sidebarExpandedWidth.value = currentWidth
      }
      sidebarContainerRef.value.style.width = ''
    } else if (sidebarExpandedWidth.value) {
      // When expanding, restore the tracked width
      sidebarContainerRef.value.style.width = sidebarExpandedWidth.value + 'px'
    } else {
      // If no tracked width, remove inline style to use CSS classes
      sidebarContainerRef.value.style.width = ''
    }
  }

  // Resize all canvas instances when sidebar content is collapsed/expanded
  nextTick(() => {
    canvasRefs.value.forEach(canvasRef => {
      if (canvasRef && canvasRef.resize) {
        canvasRef.resize()
      }
    })

    threeDViewerRefs.value.forEach(viewerRef => {
      if (viewerRef && viewerRef.resize) {
        viewerRef.resize()
      }
    })
  })
}

// Watch for console visibility changes and resize canvas
watch(showConsole, () => {
  nextTick(() => {
    canvasRefs.value.forEach(canvasRef => {
      if (canvasRef && canvasRef.resize) {
        canvasRef.resize()
      }
    })

    threeDViewerRefs.value.forEach(viewerRef => {
      if (viewerRef && viewerRef.resize) {
        viewerRef.resize()
      }
    })
  })
})

// Watch for sidebar collapse changes to track width
watch(sidebarContentCollapsed, (collapsed) => {
  if (!collapsed && sidebarContainerRef.value) {
    // When expanding, save the current width
    const currentWidth = sidebarContainerRef.value.offsetWidth
    if (currentWidth > 0) {
      sidebarExpandedWidth.value = currentWidth
    }
  }
})

// Close tab menu when clicking outside
const hideTabMenu = () => {
  showTabMenu.value = false
}

onMounted(() => {
  document.addEventListener('click', hideTabMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', hideTabMenu)
})

// Sidebar resizing
const startSidebarResize = (e: MouseEvent) => {
  e.preventDefault()
  const startX = e.clientX
  const startWidth = sidebarContainerRef.value?.offsetWidth || 320

  const doDrag = (e: MouseEvent) => {
    if (!sidebarContainerRef.value) return
    const newWidth = startWidth + (e.clientX - startX)
    const clampedWidth = Math.max(240, Math.min(1000, newWidth))
    sidebarContainerRef.value.style.width = clampedWidth + 'px'

    // Update the tracked expanded width
    if (!sidebarContentCollapsed.value) {
      sidebarExpandedWidth.value = clampedWidth
    }

    // Resize all canvas instances when sidebar is resized
    canvasRefs.value.forEach(canvasRef => {
      if (canvasRef && canvasRef.resize) {
        canvasRef.resize()
      }
    })

    threeDViewerRefs.value.forEach(viewerRef => {
      if (viewerRef && viewerRef.resize) {
        viewerRef.resize()
      }
    })
  }

  const stopDrag = () => {
    // Save the final width when dragging stops
    if (sidebarContainerRef.value && !sidebarContentCollapsed.value) {
      const finalWidth = sidebarContainerRef.value.offsetWidth
      if (finalWidth > 0) {
        sidebarExpandedWidth.value = finalWidth
      }
    }

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

    // Resize all canvas instances when console is resized
    canvasRefs.value.forEach(canvasRef => {
      if (canvasRef && canvasRef.resize) {
        canvasRef.resize()
      }
    })

    threeDViewerRefs.value.forEach(viewerRef => {
      if (viewerRef && viewerRef.resize) {
        viewerRef.resize()
      }
    })
  }

  const stopDrag = () => {
    document.removeEventListener('mousemove', doDrag)
    document.removeEventListener('mouseup', stopDrag)
  }

  document.addEventListener('mousemove', doDrag)
  document.addEventListener('mouseup', stopDrag)
}

onMounted(() => {
  // Initialize the sidebar expanded width
  const initializeSidebarWidth = () => {
    if (sidebarContainerRef.value && !sidebarContentCollapsed.value) {
      // Set initial width if not collapsed
      const currentWidth = sidebarContainerRef.value.offsetWidth
      if (currentWidth > 0) {
        sidebarExpandedWidth.value = currentWidth
      }
    }
  }

  // Initialize on mount
  initializeSidebarWidth()

  // Also initialize after next tick to ensure DOM is fully rendered
  nextTick(initializeSidebarWidth)
})

onUnmounted(() => {
  // Cleanup if needed
})
</script>
