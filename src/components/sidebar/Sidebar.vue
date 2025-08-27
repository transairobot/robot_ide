<template>
  <div class="h-full bg-card border-r border-border flex">
    <!-- Tabs -->
    <div class="flex flex-col border-r border-border w-16">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="handleTabClick(tab.id)"
        :class="[
          'px-3 py-4 text-xs font-medium transition-colors flex flex-col items-center',
          activeTab === tab.id
            ? 'bg-background text-foreground border-l-2 border-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        ]"
      >
        <component :is="tab.icon" class="w-5 h-5" />
      </button>
    </div>

    <!-- Tab Content -->
    <div v-if="!isCollapsed" class="flex-1 overflow-hidden">
      <!-- Explorer Tab -->
      <ExplorerTab 
        v-if="activeTab === 'explorer'" 
        @file-selected="emit('file-selected', $event)"
        @simulation="emit('simulation', $event)"
        @files-loaded="emit('files-loaded')"
        ref="explorerTabRef"
      />
      
      <!-- Robot Apps Tab -->
      <AppsTab v-if="activeTab === 'apps'" />
      
      <!-- Scenes Tab -->
      <ScenesTab v-if="activeTab === 'scenes'" />
      
      <!-- Assets Tab -->
      <AssetsTab v-if="activeTab === 'assets'" />
      
      <!-- LLM Chat Tab -->
      <ChatTab v-if="activeTab === 'messages'" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { 
  Package, 
  Layers, 
  Archive, 
  MessageSquare,
  FolderOpen
} from 'lucide-vue-next'
import AppsTab from './AppsTab.vue'
import ScenesTab from './ScenesTab.vue'
import AssetsTab from './AssetsTab.vue'
import ChatTab from './ChatTab.vue'
import ExplorerTab from './ExplorerTab.vue'

// Define emits
const emit = defineEmits<{
  'content-collapsed': [collapsed: boolean]
  'file-selected': [fileItem: any]
  'simulation': [fileItem: any]
  'files-loaded': []
}>()

const activeTab = ref('explorer')
const isCollapsed = ref(false)
const explorerTabRef = ref<InstanceType<typeof ExplorerTab> | null>(null)

const tabs = [
  { id: 'explorer', label: 'Explorer', icon: FolderOpen },
  { id: 'apps', label: 'Apps', icon: Package },
  { id: 'scenes', label: 'Scenes', icon: Layers },
  { id: 'assets', label: 'Assets', icon: Archive },
  { id: 'messages', label: 'LLM Chat', icon: MessageSquare },
]

// Handle tab click with collapse functionality
const handleTabClick = (tabId: string) => {
  if (activeTab.value === tabId && !isCollapsed.value) {
    // If clicking the same active tab and content is visible, collapse it
    isCollapsed.value = true
  } else {
    // If clicking a different tab or content is collapsed, show the tab content
    activeTab.value = tabId
    isCollapsed.value = false
  }
}

// Watch for collapse state changes and emit to parent
watch(isCollapsed, (newValue) => {
  emit('content-collapsed', newValue)
})

// 暴露ExplorerTab引用给父组件
defineExpose({
  getExplorerTab: () => explorerTabRef.value
})
</script>
