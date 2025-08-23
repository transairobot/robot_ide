<template>
  <div class="h-full bg-card border-t border-border flex flex-col">
    <!-- Console Header -->
    <div class="flex items-center justify-between p-2 border-b border-border bg-muted/50">
      <div class="flex items-center gap-2">
        <Terminal class="w-4 h-4 text-foreground" />
        <span class="text-sm font-medium text-foreground">Console</span>
      </div>
      <div class="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          class="h-6 w-6 p-0 hover:bg-secondary"
          @click="clearConsole"
        >
          <Trash2 class="w-3 h-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          class="h-6 w-6 p-0 hover:bg-secondary"
          @click="exportLogs"
        >
          <Download class="w-3 h-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          class="h-6 w-6 p-0 hover:bg-secondary"
        >
          <X class="w-3 h-3" />
        </Button>
      </div>
    </div>

    <!-- Console Messages -->
    <ScrollArea class="flex-1 overflow-hidden">
      <div 
        ref="scrollAreaRef"
        class="h-full p-2 font-mono text-sm"
      >
        <div
          v-for="message in messages"
          :key="message.id"
          class="mb-1 flex items-start gap-2"
        >
          <span class="text-xs text-muted-foreground min-w-[60px] mt-0.5">
            {{ formatTime(message.timestamp) }}
          </span>
          <div class="flex-1">
            <div
              :class="[
                'whitespace-pre-wrap break-words',
                message.type === 'input' && 'text-blue-400',
                message.type === 'output' && 'text-foreground',
                message.type === 'error' && 'text-red-400',
                message.type === 'system' && 'text-green-400'
              ]"
            >
              <span v-if="message.type === 'input'" class="text-blue-400 mr-1">></span>
              {{ message.content }}
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>

    <!-- Console Input -->
    <div class="border-t border-border p-2">
      <div class="flex items-center gap-2">
        <ChevronRight class="w-4 h-4 text-muted-foreground" />
        <Input
          ref="inputRef"
          v-model="input"
          placeholder="Enter command..."
          class="flex-1 bg-transparent border-none outline-none text-sm text-foreground font-mono placeholder:text-muted-foreground"
          @keydown="handleKeyDown"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import ScrollArea from '@/components/ui/ScrollArea.vue'
import { 
  Terminal, 
  X, 
  Trash2, 
  Download,
  ChevronRight
} from 'lucide-vue-next'

interface ConsoleMessage {
  id: string
  type: 'input' | 'output' | 'error' | 'system'
  content: string
  timestamp: Date
}

const messages = ref<ConsoleMessage[]>([
  {
    id: '1',
    type: 'system',
    content: 'Robot Simulation Console v1.0.0',
    timestamp: new Date()
  },
  {
    id: '2',
    type: 'system',
    content: 'Type "help" for available commands',
    timestamp: new Date()
  }
])

const input = ref('')
const commandHistory = ref<string[]>([])
const historyIndex = ref(-1)
const scrollAreaRef = ref<HTMLDivElement>()
const inputRef = ref<HTMLInputElement>()

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  })
}

const scrollToBottom = async () => {
  await nextTick()
  if (scrollAreaRef.value) {
    scrollAreaRef.value.scrollTop = scrollAreaRef.value.scrollHeight
  }
}

const executeCommand = async (command: string) => {
  if (!command.trim()) return

  // Add command to history
  commandHistory.value.push(command)
  historyIndex.value = -1

  // Add input message
  const inputMessage: ConsoleMessage = {
    id: Date.now().toString(),
    type: 'input',
    content: command,
    timestamp: new Date()
  }

  messages.value.push(inputMessage)

  let outputMessage: ConsoleMessage

  // Process command
  const cmd = command.trim().toLowerCase()
  switch (cmd) {
    case 'help':
      outputMessage = {
        id: (Date.now() + 1).toString(),
        type: 'output',
        content: `Available commands:
  help          - Show this help message
  status        - Show robot status
  start         - Start robot simulation
  stop          - Stop robot simulation
  reset         - Reset robot position
  move <x> <y>  - Move robot to position
  clear         - Clear console
  version       - Show version info`,
        timestamp: new Date()
      }
      break
    
    case 'status':
      outputMessage = {
        id: (Date.now() + 1).toString(),
        type: 'output',
        content: `Robot Status:
  Position: (250, 300)
  Orientation: 45°
  Battery: 98%
  Status: Running
  Connected: Yes`,
        timestamp: new Date()
      }
      break
    
    case 'start':
      outputMessage = {
        id: (Date.now() + 1).toString(),
        type: 'output',
        content: 'Robot simulation started successfully',
        timestamp: new Date()
      }
      break
    
    case 'stop':
      outputMessage = {
        id: (Date.now() + 1).toString(),
        type: 'output',
        content: 'Robot simulation stopped',
        timestamp: new Date()
      }
      break
    
    case 'reset':
      outputMessage = {
        id: (Date.now() + 1).toString(),
        type: 'output',
        content: 'Robot position reset to origin (0, 0)',
        timestamp: new Date()
      }
      break
    
    case 'clear':
      messages.value = []
      return
    
    case 'version':
      outputMessage = {
        id: (Date.now() + 1).toString(),
        type: 'output',
        content: 'Robot Simulation Console v1.0.0\nBuilt with Vue.js and TypeScript',
        timestamp: new Date()
      }
      break
    
    default:
      if (cmd.startsWith('move ')) {
        const parts = cmd.split(' ')
        if (parts.length === 3) {
          const x = parseFloat(parts[1])
          const y = parseFloat(parts[2])
          if (!isNaN(x) && !isNaN(y)) {
            outputMessage = {
              id: (Date.now() + 1).toString(),
              type: 'output',
              content: `Moving robot to position (${x}, ${y})`,
              timestamp: new Date()
            }
          } else {
            outputMessage = {
              id: (Date.now() + 1).toString(),
              type: 'error',
              content: 'Invalid coordinates. Usage: move <x> <y>',
              timestamp: new Date()
            }
          }
        } else {
          outputMessage = {
            id: (Date.now() + 1).toString(),
            type: 'error',
            content: 'Invalid syntax. Usage: move <x> <y>',
            timestamp: new Date()
          }
        }
      } else {
        outputMessage = {
          id: (Date.now() + 1).toString(),
          type: 'error',
          content: `Unknown command: ${command}. Type "help" for available commands.`,
          timestamp: new Date()
        }
      }
  }

  messages.value.push(outputMessage)
  await scrollToBottom()
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    executeCommand(input.value)
    input.value = ''
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (commandHistory.value.length > 0) {
      if (historyIndex.value === -1) {
        historyIndex.value = commandHistory.value.length - 1
      } else if (historyIndex.value > 0) {
        historyIndex.value--
      }
      input.value = commandHistory.value[historyIndex.value] || ''
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (historyIndex.value !== -1) {
      if (historyIndex.value < commandHistory.value.length - 1) {
        historyIndex.value++
        input.value = commandHistory.value[historyIndex.value] || ''
      } else {
        historyIndex.value = -1
        input.value = ''
      }
    }
  }
}

const clearConsole = () => {
  messages.value = []
}

const exportLogs = () => {
  const logs = messages.value.map(msg => 
    `[${formatTime(msg.timestamp)}] ${msg.type.toUpperCase()}: ${msg.content}`
  ).join('\n')
  
  const blob = new Blob([logs], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `console-logs-${new Date().toISOString().split('T')[0]}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

onMounted(() => {
  scrollToBottom()
  // Use nextTick to ensure the DOM is updated before focusing
  nextTick(() => {
    if (inputRef.value && typeof inputRef.value.focus === 'function') {
      inputRef.value.focus()
    }
  })
})
</script>
