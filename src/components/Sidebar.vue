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
              v-for="app in robotApps"
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
              v-for="scene in scenes"
              :key="scene.id"
              class="p-3 mb-2 bg-background rounded-lg border border-border hover:bg-muted transition-colors relative"
              @mouseenter="showSceneImage(scene)"
              @mouseleave="hideSceneImage"
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
              <!-- Image preview (hidden by default) -->
              <div 
                v-if="hoveredScene && hoveredScene.id === scene.id" 
                class="absolute top-full left-0 mt-2 w-64 h-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 overflow-hidden"
              >
                <img 
                  :src="scene.img" 
                  :alt="scene.name" 
                  class="w-full h-full object-cover"
                  @error="handleImageError"
                />
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
              v-for="asset in assets"
              :key="asset.id"
              class="p-3 mb-2 bg-background rounded-lg border border-border hover:bg-muted transition-colors"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <h4 class="text-sm font-medium text-foreground">{{ asset.name }}</h4>
                  <p class="text-xs text-muted-foreground mt-1">{{ asset.description }}</p>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        <!-- LLM Chat Tab -->
        <div v-if="activeTab === 'messages'" class="h-full flex flex-col">
          <ScrollArea class="flex-1 p-2">
            <div
              v-for="message in chatMessages"
              :key="message.id"
              :class="[
                'p-3 mb-2 rounded-lg border',
                message.role === 'user' 
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800/50 self-end max-w-[80%]' 
                  : 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800/50 max-w-[80%]'
              ]"
            >
              <div 
                :class="[
                  'text-sm whitespace-pre-wrap',
                  message.role === 'user' ? 'text-blue-800 dark:text-blue-200 text-right' : 'text-green-800 dark:text-green-200'
                ]"
              >
                {{ message.content }}
              </div>
              <div 
                :class="[
                  'text-xs mt-1',
                  message.role === 'user' 
                    ? 'text-blue-600 dark:text-blue-400 text-right' 
                    : 'text-green-600 dark:text-green-400'
                ]"
              >
                {{ message.role === 'user' ? 'You' : 'LLM Assistant' }}
              </div>
            </div>
          </ScrollArea>
          <div class="p-3 border-t border-border">
            <div class="flex gap-2">
              <Input
                v-model="userInput"
                placeholder="Type a message..."
                class="flex-1 h-8 text-sm"
                @keyup.enter="handleSendMessage"
              />
              <Button 
                size="sm" 
                class="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white"
                @click="handleSendMessage"
              >
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, watch } from 'vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import ScrollArea from '@/components/ui/ScrollArea.vue'
import { 
  Package, 
  Layers, 
  Archive, 
  MessageSquare, 
  Plus,
  Download,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-vue-next'

// Define emits
const emit = defineEmits<{
  'content-collapsed': [collapsed: boolean]
}>()

interface StoreItem {
  id: string
  name: string
  description: string
  version?: string
  installed?: boolean
  visible?: boolean
}

// Define the Scene interface
interface Scene {
  id: string
  name: string
  description: string
  img: string // URL to the image
  mjcf_xml: string // Path to the MJCF XML file
  visible?: boolean
}

interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
}

const activeTab = ref('apps')
const isCollapsed = ref(false)
const userInput = ref('')

const tabs = [
  { id: 'apps', label: 'Apps', icon: Package },
  { id: 'scenes', label: 'Scenes', icon: Layers },
  { id: 'assets', label: 'Assets', icon: Archive },
  { id: 'messages', label: 'LLM Chat', icon: MessageSquare },
]

const robotApps = ref<StoreItem[]>([
  { id: "1", name: "Path Planning", description: "Advanced path planning algorithms", version: "1.0.2", installed: true },
  { id: "2", name: "Object Detection", description: "Real-time object detection", version: "2.1.0", installed: false },
  { id: "3", name: "SLAM Navigation", description: "Simultaneous localization and mapping", version: "1.5.3", installed: true },
])

// Modify scenes to fetch from API
const scenes = ref<Scene[]>([])

// Reactive variable to track the hovered scene
const hoveredScene = ref<Scene | null>(null);

// Function to show scene image on hover
const showSceneImage = (scene: Scene) => {
  hoveredScene.value = scene;
};

// Function to hide scene image when not hovering
const hideSceneImage = () => {
  hoveredScene.value = null;
};

// Function to handle image loading errors
const handleImageError = (event: Event) => {
  const target = event.target as HTMLImageElement;
  console.warn(`Failed to load image: ${target.src}`);
  // Optionally, you can set a default image or hide the image container
  // target.src = '/images/default-scene.png'; // Set a default image
  // Or hide the parent container
  // target.parentElement.style.display = 'none';
};

// Fetch scenes from the backend API
const fetchScenes = async () => {
  try {
    // TODO: Replace with the actual backend API URL
    const response = await fetch('/api/scenes');
    if (!response.ok) {
      throw new Error(`Failed to fetch scenes: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    scenes.value = data.map((scene: any) => ({
      ...scene,
      visible: scene.visible ?? true // Default to true if not specified
    }));
  } catch (error) {
    console.error("Error fetching scenes:", error);
    // Fallback to some default scenes if API call fails
    scenes.value = [
      { id: "1", name: "Warehouse", description: "Industrial warehouse environment", img: "/images/warehouse.jpg", mjcf_xml: "/models/warehouse.xml", visible: true },
      { id: "2", name: "Office", description: "Modern office space", img: "/images/office.jpg", mjcf_xml: "/models/office.xml", visible: false },
      { id: "3", name: "Factory Floor", description: "Manufacturing floor simulation", img: "/images/factory.jpg", mjcf_xml: "/models/factory.xml", visible: true },
    ];
  }
};

// Call fetchScenes when the component is mounted
onMounted(() => {
  fetchScenes();
});

const assets = ref<StoreItem[]>([
  { id: "1", name: "bottle.stl", description: "A plastic water bottle" },
  { id: "2", name: "desktop.glb", description: "A modern office desk" },
  { id: "3", name: "mug.obj", description: "A ceramic coffee mug" },
])

// Chat messages state
const chatMessages = ref<ChatMessage[]>([
  {
    id: '1',
    content: 'Hello! I am your robot assistant. How can I help you today?',
    role: 'assistant',
    timestamp: new Date()
  }
])

const toggleSceneVisibility = (scene: Scene) => {
  scene.visible = !scene.visible
}

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

// Wrapper function for sending message
const handleSendMessage = () => {
  sendMessage()
}

// Function to send message to LLM
const sendMessage = async () => {
  console.log("user.Input=", userInput.value)
  if (!userInput.value.trim()) return

  // Store user input before clearing it
  const currentInput = userInput.value
  
  // Add user message to chat
  const userMessage: ChatMessage = {
    id: Date.now().toString(),
    content: currentInput,
    role: 'user',
    timestamp: new Date()
  }
  
  chatMessages.value.push(userMessage)
  
  // Clear the input field
  userInput.value = ''
  
  try {
    // Add a placeholder for the assistant's response
    const assistantMessageId = (Date.now() + 1).toString()
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      content: '...',
      role: 'assistant',
      timestamp: new Date()
    }
    
    chatMessages.value.push(assistantMessage)
    
    // Scroll to bottom to show the new message
    await nextTick()
    
    // Simulate API call to LLM
    // In a real application, you would replace this with an actual API call
    const response = await callLLM(currentInput)
    
    // Update the assistant's message with the actual response
    const messageIndex = chatMessages.value.findIndex(msg => msg.id === assistantMessageId)
    if (messageIndex !== -1) {
      chatMessages.value[messageIndex].content = response
    }
  } catch (error) {
    // Handle error
    const errorMessage: ChatMessage = {
      id: (Date.now() + 2).toString(),
      content: 'Sorry, I encountered an error while processing your request.',
      role: 'assistant',
      timestamp: new Date()
    }
    
    chatMessages.value.push(errorMessage)
  }
}

// Mock function to simulate calling an LLM API
const callLLM = async (query: string): Promise<string> => {
  // In a real application, you would make an HTTP request to your LLM API
  // For now, we'll simulate a response
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Return a mock response based on the query
  const responses: Record<string, string> = {
    'hello': 'Hello! How can I assist you with your robot simulation today?',
    'help': 'I can help you with robot programming, simulation scenarios, and troubleshooting. What do you need help with?',
    'path planning': 'For path planning, you can use the Path Planning app in the Apps section. It provides advanced algorithms for navigation.',
    'simulation': 'To run a simulation, make sure your robot is properly configured and then click the Start button in the toolbar.',
    'robot': 'What would you like to know about your robot? I can provide information about its capabilities, status, or help you configure it.'
  }
  
  // Find a matching response or provide a default one
  const lowerQuery = query.toLowerCase()
  for (const [key, response] of Object.entries(responses)) {
    if (lowerQuery.includes(key)) {
      return response
    }
  }
  
  // Default response
  return `I received your message: "${query}". I'm here to help with your robot simulation. You can ask me about path planning, robot configuration, or simulation scenarios.`
}
</script>