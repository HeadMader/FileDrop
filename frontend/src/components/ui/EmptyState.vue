<script setup lang="ts">
import Icon, { type IconName } from './Icon.vue';

interface Props {
  icon?: IconName;
  title?: string;
  message?: string;
}
defineProps<Props>();
</script>

<template>
  <div style="text-align: center; padding: 48px 16px; color: var(--text-muted)">
    <div
      v-if="icon"
      style="display: inline-flex; padding: 12px; background: var(--bg-muted); border-radius: 50%; color: var(--text-subtle); margin-bottom: 12px"
    >
      <Icon :name="icon" :size="18" />
    </div>
    <div v-if="title" style="color: var(--text); font-weight: 500; font-size: 15px">{{ title }}</div>
    <div v-if="message" style="margin-top: 4px; font-size: 13px">{{ message }}</div>
    <div v-if="$slots.action" style="margin-top: 16px"><slot name="action" /></div>
  </div>
</template>
