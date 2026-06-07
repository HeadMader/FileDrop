<script setup lang="ts">
interface Props {
  pad?: 'sm' | 'lg' | 'none';
}
withDefaults(defineProps<Props>(), { pad: 'lg' });
</script>

<template>
  <div :class="['card', pad === 'lg' ? 'card-pad' : pad === 'sm' ? 'card-pad-sm' : '']">
    <slot />
  </div>
</template>
