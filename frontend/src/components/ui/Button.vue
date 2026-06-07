<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  iconOnly?: boolean;
}
const props = withDefaults(defineProps<Props>(), {
  variant: 'secondary',
  size: 'md',
  type: 'button',
});

defineEmits<{ (e: 'click', ev: MouseEvent): void }>();

const cls = computed(() => [
  'btn',
  `btn-${props.variant}`,
  props.size === 'sm' && 'btn-sm',
  props.size === 'lg' && 'btn-lg',
  props.iconOnly && 'btn-icon',
  props.block && 'btn-block',
]);
</script>

<template>
  <button :type="type" :disabled="disabled" :class="cls" @click="$emit('click', $event)">
    <slot name="icon" />
    <slot />
    <slot name="iconRight" />
  </button>
</template>
