import { onUnmounted, ref } from 'vue';
import type { ExpiresIn, UploadResult } from '@filedrop/shared';
import { ANON_MAX_FILE_SIZE, USER_MAX_FILE_SIZE, ANON_MAX_DOWNLOAD_LIMIT, USER_MAX_DOWNLOAD_LIMIT } from '@filedrop/shared';
import { uploadsApi } from '@/api/uploads.api';

interface Options {
  isAuthenticated: () => boolean;
}

export function useUpload(opts: Options) {
  const file = ref<File | null>(null);
  const expiresIn = ref<ExpiresIn>('24h');
  const limitMode = ref<'count' | 'unlimited'>('count');
  const downloadLimit = ref(5);
  const showPwd = ref(false);
  const password = ref('');
  const status = ref<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const progress = ref(0);
  const result = ref<UploadResult | null>(null);
  const error = ref<string | null>(null);
  const over = ref(false);

  let aborter: (() => void) | null = null;

  function maxSize(): number {
    return opts.isAuthenticated() ? USER_MAX_FILE_SIZE : ANON_MAX_FILE_SIZE;
  }
  function maxLimit(): number {
    return opts.isAuthenticated() ? USER_MAX_DOWNLOAD_LIMIT : ANON_MAX_DOWNLOAD_LIMIT;
  }

  function selectFile(f: File | null | undefined) {
    if (!f) return;
    if (f.size > maxSize()) {
      const m = opts.isAuthenticated() ? '500 MB' : '50 MB';
      error.value = `File exceeds ${m} limit.${opts.isAuthenticated() ? '' : ' Sign in for larger files.'}`;
      return;
    }
    error.value = null;
    file.value = f;
    status.value = 'idle';
    result.value = null;
  }

  function reset() {
    if (aborter) aborter();
    aborter = null;
    file.value = null;
    status.value = 'idle';
    progress.value = 0;
    result.value = null;
    error.value = null;
    password.value = '';
    showPwd.value = false;
    expiresIn.value = '24h';
    downloadLimit.value = 5;
    limitMode.value = 'count';
  }

  function cancel() {
    if (aborter) aborter();
    aborter = null;
    status.value = 'idle';
    progress.value = 0;
  }

  async function startUpload() {
    if (!file.value) return;
    status.value = 'uploading';
    progress.value = 0;
    error.value = null;
    try {
      const rawLimit = Math.max(1, Math.min(maxLimit(), Math.round(Number(downloadLimit.value))));
      const { promise, abort } = uploadsApi.create(
        file.value,
        {
          expiresIn: expiresIn.value,
          downloadLimit: limitMode.value === 'unlimited' ? null : rawLimit,
          password: showPwd.value && password.value.length >= 4 ? password.value : undefined,
        },
        (p) => {
          progress.value = p.percent;
        },
      );
      aborter = abort;
      result.value = await promise;
      status.value = 'done';
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed';
      error.value = msg;
      status.value = 'error';
    } finally {
      aborter = null;
    }
  }

  onUnmounted(() => {
    if (aborter) aborter();
  });

  return {
    file,
    expiresIn,
    limitMode,
    downloadLimit,
    showPwd,
    password,
    status,
    progress,
    result,
    error,
    over,
    selectFile,
    reset,
    cancel,
    startUpload,
    maxSize,
    maxLimit,
  };
}
