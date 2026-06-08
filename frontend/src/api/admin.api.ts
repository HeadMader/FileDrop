import type {
  AdminUploadDetail,
  AdminUploadItem,
  AdminUserItem,
  PaginatedResponse,
  SystemStats,
  SystemHealth,
} from '@filedrop/shared';
import { api } from './client';

type AdminFileSort = 'newest' | 'largest' | 'most';

function toFileApiSort(sort?: AdminFileSort): 'newest' | 'largest' | 'most_downloaded' | undefined {
  return sort === 'most' ? 'most_downloaded' : sort;
}

export const adminApi = {
  stats: () => api.get<SystemStats>('/admin/stats'),
  health: () => api.get<SystemHealth>('/admin/health'),

  listFiles: (params: {
    page?: number;
    pageSize?: number;
    search?: string;
    anonymous?: boolean;
    sort?: AdminFileSort;
  }) =>
    api.get<PaginatedResponse<AdminUploadItem>>('/admin/uploads', {
      page: params.page,
      limit: params.pageSize,
      search: params.search,
      anonymous: params.anonymous,
      sort: toFileApiSort(params.sort),
    }),

  getFile: (id: string) => api.get<AdminUploadDetail>(`/admin/uploads/${id}`),

  deleteFile: (id: string) => api.del<void>(`/admin/uploads/${id}`),

  listUsers: (params: {
    page?: number;
    pageSize?: number;
    search?: string;
    sort?: 'newest' | 'uploads' | 'storage';
  }) =>
    api.get<PaginatedResponse<AdminUserItem>>('/admin/users', {
      page: params.page,
      limit: params.pageSize,
      search: params.search,
      sort: params.sort,
    }),

  exportCsv: async (kind: 'files' | 'users' = 'files'): Promise<Blob> => {
    const res = await fetch(`/api/admin/export?type=${kind}`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Export failed');
    return res.blob();
  },
};
