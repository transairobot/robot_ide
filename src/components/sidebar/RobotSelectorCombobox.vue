<template>
  <Combobox v-model:open="open" v-model:value="selectedValue" @update:value="onSelect">
    <ComboboxAnchor class="w-full">
      <div class="relative w-full max-w-sm items-center">
        <ComboboxInput placeholder="Search robot..." class="w-full" @input="handleSearch">
        </ComboboxInput>
        <ComboboxTrigger class="absolute end-0 inset-y-0 flex items-center justify-center px-3">
          <ChevronsUpDown class="size-4 text-muted-foreground" />
        </ComboboxTrigger>
      </div>
    </ComboboxAnchor>

    <ComboboxList v-if="open" :class="['w-[--reka-popper-anchor-width]', 'max-h-60 overflow-y-auto']">
      <ComboboxEmpty />
      <ComboboxGroup>
        <ComboboxItem v-for="robot in filteredRobots" :key="robot.path" :value="robot.path"
          class="px-2 py-1.5 text-xs rounded flex items-center gap-2 cursor-pointer">
          <FileText class="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <span class="truncate">{{ robot.name }}</span>
        </ComboboxItem>
      </ComboboxGroup>
    </ComboboxList>
  </Combobox>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useFileTreeStore } from '@/stores/fileTree'
import type { FileItem } from '@/stores/fileTree'
import {
  Combobox,
  ComboboxAnchor,
  ComboboxList,
  ComboboxInput,
  ComboboxItem,
  ComboboxGroup,
  ComboboxEmpty,
  ComboboxTrigger
} from '@/components/ui/combobox'
import { Bot, FileText, ChevronsUpDown } from 'lucide-vue-next'

interface Props {
  modelValue: FileItem | null
}

interface Emits {
  (e: 'update:modelValue', value: FileItem | null): void
  (e: 'change', value: FileItem | null): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const fileTreeStore = useFileTreeStore()
const open = ref(false)
const searchQuery = ref('')
const selectedValue = ref(props.modelValue?.path || '')
const robotFiles = ref<FileItem[]>([])

// Populate robot files on mount
onMounted(() => {
  updateRobotFiles()
})

// Update robot files list
const updateRobotFiles = () => {
  const allFiles = fileTreeStore.getFlatFileList()
  robotFiles.value = allFiles.filter(file =>
    file.type === 'folder' &&
    file.name.endsWith('.robot')
  )
}

// Filter robots based on search query
const filteredRobots = computed(() => {
  if (!searchQuery.value) {
    return robotFiles.value
  }
  return robotFiles.value.filter(robot =>
    robot.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

// Computed property for selected robot
const selectedRobot = computed(() => {
  if (!selectedValue.value) return null
  return robotFiles.value.find(robot => robot.path === selectedValue.value) || null
})

// Handle search input
const handleSearch = (event: Event) => {
  const target = event.target as HTMLInputElement
  searchQuery.value = target.value
}

// Handle selection
const onSelect = (value: string) => {
  const selected = robotFiles.value.find(robot => robot.path === value) || null
  emit('update:modelValue', selected)
  emit('change', selected)
  open.value = false
}

// Watch for external modelValue changes
watch(() => props.modelValue, (newVal) => {
  selectedValue.value = newVal?.path || ''
})

// Watch for file tree changes
watch(() => fileTreeStore.root, () => {
  updateRobotFiles()
}, { deep: true })
</script>