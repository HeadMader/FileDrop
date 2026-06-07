<script setup lang="ts">
import Icon, { type IconName } from './Icon.vue';

interface Props {
  icon: IconName;
  size?: 'sm' | 'md';
  label?: string;
  disabled?: boolean;
  iconSize?: number;
}
const props = withDefaults(defineProps<Props>(), { size: 'sm', iconSize: 13 });

defineEmits<{ (e: 'click', ev: MouseEvent): void }>();
</script>

<template>
  <button
    type="button"
    :disabled="disabled"
    :class="['btn', 'btn-ghost', size === 'sm' ? 'btn-icon-sm' : 'btn-icon']"
    :aria-label="label"
    @click="$emit('click', $event)"
  >
    <Icon :name="props.icon" :size="iconSize" />
  </button>
</template>
