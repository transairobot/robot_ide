<template>
  <Combobox v-model:open="open" v-model:value="selectedValue" @update:modelValue="onSelect">
    <ComboboxAnchor class="w-full">
      <div class="relative w-full max-w-sm items-center">
        <ComboboxInput placeholder="Search robot app..." class="w-full" @input="handleSearch">
        </ComboboxInput>
        <ComboboxTrigger class="absolute end-0 inset-y-0 flex items-center justify-center px-3">
          <ChevronsUpDown class="size-4 text-muted-foreground" />
        </ComboboxTrigger>
      </div>
    </ComboboxAnchor>

    <ComboboxList v-if="open" :class="['w-[--reka-popper-anchor-width]', 'max-h-60 overflow-y-auto']">
      <ComboboxEmpty />

      <ComboboxGroup>
        <ComboboxItem v-for="app in filteredApps" :key="app.path" :value="app.path"
          class="px-2 py-1.5 text-xs rounded flex items-center gap-2 cursor-pointer">
          <FileCode class="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <span class="truncate">{{ app.name }}</span>
        </ComboboxItem>
      </ComboboxGroup>
    </ComboboxList>
  </Combobox>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useWorkplaceStore } from '@/stores/workplace'
import type { FileItem } from '@/stores/workplace'
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
import { AppWindow, FileCode, ChevronsUpDown } from 'lucide-vue-next'
import type { AcceptableValue } from 'reka-ui'

interface Props {
  modelValue: FileItem | null
}

interface Emits {
  (e: 'update:modelValue', value: FileItem | null): void
  (e: 'change', value: FileItem | null): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const workplaceStore = useWorkplaceStore()
const open = ref(false)
const searchQuery = ref('')
const selectedValue = ref(props.modelValue?.path || '')
const appFiles = ref<FileItem[]>([])

// Populate app files on mount
onMounted(() => {
  updateAppFiles()
})

// Update app files list
const updateAppFiles = () => {
  const allFiles = workplaceStore.getAllFolders()
  appFiles.value = allFiles.filter(file =>
    file.type === 'folder' &&
    file.name.endsWith('.robotapp')
  )
}

// Filter apps based on search query
const filteredApps = computed(() => {
  if (!searchQuery.value) {
    return appFiles.value
  }
  return appFiles.value.filter(app =>
    app.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

// Computed property for selected app
const selectedApp = computed(() => {
  if (!selectedValue.value) return null
  return appFiles.value.find(app => app.path === selectedValue.value) || null
})

// Handle search input
const handleSearch = (event: Event) => {
  const target = event.target as HTMLInputElement
  searchQuery.value = target.value
}

// Handle selection
const onSelect = (value: AcceptableValue) => {
  const selected = appFiles.value.find(app => app.path === value?.toString()) || null
  emit('update:modelValue', selected)
  emit('change', selected)
  open.value = false
}

// Watch for external modelValue changes
watch(() => props.modelValue, (newVal) => {
  selectedValue.value = newVal?.path || ''
})

// Watch for file tree changes
watch(() => workplaceStore.root, () => {
  updateAppFiles()
}, { deep: true })
</script>