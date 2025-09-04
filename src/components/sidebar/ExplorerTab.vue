<template>
  <div class="h-full flex flex-col">
    <!-- Simulation Control Area -->
    <div class="px-2 py-1.5 border-b border-gray-200 bg-gray-50">
      <div class="flex items-center gap-1 mb-1.5">
        <Button
          size="sm"
          variant="outline"
          class="h-6 px-1.5 text-xs font-mono"
          @click="startSimulation"
          :disabled="simulationRunning || !robotFile"
        >
          <Play class="w-3 h-3 mr-1" />
          Run
        </Button>
        <Button
          size="sm"
          variant="outline"
          class="h-6 px-1.5 text-xs font-mono"
          @click="stopSimulation"
          :disabled="!simulationRunning"
        >
          <Square class="w-3 h-3 mr-1" />
          Stop
        </Button>
        <Button
          size="sm"
          variant="outline"
          class="h-6 px-1.5 text-xs font-mono"
          @click="resetSimulation"
          :disabled="!simulationRunning"
        >
          <RefreshCw class="w-3 h-3 mr-1" />
          Reset
        </Button>
      </div>
      
      <!-- Robot Display -->
      <div class="mb-1.5">
        <div class="text-xs text-gray-600 mb-0.5 flex justify-between items-center font-mono">
          <span>Robot:</span>
          <div class="flex gap-0.5">
            <Button
              size="sm"
              variant="ghost"
              class="h-4 w-4 p-0"
              @click="showRobotSelector"
              title="Select Robot"
            >
              <Plus class="w-2.5 h-2.5" />
            </Button>
            <Button
              v-if="robotFile"
              size="sm"
              variant="ghost"
              class="h-4 w-4 p-0"
              @click="removeRobot"
              title="Remove Robot"
            >
              <X class="w-2.5 h-2.5" />
            </Button>
          </div>
        </div>
        <div 
          class="text-xs p-1.5 bg-white border border-gray-200 rounded flex items-center gap-1.5 min-h-6 cursor-pointer hover:bg-gray-50"
          @click="showRobotSelector"
        >
          <Bot class="w-3 h-3 text-gray-500 flex-shrink-0" />
          <span class="truncate font-mono" v-if="robotFile">{{ robotFile.name }}</span>
          <span class="text-gray-400 italic font-mono" v-else>Select robot file</span>
        </div>
      </div>
      
      <!-- Robot App Display -->
      <div>
        <div class="text-xs text-gray-600 mb-0.5 flex justify-between items-center font-mono">
          <span>App:</span>
          <div class="flex gap-0.5">
            <Button
              size="sm"
              variant="ghost"
              class="h-4 w-4 p-0"
              @click="showRobotAppSelector"
              title="Select Robot App"
            >
              <Plus class="w-2.5 h-2.5" />
            </Button>
            <Button
              v-if="robotAppFile"
              size="sm"
              variant="ghost"
              class="h-4 w-4 p-0"
              @click="removeRobotApp"
              title="Remove Robot App"
            >
              <X class="w-2.5 h-2.5" />
            </Button>
          </div>
        </div>
        <div 
          class="text-xs p-1.5 bg-white border border-gray-200 rounded flex items-center gap-1.5 min-h-6 cursor-pointer hover:bg-gray-50"
          @click="showRobotAppSelector"
        >
          <AppWindow class="w-3 h-3 text-gray-500 flex-shrink-0" />
          <span class="truncate font-mono" v-if="robotAppFile">{{ robotAppFile.name }}</span>
          <span class="text-gray-400 italic font-mono" v-else>Select app file</span>
        </div>
      </div>
      
      <!-- Robot Selector Modal -->
      <div
        v-if="showRobotSelectorModal"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        @click.self="closeRobotSelector"
      >
        <div class="bg-card border border-border rounded-lg p-4 min-w-80 max-w-md max-h-96 flex flex-col">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-medium">Select Robot</h3>
            <Button
              size="sm"
              variant="ghost"
              class="h-5 w-5 p-0"
              @click="closeRobotSelector"
            >
              <X class="w-3 h-3" />
            </Button>
          </div>
          
          <ScrollArea class="flex-1">
            <div class="space-y-1">
              <div
                v-for="robot in robotFiles"
                :key="robot.path"
                @click="selectRobot(robot)"
                class="px-2 py-1.5 text-xs rounded flex items-center gap-2 cursor-pointer hover:bg-accent"
                :class="{ 'bg-accent': robotFile?.path === robot.path }"
              >
                <FileText class="w-3 h-3 text-muted-foreground flex-shrink-0" />
                <span class="truncate">{{ robot.name }}</span>
              </div>
              <div v-if="robotFiles.length === 0" class="text-xs text-muted-foreground text-center py-4">
                No robot files found
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
      
      <!-- Robot App Selector Modal -->
      <div
        v-if="showRobotAppSelectorModal"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        @click.self="closeRobotAppSelector"
      >
        <div class="bg-card border border-border rounded-lg p-4 min-w-80 max-w-md max-h-96 flex flex-col">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-medium">Select Robot App</h3>
            <Button
              size="sm"
              variant="ghost"
              class="h-5 w-5 p-0"
              @click="closeRobotAppSelector"
            >
              <X class="w-3 h-3" />
            </Button>
          </div>
          
          <ScrollArea class="flex-1">
            <div class="space-y-1">
              <div
                v-for="app in robotAppFiles"
                :key="app.path"
                @click="selectRobotApp(app)"
                class="px-2 py-1.5 text-xs rounded flex items-center gap-2 cursor-pointer hover:bg-accent"
                :class="{ 'bg-accent': robotAppFile?.path === app.path }"
              >
                <FileCode class="w-3 h-3 text-muted-foreground flex-shrink-0" />
                <span class="truncate">{{ app.name }}</span>
              </div>
              <div v-if="robotAppFiles.length === 0" class="text-xs text-muted-foreground text-center py-4">
                No robot app files found
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
    
    <!-- Tab Header -->
    <div class="px-3 py-2 border-b border-border bg-muted/50">
      <h3 class="text-base font-medium text-foreground">Explorer</h3>
    </div>
    
    <!-- Toolbar -->
    <div class="p-2 border-b border-border flex items-center gap-1.5">
      <Button
        size="sm"
        variant="ghost"
        class="h-7 w-7 p-0"
        @click="refreshFiles"
        title="Refresh"
      >
        <RefreshCw class="w-4 h-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        class="h-7 w-7 p-0"
        @click="createNewFile"
        title="New File"
      >
        <FilePlus class="w-4 h-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        class="h-7 w-7 p-0"
        @click="createNewFolder"
        title="New Folder"
      >
        <FolderPlus class="w-4 h-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        class="h-7 w-7 p-0"
        @click="uploadFiles"
        title="Upload Files"
      >
        <Upload class="w-4 h-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        class="h-7 w-7 p-0"
        @click="uploadFolder"
        title="Upload Folder"
      >
        <FolderUp class="w-4 h-4" />
      </Button>
    </div>

    <!-- File Tree -->
    <ScrollArea class="flex-1">
      <div class="p-1.5">
        <FileTreeNode
          v-for="item in fileTree.getTree()"
          :key="item.path"
          :item="item"
          :level="0"
          @select="selectFile"
          @toggle="toggleFolder"
          @context-menu="showContextMenu"
        />
      </div>
    </ScrollArea>

    <!-- Hidden file input for uploads -->
    <input
      ref="fileInputRef"
      type="file"
      multiple
      class="hidden"
      @change="handleFileUpload"
    />
    
    <!-- Hidden folder input for folder uploads -->
    <input
      ref="folderInputRef"
      type="file"
      webkitdirectory
      multiple
      class="hidden"
      @change="handleFolderUpload"
    />

    <!-- Upload Progress Modal -->
    <div
      v-if="uploadProgress.show"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click.self="cancelUpload"
    >
      <div class="bg-card border border-border rounded-lg p-3 min-w-64 max-w-md">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-medium">{{ uploadProgress.isFolder ? 'Uploading Folder' : 'Uploading Files' }}</h3>
          <Button
            size="sm"
            variant="ghost"
            class="h-5 w-5 p-0"
            @click="cancelUpload"
          >
            <X class="w-3 h-3" />
          </Button>
        </div>
        
        <div class="space-y-2">
          <div class="text-xs text-muted-foreground">
            {{ uploadProgress.current }} / {{ uploadProgress.total }} files
          </div>
          
          <!-- Progress bar -->
          <div class="w-full bg-secondary rounded-full h-1.5">
            <div
              class="bg-primary h-1.5 rounded-full transition-all duration-300"
              :style="{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }"
            ></div>
          </div>
          
          <!-- Current file -->
          <div class="text-xs text-muted-foreground truncate">
            {{ uploadProgress.currentFile }}
          </div>
          
          <!-- Upload speed and ETA -->
          <div class="flex justify-between text-xs text-muted-foreground">
            <span>{{ formatUploadSpeed(uploadProgress.speed) }}</span>
            <span>{{ formatETA(uploadProgress.eta) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Context Menu -->
    <div
      v-if="contextMenu.show"
      :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
      class="fixed z-50 bg-popover border border-border rounded-md shadow-lg py-1 min-w-32"
      @click.stop
    >
      <button
        v-for="action in contextMenuActions"
        :key="action.label"
        @click="executeAction(action.action)"
        class="w-full px-2 py-1 text-xs text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-1.5"
      >
        <component :is="action.icon" class="w-3 h-3" />
        {{ action.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import Button from '@/components/ui/Button.vue'
import ScrollArea from '@/components/ui/ScrollArea.vue'
import FileTreeNode from './FileTreeNode.vue'
import { globalFileTree, type FileItem, FileTree } from './FileTree'
import { 
  RefreshCw, 
  FilePlus, 
  FolderPlus,
  Upload,
  FolderUp,
  Copy,
  Trash2,
  Edit,
  Download,
  Play,
  Square,
  Bot,
  Plus,
  X,
  FileText,
  AppWindow,
  FileCode
} from 'lucide-vue-next'

// Define emits
const emit = defineEmits<{
  'file-selected': [fileItem: FileItem]
  'simulation': [fileItem: FileItem, robotAppFile: FileItem | null, sceneFile: FileItem | null]
  'files-loaded': []
}>()

const fileTree = ref<FileTree>(globalFileTree)
const selectedFile = ref<FileItem | null>(null)
const robotFile = ref<FileItem | null>(null)
const robotAppFile = ref<FileItem | null>(null)
const simulationRunning = ref(false)
const showRobotSelectorModal = ref(false)
const showRobotAppSelectorModal = ref(false)
const robotFiles = ref<FileItem[]>([])
const robotAppFiles = ref<FileItem[]>([])

// File input refs
const fileInputRef = ref<HTMLInputElement | null>(null)
const folderInputRef = ref<HTMLInputElement | null>(null)

// Upload progress state
const uploadProgress = ref({
  show: false,
  isFolder: false,
  current: 0,
  total: 0,
  currentFile: '',
  speed: 0, // bytes per second
  eta: 0, // seconds
  startTime: 0,
  uploadedBytes: 0
})

// Context menu state
const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  item: null as FileItem | null
})

const contextMenuActions = [
  { label: 'Add Robot', icon: Bot, action: 'add-robot' },
  { label: 'Simulation', icon: Play, action: 'simulation' },
  { label: 'Copy', icon: Copy, action: 'copy' },
  { label: 'Rename', icon: Edit, action: 'rename' },
  { label: 'Download', icon: Download, action: 'download' },
  { label: 'Delete', icon: Trash2, action: 'delete' },
]

// Create sample files based on known SO101 structure
const loadDefaultFiles = async () => {
  const files = [
        "SO101/scene.xml",
        "SO101/README.md",
        "SO101/so101_old_calib.xml",
        "SO101/assets/motor_holder_so101_base_v1.part",
        "SO101/assets/rotation_pitch_so101_v1.stl",
        "SO101/assets/base_so101_v2.stl",
        "SO101/assets/upper_arm_so101_v1.part",
        "SO101/assets/upper_arm_so101_v1.stl",
        "SO101/assets/motor_holder_so101_wrist_v1.stl",
        "SO101/assets/moving_jaw_so101_v1.part",
        "SO101/assets/sts3215_03a_no_horn_v1.part",
        "SO101/assets/wrist_roll_pitch_so101_v2.part",
        "SO101/assets/sts3215_03a_v1.part",
        "SO101/assets/under_arm_so101_v1.stl",
        "SO101/assets/sts3215_03a_v1.stl",
        "SO101/assets/wrist_roll_follower_so101_v1.part",
        "SO101/assets/sts3215_03a_no_horn_v1.stl",
        "SO101/assets/motor_holder_so101_wrist_v1.part",
        "SO101/assets/base_motor_holder_so101_v1.stl",
        "SO101/assets/motor_holder_so101_base_v1.stl",
        "SO101/assets/base_motor_holder_so101_v1.part",
        "SO101/assets/rotation_pitch_so101_v1.part",
        "SO101/assets/wrist_roll_follower_so101_v1.stl",
        "SO101/assets/base_so101_v2.part",
        "SO101/assets/wrist_roll_pitch_so101_v2.stl",
        "SO101/assets/waveshare_mounting_plate_so101_v2.stl",
        "SO101/assets/waveshare_mounting_plate_so101_v2.part",
        "SO101/assets/moving_jaw_so101_v1.stl",
        "SO101/assets/under_arm_so101_v1.part",
        "SO101/so101_new_calib.urdf",
        "SO101/joints_properties.xml",
        "SO101/so101_new_calib.xml",
        "SO101/so101_old_cbase_so101_v2alib.urdf",
        "humanoid.xml",
        "just_run_human.wasm",
  ]
    
  // Load each known file
  for (const filepath of files) {
    try {
      const response = await fetch(`/${filepath}`)
      const substrs = filepath.split("/")
      const fileName = substrs[substrs.length - 1]
      if (response.ok) {
        const content = await response.arrayBuffer()
        const fileItem: FileItem = {
          name: fileName,
          path: filepath,
          type: 'file',
          size: content.byteLength,
          modified: new Date(),
          content: content
        }
        
        // Add file to tree
        fileTree.value.addItem(fileItem)
        
        // console.log(`Loaded: ${fileName} (${formatFileSize(content.byteLength)})`)
      }
    } catch (error) {
      console.warn(`Failed to load ${filepath}:`, error)
    }
  }
  
  console.log('Loaded default files')
  emit('files-loaded')
}

const refreshFiles = async () => {
  await loadDefaultFiles()
  console.log('Files refreshed from public/SO101')
}

const createNewFile = async () => {
  const fileName = prompt('Enter file name:')
  if (!fileName) return
  
  const filePath = fileName
  
  // Create empty binary content
  const emptyContent = new ArrayBuffer(0)
  
  const newFile: FileItem = {
    name: fileName,
    path: filePath,
    type: 'file',
    size: 0,
    modified: new Date(),
    content: emptyContent
  }
  
  fileTree.value.addItem(newFile)
  console.log('Created new file:', filePath)
}

const createNewFolder = async () => {
  const folderName = prompt('Enter folder name:')
  if (!folderName) return
  
  const folderPath = folderName
  
  const newFolder: FileItem = {
    name: folderName,
    path: folderPath,
    type: 'folder',
    modified: new Date(),
    children: [],
    expanded: false
  }
  
  fileTree.value.addItem(newFolder)
  console.log('Created new folder:', folderPath)
}

const uploadFiles = () => {
  fileInputRef.value?.click()
}

const uploadFolder = () => {
  folderInputRef.value?.click()
}

const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (!files || files.length === 0) return

  await processUpload(Array.from(files), false)
  
  // Reset input
  target.value = ''
}

const handleFolderUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (!files || files.length === 0) return

  await processUpload(Array.from(files), true)
  
  // Reset input
  target.value = ''
}

const processUpload = async (files: File[], isFolder: boolean) => {
  uploadProgress.value = {
    show: true,
    isFolder,
    current: 0,
    total: files.length,
    currentFile: '',
    speed: 0,
    eta: 0,
    startTime: Date.now(),
    uploadedBytes: 0
  }

  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      uploadProgress.value.current = i + 1
      uploadProgress.value.currentFile = file.name

      // Simulate upload process
      await uploadSingleFile(file, isFolder)
      
      // Update progress
      uploadProgress.value.uploadedBytes += file.size
      updateUploadStats()
    }

    // Upload completed
    uploadProgress.value.show = false
    // No need to refresh from API, files are already added to local tree
    
  } catch (error) {
    console.error('Upload failed:', error)
    uploadProgress.value.show = false
  }
}

const uploadSingleFile = async (file: File, isFolder: boolean): Promise<void> => {
  // Read file content as binary data
  let content: ArrayBuffer | undefined
  try {
    content = await readFileAsBinary(file)
  } catch (error) {
    console.warn('Failed to read file content as binary:', error)
  }
  
  // Create file item for local storage
  const filePath = isFolder ? (file.webkitRelativePath || file.name) : file.name
  
  const fileItem: FileItem = {
    name: file.name,
    path: filePath,
    type: 'file',
    size: file.size,
    modified: new Date(file.lastModified),
    content: content
  }
  
  // Add file to local file tree
  addFileToTree(fileItem, isFolder ? file.webkitRelativePath : undefined)
  
  // Simulate upload delay
  const uploadTime = Math.min(file.size / 1000000, 500) // Max 0.5 seconds per file
  await new Promise(resolve => setTimeout(resolve, uploadTime))
  
  console.log(`Added to local tree: ${file.name} (${formatFileSize(file.size)})`)
}

// Helper function to add file to the local file tree
const addFileToTree = (fileItem: FileItem, relativePath?: string) => {
  fileTree.value.addItem(fileItem)
}

// Helper function to read file content as binary
const readFileAsBinary = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result
      if (result instanceof ArrayBuffer) {
        resolve(result)
      } else {
        reject(new Error('Failed to read file as binary'))
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}

const updateUploadStats = () => {
  const elapsed = (Date.now() - uploadProgress.value.startTime) / 1000
  uploadProgress.value.speed = uploadProgress.value.uploadedBytes / elapsed
  
  const remainingBytes = uploadProgress.value.total * 1024 - uploadProgress.value.uploadedBytes // Rough estimate
  uploadProgress.value.eta = remainingBytes / uploadProgress.value.speed
}

const cancelUpload = () => {
  uploadProgress.value.show = false
  // In a real app, you would also cancel any ongoing requests
}

const formatUploadSpeed = (bytesPerSecond: number): string => {
  if (bytesPerSecond === 0) return '0 B/s'
  
  const k = 1024
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s']
  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k))
  
  return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const formatETA = (seconds: number): string => {
  if (!seconds || !isFinite(seconds)) return 'Calculating...'
  
  if (seconds < 60) {
    return `${Math.round(seconds)}s remaining`
  } else if (seconds < 3600) {
    return `${Math.round(seconds / 60)}m remaining`
  } else {
    return `${Math.round(seconds / 3600)}h remaining`
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const startSimulation = () => {
  if (robotFile.value) {
    simulationRunning.value = true
    console.log('Starting simulation for:', robotFile.value.path)
    emit('simulation', robotFile.value, robotAppFile.value, null)
  }
}

const stopSimulation = () => {
  simulationRunning.value = false
  console.log('Stopping simulation')
}

const resetSimulation = () => {
  simulationRunning.value = false
  console.log('Resetting simulation')
  // Restart simulation if needed
  if (robotFile.value) {
    simulationRunning.value = true
    console.log('Restarting simulation for:', robotFile.value.path)
    emit('simulation', robotFile.value, robotAppFile.value, null)
  }
}

const showRobotSelector = () => {
  // Find all .xml files in the file tree
  const allFiles = fileTree.value.getFlatFileList()
  robotFiles.value = allFiles.filter(file => 
    file.type === 'file' && 
    file.name.endsWith('.xml')
  )
  showRobotSelectorModal.value = true
}

const closeRobotSelector = () => {
  showRobotSelectorModal.value = false
}

const selectRobot = (robot: FileItem) => {
  robotFile.value = robot
  showRobotSelectorModal.value = false
  console.log('Robot selected:', robot.path)
}

const showRobotAppSelector = () => {
  // Find all .wasm files in the file tree
  const allFiles = fileTree.value.getFlatFileList()
  robotAppFiles.value = allFiles.filter(file => 
    file.type === 'file' && 
    file.name.endsWith('.wasm')
  )
  showRobotAppSelectorModal.value = true
}

const closeRobotAppSelector = () => {
  showRobotAppSelectorModal.value = false
}

const selectRobotApp = (app: FileItem) => {
  robotAppFile.value = app
  showRobotAppSelectorModal.value = false
  console.log('Robot app selected:', app.path)
}

const removeRobot = () => {
  robotFile.value = null
  console.log('Robot removed')
}

const removeRobotApp = () => {
  robotAppFile.value = null
  console.log('Robot app removed')
}

const handleSimulation = (item: FileItem) => {
  console.log('Starting simulation for:', item.path)
  robotFile.value = item
  simulationRunning.value = true
  emit('simulation', item, robotAppFile.value, null)
}

const selectFile = async (item: FileItem) => {
  selectedFile.value = item
  console.log('Selected file:', item.path)
  
  // Select file in FileTree
  fileTree.value.selectFile(item.path)
  
  // Emit file selection event to parent
  emit('file-selected', item)
  
  // File content is already loaded as binary data during upload
  if (item.type === 'file' && item.content) {
    console.log('File content available:', item.path, 'Size:', item.content.byteLength, 'bytes')
  }
}

const toggleFolder = (item: FileItem) => {
  fileTree.value.toggleFolder(item.path)
}

const showContextMenu = (event: MouseEvent, item: FileItem) => {
  event.preventDefault()
  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    item
  }
}

const executeAction = async (action: string) => {
  const item = contextMenu.value.item
  if (!item) return

  switch (action) {
    case 'add-robot':
      if (item.type === 'file') {
        robotFile.value = item
        console.log('Robot added:', item.path)
      }
      break
    case 'simulation':
      handleSimulation(item)
      break
    case 'copy':
      // Copy file path to clipboard
      try {
        await navigator.clipboard.writeText(item.path)
        console.log('Copied path to clipboard:', item.path)
      } catch (error) {
        console.error('Failed to copy to clipboard:', error)
      }
      break
      
    case 'rename':
      const newName = prompt('Enter new name:', item.name)
      if (newName && newName !== item.name) {
        const oldPath = item.path
        fileTree.value.renameItem(oldPath, newName)
        console.log('Renamed:', oldPath, 'to', newName)
      }
      break
      
    case 'download':
      if (item.type === 'file' && item.content) {
        // Create and download file from binary content
        const blob = new Blob([item.content])
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = item.name
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        console.log('Downloaded:', item.path)
      } else {
        console.log('Cannot download: file content not available')
      }
      break
      
    case 'delete':
      if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
        removeFileFromTree(item)
        console.log('Deleted:', item.path)
      }
      break
  }
  
  contextMenu.value.show = false
}

// Helper function to remove file from tree
const removeFileFromTree = (itemToRemove: FileItem) => {
  fileTree.value.removeItem(itemToRemove.path)
}

const hideContextMenu = () => {
  contextMenu.value.show = false
}

// 暴露文件树给父组件
defineExpose({
  getFileTree: () => fileTree.value.getTree()
})

onMounted(() => {
  loadDefaultFiles() // Load default files from public/SO101
  document.addEventListener('click', hideContextMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', hideContextMenu)
})
</script>