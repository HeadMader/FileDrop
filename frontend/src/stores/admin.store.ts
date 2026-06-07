import { defineStore } from 'pinia';
import { ref } from 'vue';
import type {
  AdminUploadItem,
  AdminUserItem,
  SystemHealth,
  SystemStats,
} from '@filedrop/shared';
import { adminApi } from '@/api/admin.api';

export const useAdminStore = defineStore('admin', () => {
  const stats = ref<SystemStats | null>(null);
  const health = ref<SystemHealth | null>(null);

  const files = ref<AdminUploadItem[]>([]);
  const filesTotal = ref(0);
  const filesPage = ref(1);
  const filesPageSize = ref(10);
  const filesTotalPages = ref(1);
  const filesSearch = ref('');
  const filesAnon = ref(false);
  const filesSort = ref<'newest' | 'largest' | 'most'>('newest');
  const filesLoading = ref(false);

  const users = ref<AdminUserItem[]>([]);
  const usersTotal = ref(0);
  const usersPage = ref(1);
  const usersPageSize = ref(10);
  const usersTotalPages = ref(1);
  const usersSearch = ref('');
  const usersSort = ref<'newest' | 'uploads' | 'storage'>('newest');
  const usersLoading = ref(false);

  async function fetchOverview() {
    const [s, h] = await Promise.all([adminApi.stats(), adminApi.health()]);
    stats.value = s;
    health.value = h;
  }

  async function fetchFiles() {
    filesLoading.value = true;
    try {
      const res = await adminApi.listFiles({
        page: filesPage.value,
        pageSize: filesPageSize.value,
        search: filesSearch.value || undefined,
        anonymous: filesAnon.value || undefined,
        sort: filesSort.value,
      });
      files.value = res.items;
      filesTotal.value = res.total;
      filesTotalPages.value = res.totalPages;
    } finally {
      filesLoading.value = false;
    }
  }

  async function fetchUsers() {
    usersLoading.value = true;
    try {
      const res = await adminApi.listUsers({
        page: usersPage.value,
        pageSize: usersPageSize.value,
        search: usersSearch.value || undefined,
        sort: usersSort.value,
      });
      users.value = res.items;
      usersTotal.value = res.total;
      usersTotalPages.value = res.totalPages;
    } finally {
      usersLoading.value = false;
    }
  }

  async function deleteFile(id: string) {
    await adminApi.deleteFile(id);
    files.value = files.value.filter((f) => f.id !== id);
    filesTotal.value = Math.max(0, filesTotal.value - 1);
  }

  async function exportCsv(kind: 'files' | 'users' = 'files') {
    const blob = await adminApi.exportCsv(kind);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `filedrop-${kind}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return {
    stats,
    health,
    files,
    filesTotal,
    filesPage,
    filesPageSize,
    filesTotalPages,
    filesSearch,
    filesAnon,
    filesSort,
    filesLoading,
    users,
    usersTotal,
    usersPage,
    usersPageSize,
    usersTotalPages,
    usersSearch,
    usersSort,
    usersLoading,
    fetchOverview,
    fetchFiles,
    fetchUsers,
    deleteFile,
    exportCsv,
  };
});
