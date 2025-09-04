<template>
  <div class="relative overflow-hidden h-full">
    <div 
      ref="viewportRef"
      class="h-full w-full overflow-auto"
      @scroll="onScroll"
    >
      <div class="relative">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const viewportRef = ref<HTMLElement | null>(null)

const onScroll = (event: Event) => {
  // Handle scroll events if needed
}
</script>