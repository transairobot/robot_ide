<template>
  <div class="h-full flex flex-col bg-background">
    <!-- Editor Toolbar -->
    <div class="h-8 bg-muted/50 border-b border-border flex items-center px-3 gap-2">
      <div class="flex items-center gap-1 text-xs text-muted-foreground">
        <span v-if="filePath">{{ filePath }}</span>
        <span v-else>Untitled</span>
        <span v-if="isModified" class="text-orange-500">●</span>
      </div>
      <div class="flex-1"></div>
      <div class="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          class="h-6 px-2 text-xs"
          @click="saveFile"
          :disabled="!isModified"
        >
          Save
        </Button>
        <Button
          size="sm"
          variant="ghost"
          class="h-6 px-2 text-xs"
          @click="formatCode"
        >
          Format
        </Button>
      </div>
    </div>

    <!-- Editor Content -->
    <div class="flex-1 relative overflow-hidden">
      <!-- Line Numbers -->
      <div
        v-if="showLineNumbers"
        ref="lineNumbersRef"
        class="absolute left-0 top-0 w-14 h-full bg-muted/30 border-r border-border pointer-events-none z-10 overflow-hidden"
      >
        <div 
          class="py-4 px-2 font-mono text-xs text-muted-foreground leading-5 text-right"
          :style="{ transform: `translateY(${-scrollTop}px)` }"
        >
          <div v-for="n in lineCount" :key="n" class="h-5 flex items-center justify-end">
            {{ n }}
          </div>
        </div>
      </div>
      
      <!-- Editor Textarea -->
      <textarea
        ref="editorRef"
        v-model="localContent"
        @input="handleInput"
        @keydown="handleKeydown"
        @scroll="handleScroll"
        :class="[
          'w-full h-full bg-background text-foreground font-mono text-sm resize-none outline-none border-none leading-5',
          showLineNumbers ? 'pl-16' : 'pl-4'
        ]"
        :style="{ 
          paddingTop: '16px', 
          paddingRight: '16px', 
          paddingBottom: '16px'
        }"
        :placeholder="placeholder"
        spellcheck="false"
      />
    </div>

    <!-- Status Bar -->
    <div class="h-6 bg-muted/50 border-t border-border flex items-center px-3 text-xs text-muted-foreground">
      <span>Line {{ currentLine }}, Column {{ currentColumn }}</span>
      <div class="flex-1"></div>
      <span>{{ fileType }}</span>
      <span class="ml-4">{{ contentLength }} characters</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import Button from '@/components/ui/Button.vue'

interface Props {
  content?: string
  filePath?: string
  placeholder?: string
  showLineNumbers?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  content: '',
  placeholder: 'Start typing...',
  showLineNumbers: true
})

const emit = defineEmits<{
  'content-change': [content: string]
  'save': [content: string]
}>()

const editorRef = ref<HTMLTextAreaElement | null>(null)
const lineNumbersRef = ref<HTMLDivElement | null>(null)
const localContent = ref(props.content)
const isModified = ref(false)
const currentLine = ref(1)
const currentColumn = ref(1)
const scrollTop = ref(0)

// Computed properties
const lineCount = computed(() => {
  return localContent.value.split('\n').length
})

const contentLength = computed(() => {
  return localContent.value.length
})

const fileType = computed(() => {
  if (!props.filePath) return 'Plain Text'
  
  const extension = props.filePath.split('.').pop()?.toLowerCase()
  const typeMap: Record<string, string> = {
    'js': 'JavaScript',
    'ts': 'TypeScript',
    'vue': 'Vue',
    'html': 'HTML',
    'css': 'CSS',
    'scss': 'SCSS',
    'json': 'JSON',
    'xml': 'XML',
    'md': 'Markdown',
    'py': 'Python',
    'cpp': 'C++',
    'c': 'C',
    'java': 'Java',
    'php': 'PHP',
    'rb': 'Ruby',
    'go': 'Go',
    'rs': 'Rust',
    'sh': 'Shell',
    'sql': 'SQL',
    'yaml': 'YAML',
    'yml': 'YAML'
  }
  
  return typeMap[extension || ''] || 'Plain Text'
})

// Watch for external content changes
watch(() => props.content, (newContent) => {
  if (newContent !== localContent.value) {
    localContent.value = newContent
    isModified.value = false
  }
})

// Handle scroll synchronization
const handleScroll = () => {
  const textarea = editorRef.value
  if (!textarea) return
  
  scrollTop.value = textarea.scrollTop
}

// Handle input changes
const handleInput = () => {
  isModified.value = localContent.value !== props.content
  emit('content-change', localContent.value)
  updateCursorPosition()
}

// Handle keyboard shortcuts
const handleKeydown = (event: KeyboardEvent) => {
  // Ctrl+S or Cmd+S to save
  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
    event.preventDefault()
    saveFile()
    return
  }
  
  // Tab key handling
  if (event.key === 'Tab') {
    event.preventDefault()
    const textarea = editorRef.value
    if (!textarea) return
    
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    
    // Insert tab or spaces
    const tabChar = '  ' // 2 spaces
    const newContent = localContent.value.substring(0, start) + tabChar + localContent.value.substring(end)
    localContent.value = newContent
    
    // Update cursor position
    nextTick(() => {
      textarea.selectionStart = textarea.selectionEnd = start + tabChar.length
      handleInput()
    })
  }
  
  // Update cursor position on arrow keys
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    nextTick(updateCursorPosition)
  }
}

// Update cursor position
const updateCursorPosition = () => {
  const textarea = editorRef.value
  if (!textarea) return
  
  const cursorPos = textarea.selectionStart
  const textBeforeCursor = localContent.value.substring(0, cursorPos)
  const lines = textBeforeCursor.split('\n')
  
  currentLine.value = lines.length
  currentColumn.value = lines[lines.length - 1].length + 1
}

// Save file
const saveFile = () => {
  if (!isModified.value) return
  
  emit('save', localContent.value)
  isModified.value = false
  console.log('File saved:', props.filePath || 'Untitled')
}

// Format code (basic implementation)
const formatCode = () => {
  // Basic formatting - can be enhanced with proper formatters
  let formatted = localContent.value
  
  // Basic JSON formatting
  if (fileType.value === 'JSON') {
    try {
      const parsed = JSON.parse(formatted)
      formatted = JSON.stringify(parsed, null, 2)
    } catch (error) {
      console.warn('Invalid JSON, cannot format')
      return
    }
  }
  
  // Basic XML formatting (simple)
  if (fileType.value === 'XML') {
    formatted = formatted
      .replace(/></g, '>\n<')
      .replace(/^\s*\n/gm, '')
  }
  
  localContent.value = formatted
  handleInput()
}

// Focus editor on mount
onMounted(() => {
  if (editorRef.value) {
    editorRef.value.focus()
  }
})
</script>

<style scoped>
/* Custom scrollbar for textarea */
textarea::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

textarea::-webkit-scrollbar-track {
  background: hsl(var(--muted));
}

textarea::-webkit-scrollbar-thumb {
  background: hsl(var(--muted-foreground) / 0.3);
  border-radius: 4px;
}

textarea::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground) / 0.5);
}
</style>
