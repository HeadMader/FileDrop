import type {
  UploadResult,
  UploadDetail,
  FileMetadata,
  UpdateUploadBody,
  VerifyPasswordBody,
  VerifyPasswordResponse,
} from '@filedrop/shared';
import { api, uploadFile, type UploadProgress } from './client';

export const uploadsApi = {
  create(
    file: File,
    options: {
      expiresIn: string;
      downloadLimit?: number | null;
      password?: string;
    },
    onProgress?: (p: UploadProgress) => void,
  ) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('expiresIn', options.expiresIn);
    if (options.downloadLimit != null) {
      fd.append('downloadLimit', String(options.downloadLimit));
    }
    if (options.password) fd.append('password', options.password);
    return uploadFile<UploadResult>('/uploads', fd, onProgress);
  },

  getMeta: (slug: string) => api.get<FileMetadata>(`/uploads/${slug}`),

  // Owner-scoped detail/update/delete live under the dashboard controller
  // (`/dashboard/uploads/:id`), not the public `/uploads/:slug` resource.
  getDetail: (id: string) => api.get<UploadDetail>(`/dashboard/uploads/${id}`),

  update: (id: string, body: UpdateUploadBody) =>
    api.patch<UploadDetail>(`/dashboard/uploads/${id}`, body),

  remove: (id: string) => api.del<void>(`/dashboard/uploads/${id}`),

  verifyPassword: (slug: string, body: VerifyPasswordBody) =>
    api.post<VerifyPasswordResponse>(`/uploads/${slug}/verify-password`, body),

  downloadUrl: (slug: string, token?: string) =>
    `/api/uploads/${slug}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`,
};
