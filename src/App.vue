<script setup lang="ts">
import RobotIDE from './components/RobotIDE.vue'
import NotificationContainer from './components/ui/NotificationContainer.vue'
</script>

<template>
  <RobotIDE />
  <NotificationContainer />
</template>

<style>
#app {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  margin: 0;
  padding: 0;
}
</style>
