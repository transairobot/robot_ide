<template>
  <div class="h-full flex flex-col">
    <!-- Tab Header -->
    <div class="px-3 py-2 border-b border-border bg-muted/50">
      <h3 class="text-sm font-medium text-foreground">Scenes</h3>
    </div>
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
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {Button} from '@/components/ui/button'
import ScrollArea from '@/components/ui/ScrollArea.vue'
import { Plus, Eye, EyeOff } from 'lucide-vue-next'
import { fetchScenes, type Scene } from '@/services'

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

// Call fetchScenes when the component is mounted
onMounted(async () => {
  scenes.value = await fetchScenes();
});

const toggleSceneVisibility = (scene: Scene) => {
  scene.visible = !scene.visible
}
</script>
