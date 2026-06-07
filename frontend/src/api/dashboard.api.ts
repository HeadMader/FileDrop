import type {
  UploadItem,
  UserStats,
  PaginatedResponse,
  StatsPeriod,
} from '@filedrop/shared';
import { api } from './client';

type DashboardSort = 'newest' | 'oldest' | 'largest' | 'most';

function toApiSort(sort?: DashboardSort): 'newest' | 'oldest' | 'largest' | 'most_downloaded' | undefined {
  return sort === 'most' ? 'most_downloaded' : sort;
}

export const dashboardApi = {
  listFiles: (params: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: 'all' | 'active' | 'expired';
    sort?: DashboardSort;
  }) =>
    api.get<PaginatedResponse<UploadItem>>('/dashboard/uploads', {
      page: params.page,
      limit: params.pageSize,
      search: params.search,
      status: params.status,
      sort: toApiSort(params.sort),
    }),

  stats: (period: StatsPeriod = '7d') =>
    api.get<UserStats>('/dashboard/stats', { period }),
};
