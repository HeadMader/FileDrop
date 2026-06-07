import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { UploadResult } from '@filedrop/shared';
import { RECENT_UPLOADS_MAX, RECENT_UPLOADS_STORAGE_KEY } from '@/utils/constants';

function load(): UploadResult[] {
  try {
    const raw = localStorage.getItem(RECENT_UPLOADS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(items: UploadResult[]) {
  try {
    localStorage.setItem(RECENT_UPLOADS_STORAGE_KEY, JSON.stringify(items.slice(0, RECENT_UPLOADS_MAX)));
  } catch {
    // ignore
  }
}

export const useRecentUploadsStore = defineStore('recent-uploads', () => {
  const items = ref<UploadResult[]>(load());

  function add(item: UploadResult) {
    const filtered = items.value.filter((x) => x.id !== item.id);
    items.value = [item, ...filtered].slice(0, RECENT_UPLOADS_MAX);
    save(items.value);
  }

  function clear() {
    items.value = [];
    save([]);
  }

  return { items, add, clear };
});
