<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'accent' | 'info';
  dot?: boolean;
  mono?: boolean;
  outline?: boolean;
}
const props = withDefaults(defineProps<Props>(), { tone: 'default' });

const cls = computed(() => [
  'badge',
  props.tone !== 'default' && `badge-${props.tone}`,
  props.outline && 'badge-outline',
  props.dot && 'badge-dot',
  props.mono && 'mono',
]);
</script>

<template>
  <span :class="cls"><slot /></span>
</template>
