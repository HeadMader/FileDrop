<script setup lang="ts">
import { useToastStore } from '@/stores/toast.store';
import Icon from './Icon.vue';

const toast = useToastStore();
</script>

<template>
  <div class="toast-stack">
    <transition-group name="toast">
      <div v-for="t in toast.items" :key="t.id" :class="['toast', t.type || 'info']">
        <Icon v-if="t.type === 'success'" name="check" :size="14" style="color: var(--success)" />
        <Icon v-else-if="t.type === 'error'" name="x" :size="14" style="color: var(--danger)" />
        <Icon v-else-if="t.type === 'warning'" name="clock" :size="14" style="color: var(--warning)" />
        <span>{{ t.message }}</span>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.2s;
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.toast-leave-to {
  opacity: 0;
}
</style>
