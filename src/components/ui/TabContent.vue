<template>
  <div v-show="active" class="mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
    <slot />
  </div>
</template>

<script setup lang="ts">
interface Props {
  active?: boolean
}

defineProps<Props>()
</script>