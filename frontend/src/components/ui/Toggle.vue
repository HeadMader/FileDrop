<script setup lang="ts">
interface Props {
  modelValue: boolean;
  label?: string;
}
defineProps<Props>();
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>();
</script>

<template>
  <label class="toggle-wrap">
    <button
      type="button"
      role="switch"
      :aria-checked="modelValue"
      :class="['toggle', modelValue && 'on']"
      @click.prevent="emit('update:modelValue', !modelValue)"
    />
    <span v-if="label || $slots.default" class="toggle-label">
      <slot>{{ label }}</slot>
    </span>
  </label>
</template>

<style scoped>
.toggle-wrap {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  font-size: 13px;
}
.toggle-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
</style>
