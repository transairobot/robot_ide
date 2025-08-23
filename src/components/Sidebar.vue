<template>
  <div class="h-full bg-card border-r border-border flex flex-col">
    <!-- Search Bar -->
    <div class="p-3 border-b border-border">
      <div class="relative">
        <Search class="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          v-model="searchTerm"
          placeholder="Search..."
          class="w-full pl-8 pr-3 py-2 text-sm"
        />
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex-1 flex flex-col">
      <div class="flex border-b border-border">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            'flex-1 px-3 py-2 text-xs font-medium transition-colors',
            activeTab === tab.id
              ? 'bg-background text-foreground border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          ]"
        >
          <component :is="tab.icon" class="w-4 h-4 mr-1" />
          {{ tab.label }}
        </button>
      </div>

      <!-- Tab Content -->
      <div class="flex-1 overflow-hidden">
        <!-- Robot Apps Tab -->
        <div v-if="activeTab === 'apps'" class="h-full flex flex-col">
          <div class="p-3 border-b border-border">
            <Button size="sm" class="w-full">
              <Plus class="w-4 h-4 mr-1" />
              Install App
            </Button>
          </div>
          <ScrollArea class="flex-1 p-2">
            <div
              v-for="app in filteredRobotApps"
              :key="app.id"
              class="p-3 mb-2 bg-background rounded-lg border border-border hover:bg-muted transition-colors"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <h4 class="text-sm font-medium text-foreground">{{ app.name }}</h4>
                  <p class="text-xs text-muted-foreground mt-1">{{ app.description }}</p>
                  <div class="flex items-center gap-2 mt-2">
                    <span class="text-xs text-muted-foreground">v{{ app.version }}</span>
                    <span
                      :class="[
                        'text-xs px-2 py-0.5 rounded-full',
                        app.installed
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                      ]"
                    >
                      {{ app.installed ? 'Installed' : 'Available' }}
                    </span>
                  </div>
                </div>
                <div class="flex flex-col gap-1">
                  <Button
                    v-if="!app.installed"
                    size="sm"
                    variant="outline"
                    class="h-6 px-2 text-xs"
                  >
                    <Download class="w-3 h-3" />
                  </Button>
                  <Button
                    v-else
                    size="sm"
                    variant="outline"
                    class="h-6 px-2 text-xs text-destructive hover:text-destructive"
                  >
                    <Trash2 class="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        <!-- Scenes Tab -->
        <div v-if="activeTab === 'scenes'" class="h-full flex flex-col">
          <div class="p-3 border-b border-border">
            <Button size="sm" class="w-full">
              <Plus class="w-4 h-4 mr-1" />
              New Scene
            </Button>
          </div>
          <ScrollArea class="flex-1 p-2">
            <div
              v-for="scene in filteredScenes"
              :key="scene.id"
              class="p-3 mb-2 bg-background rounded-lg border border-border hover:bg-muted transition-colors"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <h4 class="text-sm font-medium text-foreground">{{ scene.name }}</h4>
                  <p class="text-xs text-muted-foreground mt-1">{{ scene.description }}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  class="h-6 w-6 p-0"
                  @click="toggleSceneVisibility(scene)"
                >
                  <Eye v-if="scene.visible" class="w-3 h-3" />
                  <EyeOff v-else class="w-3 h-3" />
                </Button>
              </div>
            </div>
          </ScrollArea>
        </div>

        <!-- Assets Tab -->
        <div v-if="activeTab === 'assets'" class="h-full flex flex-col">
          <div class="p-3 border-b border-border">
            <Button size="sm" class="w-full">
              <Plus class="w-4 h-4 mr-1" />
              Import Asset
            </Button>
          </div>
          <ScrollArea class="flex-1 p-2">
            <div
              v-for="asset in filteredAssets"
              :key="asset.id"
              class="p-3 mb-2 bg-background rounded-lg border border-border hover:bg-muted transition-colors"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <h4 class="text-sm font-medium text-foreground">{{ asset.name }}</h4>
                  <p class="text-xs text-muted-foreground mt-1">{{ asset.description }}</p>
                  <span class="text-xs text-muted-foreground mt-2 block">v{{ asset.version }}</span>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        <!-- Messages Tab -->
        <div v-if="activeTab === 'messages'" class="h-full flex flex-col">
          <ScrollArea class="flex-1 p-2">
            <div
              v-for="message in messages"
              :key="message.id"
              class="p-2 mb-2 bg-background rounded border border-border"
            >
              <div class="flex items-start justify-between">
                <p class="text-xs text-foreground">{{ message.text }}</p>
                <span class="text-xs text-muted-foreground">{{ message.timestamp }}</span>
              </div>
              <span
                :class="[
                  'text-xs px-2 py-0.5 rounded-full mt-1 inline-block',
                  message.type === 'system' && 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
                  message.type === 'success' && 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
                  message.type === 'error' && 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                ]"
              >
                {{ message.type }}
              </span>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import ScrollArea from '@/components/ui/ScrollArea.vue'
import { 
  Package, 
  Layers, 
  Archive, 
  MessageSquare, 
  Search,
  Plus,
  Download,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-vue-next'

interface StoreItem {
  id: string
  name: string
  description: string
  version?: string
  installed?: boolean
  visible?: boolean
}

interface Message {
  id: string
  text: string
  type: 'system' | 'success' | 'error'
  timestamp: string
}

const searchTerm = ref('')
const activeTab = ref('apps')

const tabs = [
  { id: 'apps', label: 'Apps', icon: Package },
  { id: 'scenes', label: 'Scenes', icon: Layers },
  { id: 'assets', label: 'Assets', icon: Archive },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
]

const robotApps = ref<StoreItem[]>([
  { id: "1", name: "Path Planning", description: "Advanced path planning algorithms", version: "1.0.2", installed: true },
  { id: "2", name: "Object Detection", description: "Real-time object detection", version: "2.1.0", installed: false },
  { id: "3", name: "SLAM Navigation", description: "Simultaneous localization and mapping", version: "1.5.3", installed: true },
])

const scenes = ref<StoreItem[]>([
  { id: "1", name: "Warehouse", description: "Industrial warehouse environment", visible: true },
  { id: "2", name: "Office", description: "Modern office space", visible: false },
  { id: "3", name: "Factory Floor", description: "Manufacturing floor simulation", visible: true },
])

const assets = ref<StoreItem[]>([
  { id: "1", name: "Robot Arm", description: "6-DOF robotic arm model", version: "3.2.1" },
  { id: "2", name: "Mobile Robot", description: "Differential drive robot", version: "2.0.5" },
  { id: "3", name: "Conveyor Belt", description: "Animated conveyor system", version: "1.8.0" },
])

const messages = ref<Message[]>([
  { id: "1", text: "Robot simulation started", type: "system", timestamp: "10:30" },
  { id: "2", text: "Path planning completed successfully", type: "success", timestamp: "10:32" },
  { id: "3", text: "Connection error to robot controller", type: "error", timestamp: "10:35" },
])

const filteredRobotApps = computed(() => {
  if (!searchTerm.value) return robotApps.value
  return robotApps.value.filter(app => 
    app.name.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
    app.description.toLowerCase().includes(searchTerm.value.toLowerCase())
  )
})

const filteredScenes = computed(() => {
  if (!searchTerm.value) return scenes.value
  return scenes.value.filter(scene => 
    scene.name.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
    scene.description.toLowerCase().includes(searchTerm.value.toLowerCase())
  )
})

const filteredAssets = computed(() => {
  if (!searchTerm.value) return assets.value
  return assets.value.filter(asset => 
    asset.name.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
    asset.description.toLowerCase().includes(searchTerm.value.toLowerCase())
  )
})

const toggleSceneVisibility = (scene: StoreItem) => {
  scene.visible = !scene.visible
}
</script>
