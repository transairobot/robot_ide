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
      </div>
    </div>

    <!-- Editor Content -->
    <div class="flex-1 relative overflow-hidden">
      <div
        ref="editorRef"
        class="w-full h-full font-mono text-sm"
      />
    </div>

    <!-- Status Bar -->
    <div class="h-6 bg-muted/50 border-t border-border flex items-center px-3 text-xs text-muted-foreground">
      <span>{{ fileType }}</span>
      <div class="flex-1"></div>
      <span>{{ contentLength }} characters</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { CodeJar } from 'codejar'
import Prism from 'prismjs'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-markup'
import 'prismjs/themes/prism.css'
import Button from '@/components/ui/Button.vue'

interface Props {
  content?: string
  filePath?: string
}

const props = withDefaults(defineProps<Props>(), {
  content: ''
})

const emit = defineEmits<{
  'content-change': [content: string]
  'save': [content: string]
}>()

const editorRef = ref<HTMLDivElement | null>(null)
const isModified = ref(false)
let jar: CodeJar | null = null

const contentLength = computed(() => {
  return props.content.length
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
    'json': 'JSON',
    'py': 'Python'
  }
  
  return typeMap[extension || ''] || 'Plain Text'
})

const getLanguage = () => {
  if (!props.filePath) return 'javascript'
  
  const extension = props.filePath.split('.').pop()?.toLowerCase()
  const langMap: Record<string, string> = {
    'js': 'javascript',
    'ts': 'typescript',
    'vue': 'markup',
    'html': 'markup',
    'css': 'css',
    'json': 'json',
    'py': 'python'
  }
  
  return langMap[extension || ''] || 'javascript'
}

const highlight = (editor: HTMLElement) => {
  const code = editor.textContent || ''
  const language = getLanguage()
  
  if (Prism.languages[language]) {
    editor.innerHTML = Prism.highlight(code, Prism.languages[language], language)
  } else {
    editor.textContent = code
  }
}

const saveFile = () => {
  if (!isModified.value || !jar) return
  
  const content = jar.toString()
  emit('save', content)
  isModified.value = false
}

watch(() => props.content, (newContent) => {
  if (jar && jar.toString() !== newContent) {
    jar.updateCode(newContent)
    isModified.value = false
  }
})

onMounted(() => {
  if (!editorRef.value) return
  
  jar = CodeJar(editorRef.value, highlight, {
    tab: '  ',
    indentOn: /[{[]$/,
    addClosing: false
  })
  
  // Prevent line wrapping
  editorRef.value.style.whiteSpace = 'pre'
  editorRef.value.style.overflowX = 'auto'
  
  jar.updateCode(props.content)
  
  jar.onUpdate((code) => {
    isModified.value = code !== props.content
    emit('content-change', code)
  })
  
  // Handle Ctrl+S
  editorRef.value.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      saveFile()
    }
  })
})

onUnmounted(() => {
  if (jar) {
    jar.destroy()
  }
})
</script>

<style>
.codejar-wrap {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  padding: 16px;
  border-radius: 0;
  outline: none;
  overflow: auto;
  height: 100%;
  white-space: pre;
}

.codejar-linenumbers {
  background: hsl(var(--muted) / 0.3);
  color: hsl(var(--muted-foreground));
  padding: 16px 8px;
  border-right: 1px solid hsl(var(--border));
  text-align: right;
  user-select: none;
  min-width: 40px;
}
</style>
