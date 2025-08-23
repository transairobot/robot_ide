<template>
  <button
    :class="[
      'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
      active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
      $attrs.class
    ]"
    v-bind="$attrs"
    @click="onClick"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
interface Props {
  active?: boolean
  value: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'click', value: string): void
}>()

const onClick = () => {
  emit('click', props.value)
}
</script>