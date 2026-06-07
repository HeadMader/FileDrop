<script setup lang="ts" generic="T extends string | number">
interface Option<V> {
  value: V;
  label: string;
}
interface Props {
  modelValue: T;
  options: Array<Option<T> | T>;
}
defineProps<Props>();
const emit = defineEmits<{ (e: 'update:modelValue', v: T): void }>();
function optVal(o: Option<T> | T): T {
  return typeof o === 'object' ? o.value : o;
}
function optLabel(o: Option<T> | T): string {
  return typeof o === 'object' ? o.label : String(o);
}
</script>

<template>
  <div class="segmented" role="tablist">
    <button
      v-for="o in options"
      :key="String(optVal(o))"
      type="button"
      role="tab"
      :aria-selected="modelValue === optVal(o)"
      :class="['segmented-item', modelValue === optVal(o) && 'active']"
      @click="emit('update:modelValue', optVal(o))"
    >
      {{ optLabel(o) }}
    </button>
  </div>
</template>
