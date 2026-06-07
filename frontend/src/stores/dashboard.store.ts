import { defineStore } from 'pinia';
import { ref } from 'vue';
import type {
  UploadDetail,
  UploadItem,
  UpdateUploadBody,
  UserStats,
  StatsPeriod,
} from '@filedrop/shared';
import { dashboardApi } from '@/api/dashboard.api';
import { uploadsApi } from '@/api/uploads.api';

export type DashboardSort = 'newest' | 'oldest' | 'largest' | 'most';
export type DashboardStatus = 'all' | 'active' | 'expired';

export const useDashboardStore = defineStore('dashboard', () => {
  const files = ref<UploadItem[]>([]);
  const total = ref(0);
  const totalPages = ref(1);
  const page = ref(1);
  const pageSize = ref(8);
  const search = ref('');
  const status = ref<DashboardStatus>('all');
  const sort = ref<DashboardSort>('newest');
  const loading = ref(false);

  const stats = ref<UserStats | null>(null);
  const statsPeriod = ref<StatsPeriod>('7d');
  const statsLoading = ref(false);

  async function fetchFiles() {
    loading.value = true;
    try {
      const res = await dashboardApi.listFiles({
        page: page.value,
        pageSize: pageSize.value,
        search: search.value || undefined,
        status: status.value,
        sort: sort.value,
      });
      files.value = res.items;
      total.value = res.total;
      totalPages.value = res.totalPages;
    } finally {
      loading.value = false;
    }
  }

  async function fetchStats() {
    statsLoading.value = true;
    try {
      stats.value = await dashboardApi.stats(statsPeriod.value);
    } finally {
      statsLoading.value = false;
    }
  }

  function setPage(p: number) {
    page.value = Math.max(1, p);
    return fetchFiles();
  }
  function setSearch(q: string) {
    search.value = q;
    page.value = 1;
    return fetchFiles();
  }
  function setStatus(s: DashboardStatus) {
    status.value = s;
    page.value = 1;
    return fetchFiles();
  }
  function setSort(s: DashboardSort) {
    sort.value = s;
    return fetchFiles();
  }
  function setStatsPeriod(p: StatsPeriod) {
    statsPeriod.value = p;
    return fetchStats();
  }

  async function updateFile(id: string, body: UpdateUploadBody): Promise<UploadDetail> {
    const updated = await uploadsApi.update(id, body);
    files.value = files.value.map((f) => (f.id === id ? { ...f, ...updated } : f));
    return updated;
  }

  async function deleteFile(id: string) {
    await uploadsApi.remove(id);
    files.value = files.value.filter((f) => f.id !== id);
    total.value = Math.max(0, total.value - 1);
  }

  return {
    files,
    total,
    totalPages,
    page,
    pageSize,
    search,
    status,
    sort,
    loading,
    stats,
    statsPeriod,
    statsLoading,
    fetchFiles,
    fetchStats,
    setPage,
    setSearch,
    setStatus,
    setSort,
    setStatsPeriod,
    updateFile,
    deleteFile,
  };
});
