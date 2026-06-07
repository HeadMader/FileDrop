import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface ToastItem {
  id: string;
  type?: 'info' | 'success' | 'error' | 'warning';
  message: string;
}

export const useToastStore = defineStore('toast', () => {
  const items = ref<ToastItem[]>([]);

  function push(t: Omit<ToastItem, 'id'>) {
    const id = Math.random().toString(36).slice(2);
    items.value = [...items.value, { id, ...t }].slice(-3);
    setTimeout(() => {
      items.value = items.value.filter((x) => x.id !== id);
    }, 4000);
  }

  function dismiss(id: string) {
    items.value = items.value.filter((x) => x.id !== id);
  }

  return { items, push, dismiss };
});
