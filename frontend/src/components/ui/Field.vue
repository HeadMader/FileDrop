<script setup lang="ts">
interface Props {
  label?: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
}
defineProps<Props>();
</script>

<template>
  <div class="field">
    <label v-if="label || $slots.label" class="label" :for="htmlFor">
      <slot name="label">{{ label }}</slot>
    </label>
    <slot />
    <div v-if="error" class="error-msg">{{ error }}</div>
    <div v-else-if="hint || $slots.hint" class="help">
      <slot name="hint">{{ hint }}</slot>
    </div>
  </div>
</template>
