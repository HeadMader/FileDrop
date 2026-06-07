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

  getDetail: (id: string) => api.get<UploadDetail>(`/uploads/${id}`),

  update: (id: string, body: UpdateUploadBody) =>
    api.patch<UploadDetail>(`/uploads/${id}`, body),

  remove: (id: string) => api.del<void>(`/uploads/${id}`),

  verifyPassword: (slug: string, body: VerifyPasswordBody) =>
    api.post<VerifyPasswordResponse>(`/uploads/${slug}/verify-password`, body),

  downloadUrl: (slug: string, token?: string) =>
    `/api/uploads/${slug}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`,
};
