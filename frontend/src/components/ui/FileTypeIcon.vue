<script setup lang="ts">
import { computed } from 'vue';
import Icon, { type IconName } from './Icon.vue';

interface Props {
  mimeType?: string | null;
  size?: number;
}
const props = withDefaults(defineProps<Props>(), { size: 18 });

const info = computed<{ name: IconName; color: string }>(() => {
  const m = (props.mimeType || '').toLowerCase();
  if (m.startsWith('image/')) return { name: 'image', color: '#06b6d4' };
  if (m.startsWith('video/')) return { name: 'video', color: '#a855f7' };
  if (m.startsWith('audio/')) return { name: 'audio', color: '#10b981' };
  if (m === 'application/pdf') return { name: 'pdf', color: '#ef4444' };
  if (/zip|rar|7z|gzip|tar/.test(m)) return { name: 'zip', color: '#f59e0b' };
  if (m.startsWith('text/')) return { name: 'text', color: '#3b82f6' };
  return { name: 'file', color: 'var(--text-muted)' };
});
</script>

<template>
  <Icon :name="info.name" :size="size" :style="{ color: info.color }" />
</template>
