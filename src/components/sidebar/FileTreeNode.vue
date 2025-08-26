<template>
  <div>
    <div
      :class="[
        'flex items-center gap-1 px-1 py-0.5 text-xs rounded cursor-pointer hover:bg-accent/50',
        { 'bg-accent text-accent-foreground': isSelected }
      ]"
      :style="{ paddingLeft: `${level * 12 + 4}px` }"
      @click="handleClick"
      @contextmenu="handleContextMenu"
    >
      <!-- Expand/Collapse Icon -->
      <div class="w-3 h-3 flex items-center justify-center">
        <ChevronRight
          v-if="item.type === 'folder'"
          :class="[
            'w-3 h-3 transition-transform text-muted-foreground',
            { 'rotate-90': item.expanded }
          ]"
        />
      </div>

      <!-- File/Folder Icon -->
      <div class="w-4 h-4 flex items-center justify-center">
        <component :is="getFileIcon(item)" class="w-3 h-3" />
      </div>

      <!-- File/Folder Name -->
      <span class="flex-1 truncate">{{ item.name }}</span>

      <!-- File Size (for files only) -->
      <span v-if="item.type === 'file' && item.size" class="text-xs text-muted-foreground">
        {{ formatFileSize(item.size) }}
      </span>
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
  Settings
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
    case 'json':
    case 'xml':
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
