<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  modelValue?: string | number | null;
  type?: string;
  placeholder?: string;
  mono?: boolean;
  disabled?: boolean;
  min?: number | string;
  max?: number | string;
  minlength?: number;
  maxlength?: number;
  required?: boolean;
  autofocus?: boolean;
  id?: string;
  step?: number | string;
  autocomplete?: string;
}
const props = withDefaults(defineProps<Props>(), { type: 'text' });

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void;
  (e: 'keydown', ev: KeyboardEvent): void;
}>();

const cls = computed(() => ['input', props.mono && 'mono']);

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLInputElement).value);
}
</script>

<template>
  <input
    :id="id"
    :class="cls"
    :type="type"
    :value="modelValue ?? ''"
    :placeholder="placeholder"
    :disabled="disabled"
    :min="min"
    :max="max"
    :step="step"
    :minlength="minlength"
    :maxlength="maxlength"
    :required="required"
    :autofocus="autofocus"
    :autocomplete="autocomplete"
    @input="onInput"
    @keydown="$emit('keydown', $event)"
  />
</template>
