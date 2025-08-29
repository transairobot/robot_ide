<template>
  <div>
    <div
      :class="[
        'group flex items-center gap-2 px-2 py-2 text-base rounded cursor-pointer hover:bg-accent/50',
        { 'bg-accent text-accent-foreground': isSelected }
      ]"
      :style="{ paddingLeft: `${(level) * 16 + 4}px` }"
      @click="handleClick"
      @contextmenu="handleContextMenu"
    >
      <!-- Icon Container (includes Expand/Collapse Icon and File/Folder Icon) -->
      <div class="flex items-center gap-2 flex-1 min-w-0">
        <!-- Expand/Collapse Icon -->
        <div v-if="item.type === 'folder'" class="w-5 h-5 flex items-center justify-center flex-shrink-0">
          <ChevronRight
            :class="[
              'w-5 h-5 transition-transform text-muted-foreground',
              { 'rotate-90': item.expanded }
            ]"
          />
        </div>

        <!-- File Icon-->
        <div v-if="item.type === 'file'" class="w-6 h-6 flex items-center justify-center flex-shrink-0">
          <component :is="getFileIcon(item)" class="w-5 h-5" />
        </div>
        
        <!-- File/Folder Name -->
        <span class="truncate font-medium">{{ item.name }}</span>
      </div>

      <!-- Three Dots Menu -->
      <button
        @click.stop="toggleMenu"
        class="w-6 h-6 flex items-center justify-center hover:bg-accent rounded opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <MoreHorizontal class="w-4 h-4" />
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

interface Props {
  item: FileItem
  level: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  select: [item: FileItem]
  toggle: [item: FileItem]
  'context-menu': [event: MouseEvent, item: FileItem]
}>()

const isSelected = computed(() => {
  // This would be managed by parent component in a real app
  return false
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
    default:
      return File
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