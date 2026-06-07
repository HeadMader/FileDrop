<script setup lang="ts">
interface Props {
  size?: number;
}
withDefaults(defineProps<Props>(), { size: 24 });
</script>

<template>
  <div class="spinner" :style="{ width: `${size}px`, height: `${size}px` }" />
</template>

<style scoped>
.spinner {
  border-radius: 50%;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
