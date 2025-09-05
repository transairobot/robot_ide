<template>
  <div 
    class="h-full bg-card border-t border-border flex flex-col font-mono"
  >
    <!-- Console Header -->
    <div class="flex items-center justify-between p-2 border-b border-border bg-muted/50">
      <div class="flex items-center gap-2">
        <TerminalIcon class="w-4 h-4 text-foreground" />
        <span class="text-sm font-medium text-foreground">Console</span>
      </div>
      <div class="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          class="h-6 w-6 p-0 hover:bg-secondary"
          @click.stop="clearConsole"
        >
          <Trash2 class="w-3 h-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          class="h-6 w-6 p-0 hover:bg-secondary"
          @click.stop="emit('close')"
        >
          <X class="w-3 h-3" />
        </Button>
      </div>
    </div>

    <!-- Xterm container -->
    <div ref="terminalRef" class="flex-1 overflow-hidden p-1"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useResizeObserver } from '@vueuse/core'
import { Button } from '@/components/ui/button'
import { Terminal as TerminalIcon, X, Trash2 } from 'lucide-vue-next'
import { Terminal } from 'xterm'
import { FitAddon } from '@xterm/addon-fit'
import 'xterm/css/xterm.css'
import { useConsoleStore } from '@/stores/console'

const emit = defineEmits(['close'])

const terminalRef = ref<HTMLDivElement | null>(null)
let term: Terminal
let fitAddon: FitAddon

const consoleStore = useConsoleStore()

const write = (data: string) => {
  consoleStore.write(data)
}

defineExpose({
  write
})

watch(() => consoleStore.lastMessage, (newMessage) => {
  if (newMessage) {
    term.write(newMessage.content)
  }
})

const clearConsole = () => {
  term.clear()
}

onMounted(() => {
  if (!terminalRef.value) return

  term = new Terminal({
    cursorBlink: true,
    fontSize: 14,
    fontFamily: 'monospace',
    theme: {
      background: '#FFFFFF',
      foreground: '#000000',
      cursor: '#000000',
      selectionBackground: '#D3D3D3',
    },
    convertEol: true,
    disableStdin: true,
  })

  fitAddon = new FitAddon()
  term.loadAddon(fitAddon)

  term.open(terminalRef.value)
  fitAddon.fit()

  term.writeln('Robot Simulation Console v1.0.0')

  useResizeObserver(terminalRef, () => {
    fitAddon.fit()
  })
})

onBeforeUnmount(() => {
  term?.dispose()
})
</script>

