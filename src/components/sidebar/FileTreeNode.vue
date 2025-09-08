<template>
  <div class="relative">
    <!-- Tree lines -->
    <div 
      v-if="level > 0" 
      class="absolute left-0 top-0 bottom-0 w-px bg-gray-300"
      :style="{ left: `${(level - 1) * 16 + 8}px` }"
    ></div>
    
    <!-- Horizontal line to item -->
    <div 
      v-if="level > 0"
      class="absolute top-3 w-1 h-px bg-gray-300"
      :style="{ left: `${(level - 1) * 16 }px` }"
    ></div>

    <div
      :class="[
        'group flex items-center gap-1 px-1 py-0.5 text-xs cursor-pointer hover:bg-blue-50 relative',
        { 'bg-blue-100': isSelected }
      ]"
      :style="{ paddingLeft: `${level * 16 + 4}px` }"
      @click="handleClick"
      @contextmenu="handleContextMenu"
    >
      <!-- Expand/Collapse Icon -->
      <div v-if="item.type === 'folder'" class="w-3 h-3 flex items-center justify-center flex-shrink-0">
        <ChevronRight
          :class="[
            'w-3 h-3 transition-transform text-gray-600',
            { 'rotate-90': item.expanded }
          ]"
        />
      </div>
      <div v-else class="w-0 h-3 flex-shrink-0"></div>

      <!-- File/Folder Icon -->
      <div class="w-4 h-4 flex items-center justify-center flex-shrink-0">
        <component :is="getFileIcon(item)" class="w-3.5 h-3.5" :class="getIconColor(item)" />
      </div>
      
      <!-- File/Folder Name -->
      <span class="truncate text-gray-700 font-mono text-xs">{{ item.name }}</span>

      <!-- Three Dots Menu -->
      <button
        @click.stop="toggleMenu"
        class="w-4 h-4 flex items-center justify-center hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
      >
        <MoreHorizontal class="w-3 h-3" />
      </button>
    </div>

    <!-- Children (for folders) -->
    <div v-if="item.type === 'folder' && item.expanded && item.children">
      <FileTreeNode
        v-for="child in item.children"
        :key="child.path"
        :item="child"
        :level="level + 1"
        @select="$emit('select', $event)"
        @toggle="$emit('toggle', $event)"
        @context-menu="$emit('context-menu', $event, child)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useWorkplaceStore } from '@/stores/workplace'
import type { FileItem } from '@/stores/workplace'
import { 
  ChevronRight,
  Folder,
  FolderOpen,
  File,
  FileText,
  FileCode,
  FileImage,
  FileVideo,
  FileArchive,
  Settings,
  MoreHorizontal,
  CodeXml,
  FileJson
} from 'lucide-vue-next'

interface Props {
  item: FileItem
  level: number
}

const props = defineProps<Props>()
const workplaceStore = useWorkplaceStore()

const emit = defineEmits<{
  select: [item: FileItem]
  toggle: [item: FileItem]
  'context-menu': [event: MouseEvent, item: FileItem]
}>()

const isSelected = computed(() => {
  return workplaceStore.selectedFile?.path === props.item.path
})

const toggleMenu = (event: MouseEvent) => {
  emit('context-menu', event, props.item)
}

const getFileIcon = (item: FileItem) => {
  if (item.type === 'folder') {
    return item.expanded ? FolderOpen : Folder
  }

  const extension = item.name.split('.').pop()?.toLowerCase()
  
  switch (extension) {
    case 'vue':
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
    case 'py':
    case 'cpp':
    case 'c':
    case 'h':
    case 'hpp':
      return FileCode
    case 'txt':
    case 'md':
      return FileText
    case 'json':
      return FileJson
    case 'xml':
      return CodeXml
    case 'yaml':
    case 'yml':
      return FileText
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
    case 'webp':
      return FileImage
    case 'mp4':
    case 'avi':
    case 'mov':
    case 'webm':
      return FileVideo
    case 'zip':
    case 'rar':
    case 'tar':
    case 'gz':
      return FileArchive
    case 'config':
    case 'conf':
    case 'ini':
      return Settings
    case 'ico':
      return FileImage
    case 'wasm':
      return FileCode
    case 'urdf':
      return FileText
    default:
      return File
  }
}

const getIconColor = (item: FileItem) => {
  if (item.type === 'folder') {
    return 'text-yellow-600'
  }

  const extension = item.name.split('.').pop()?.toLowerCase()
  
  switch (extension) {
    case 'vue':
      return 'text-green-600'
    case 'js':
    case 'ts':
      return 'text-yellow-600'
    case 'json':
      return 'text-yellow-500'
    case 'xml':
    case 'urdf':
      return 'text-orange-600'
    case 'md':
      return 'text-blue-600'
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
    case 'webp':
    case 'ico':
      return 'text-purple-600'
    case 'wasm':
      return 'text-purple-700'
    case 'py':
      return 'text-blue-500'
    case 'cpp':
    case 'c':
    case 'h':
    case 'hpp':
      return 'text-blue-700'
    default:
      return 'text-gray-600'
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const handleClick = () => {
  if (props.item.type === 'folder') {
    emit('toggle', props.item)
  } else {
    emit('select', props.item)
  }
}

const handleContextMenu = (event: MouseEvent) => {
  emit('context-menu', event, props.item)
}
</script>