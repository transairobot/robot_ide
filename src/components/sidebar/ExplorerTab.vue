<template>
  <div class="h-full flex flex-col">
    <!-- Tab Header -->
    <div class="px-3 py-3 border-b border-border bg-muted/50">
      <h3 class="text-lg font-medium text-foreground">Explorer</h3>
    </div>
    
    <!-- Toolbar -->
    <div class="p-3 border-b border-border flex items-center gap-2">
      <Button
        size="sm"
        variant="ghost"
        class="h-8 w-8 p-0"
        @click="refreshFiles"
        title="Refresh"
      >
        <RefreshCw class="w-5 h-5" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        class="h-8 w-8 p-0"
        @click="createNewFile"
        title="New File"
      >
        <FilePlus class="w-5 h-5" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        class="h-8 w-8 p-0"
        @click="createNewFolder"
        title="New Folder"
      >
        <FolderPlus class="w-5 h-5" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        class="h-8 w-8 p-0"
        @click="uploadFiles"
        title="Upload Files"
      >
        <Upload class="w-5 h-5" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        class="h-8 w-8 p-0"
        @click="uploadFolder"
        title="Upload Folder"
      >
        <FolderUp class="w-5 h-5" />
      </Button>
    </div>

    <!-- File Tree -->
    <ScrollArea class="flex-1">
      <div class="p-2">
        <div class="text-base text-muted-foreground mb-3 px-1">{{ currentPath }}</div>
        <FileTreeNode
          v-for="item in fileTree"
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
      <div class="bg-card border border-border rounded-lg p-4 min-w-80 max-w-md">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-medium">{{ uploadProgress.isFolder ? 'Uploading Folder' : 'Uploading Files' }}</h3>
          <Button
            size="sm"
            variant="ghost"
            class="h-6 w-6 p-0"
            @click="cancelUpload"
          >
            <X class="w-3 h-3" />
          </Button>
        </div>
        
        <div class="space-y-3">
          <div class="text-xs text-muted-foreground">
            {{ uploadProgress.current }} / {{ uploadProgress.total }} files
          </div>
          
          <!-- Progress bar -->
          <div class="w-full bg-secondary rounded-full h-2">
            <div
              class="bg-primary h-2 rounded-full transition-all duration-300"
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
        class="w-full px-3 py-1 text-xs text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
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
  X
} from 'lucide-vue-next'

// Define emits
const emit = defineEmits<{
  'file-selected': [fileItem: FileItem]
}>()

interface FileItem {
  name: string
  path: string
  type: 'file' | 'folder'
  size?: number
  modified?: Date
  content?: ArrayBuffer // Binary content for all files
  children?: FileItem[]
  expanded?: boolean
}

const currentPath = ref('/workspace')
const fileTree = ref<FileItem[]>([])
const selectedFile = ref<FileItem | null>(null)

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
  { label: 'Copy', icon: Copy, action: 'copy' },
  { label: 'Rename', icon: Edit, action: 'rename' },
  { label: 'Download', icon: Download, action: 'download' },
  { label: 'Delete', icon: Trash2, action: 'delete' },
]

const refreshFiles = async () => {
  // Files are managed locally, no need to fetch from API
  console.log('Files refreshed locally')
}

const createNewFile = async () => {
  const fileName = prompt('Enter file name:')
  if (!fileName) return
  
  const filePath = `${currentPath.value}/${fileName}`
  
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
  
  fileTree.value.push(newFile)
  console.log('Created new file:', filePath)
}

const createNewFolder = async () => {
  const folderName = prompt('Enter folder name:')
  if (!folderName) return
  
  const folderPath = `${currentPath.value}/${folderName}`
  
  const newFolder: FileItem = {
    name: folderName,
    path: folderPath,
    type: 'folder',
    modified: new Date(),
    children: [],
    expanded: false
  }
  
  fileTree.value.push(newFolder)
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
  const filePath = isFolder 
    ? `${currentPath.value}/${file.webkitRelativePath || file.name}`
    : `${currentPath.value}/${file.name}`
  
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
  if (!relativePath) {
    // Simple file upload to root
    fileTree.value.push(fileItem)
    return
  }
  
  // Handle folder structure
  const pathParts = relativePath.split('/')
  const fileName = pathParts.pop() // Remove filename
  
  if (pathParts.length === 0) {
    // File is in root of uploaded folder
    fileTree.value.push(fileItem)
    return
  }
  
  // Navigate/create folder structure
  let currentLevel = fileTree.value
  let buildPath = currentPath.value
  
  for (const folderName of pathParts) {
    buildPath += `/${folderName}`
    let folder = currentLevel.find(item => item.name === folderName && item.type === 'folder')
    
    if (!folder) {
      // Create folder if it doesn't exist
      folder = {
        name: folderName,
        path: buildPath,
        type: 'folder',
        children: [],
        expanded: true
      }
      currentLevel.push(folder)
    }
    
    currentLevel = folder.children!
  }
  
  // Add file to the final folder
  currentLevel.push(fileItem)
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

// Helper function to convert ArrayBuffer to text (for text files)
const arrayBufferToText = (buffer: ArrayBuffer): string => {
  const decoder = new TextDecoder('utf-8')
  return decoder.decode(buffer)
}

// Helper function to convert text to ArrayBuffer
const textToArrayBuffer = (text: string): ArrayBuffer => {
  const encoder = new TextEncoder()
  return encoder.encode(text).buffer
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

const selectFile = async (item: FileItem) => {
  selectedFile.value = item
  console.log('Selected file:', item.path)
  
  // Emit file selection event to parent
  emit('file-selected', item)
  
  // File content is already loaded as binary data during upload
  if (item.type === 'file' && item.content) {
    console.log('File content available:', item.path, 'Size:', item.content.byteLength, 'bytes')
  }
}

const toggleFolder = (item: FileItem) => {
  if (item.type === 'folder') {
    item.expanded = !item.expanded
  }
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
        const newPath = item.path.replace(item.name, newName)
        item.name = newName
        item.path = newPath
        console.log('Renamed:', item.path, 'to', newPath)
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
  const removeFromArray = (items: FileItem[]): boolean => {
    const index = items.findIndex(item => item.path === itemToRemove.path)
    if (index !== -1) {
      items.splice(index, 1)
      return true
    }
    
    // Search in children
    for (const item of items) {
      if (item.type === 'folder' && item.children) {
        if (removeFromArray(item.children)) {
          return true
        }
      }
    }
    
    return false
  }
  
  removeFromArray(fileTree.value)
}

const hideContextMenu = () => {
  contextMenu.value.show = false
}

onMounted(() => {
  refreshFiles()
  document.addEventListener('click', hideContextMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', hideContextMenu)
})
</script>
