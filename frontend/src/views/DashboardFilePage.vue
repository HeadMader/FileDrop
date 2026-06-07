<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { UploadDetail } from '@filedrop/shared';
import { uploadsApi } from '@/api/uploads.api';
import { useToastStore } from '@/stores/toast.store';
import { useClipboard, useCountdown } from '@/composables/useUtils';
import { formatBytes, formatDateTime } from '@/utils/format';
import Card from '@/components/ui/Card.vue';
import Button from '@/components/ui/Button.vue';
import Icon from '@/components/ui/Icon.vue';
import IconButton from '@/components/ui/IconButton.vue';
import Badge from '@/components/ui/Badge.vue';
import Input from '@/components/ui/Input.vue';
import FileTypeIcon from '@/components/ui/FileTypeIcon.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import Spinner from '@/components/ui/Spinner.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';

const route = useRoute();
const router = useRouter();
const toast = useToastStore();
const { copy, copied } = useClipboard();

const detail = ref<UploadDetail | null>(null);
const loading = ref(true);
const notFound = ref(false);
const deleteOpen = ref(false);
const countdown = useCountdown(() => detail.value?.expiresAt ?? null);

async function load() {
  loading.value = true;
  try {
    detail.value = await uploadsApi.getDetail(route.params.id as string);
  } catch (e) {
    if ((e as { status?: number }).status === 404) notFound.value = true;
    else toast.push({ type: 'error', message: (e as Error).message });
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function shareUrl() {
  return detail.value ? `${window.location.origin}/s/${detail.value.slug}` : '';
}

async function copyShare() {
  await copy(shareUrl());
  toast.push({ type: 'success', message: 'Link copied' });
}

async function doDelete() {
  if (!detail.value) return;
  try {
    await uploadsApi.remove(detail.value.id);
    toast.push({ type: 'success', message: 'File deleted' });
    router.push('/dashboard');
  } catch (e) {
    toast.push({ type: 'error', message: (e as Error).message });
  }
}
</script>

<template>
  <div class="container container-narrow" style="padding: 32px 24px">
    <a
      href="/dashboard"
      class="link row"
      style="gap: 4px; font-size: 12px; margin-bottom: 16px"
      @click.prevent="router.push('/dashboard')"
    >
      <Icon name="arrow-l" :size="12" /> Back to dashboard
    </a>

    <div v-if="loading" style="padding: 40px; display: flex; justify-content: center">
      <Spinner :size="32" />
    </div>

    <Card v-else-if="notFound" pad="lg">
      <EmptyState icon="x" title="File not found" message="It may have been deleted." />
    </Card>

    <div v-else-if="detail" class="stack-lg">
      <Card pad="lg">
        <div class="row" style="gap: 14px; align-items: flex-start">
          <div
            style="width: 44px; height: 44px; border-radius: var(--r-md); background: var(--bg-muted); display: flex; align-items: center; justify-content: center; border: 1px solid var(--border)"
          >
            <FileTypeIcon :mime-type="detail.mimeType" :size="20" />
          </div>
          <div style="flex: 1; min-width: 0">
            <h1 class="h3" style="margin: 0; word-break: break-word">{{ detail.fileName }}</h1>
            <div class="muted" style="font-size: 13px; margin-top: 2px">
              {{ formatBytes(detail.fileSize) }} · {{ detail.mimeType || 'application/octet-stream' }}
            </div>
          </div>
          <div class="row" style="gap: 6px">
            <Button variant="ghost" size="sm" @click="copyShare">
              <template #icon><Icon name="copy" :size="12" /></template>
              Copy link
            </Button>
            <Button variant="ghost" size="sm" @click="deleteOpen = true">
              <template #icon><Icon name="trash" :size="12" /></template>
              Delete
            </Button>
          </div>
        </div>

        <div class="row" style="gap: 6px; flex-wrap: wrap; margin-top: 16px">
          <Badge :tone="detail.isExpired ? 'danger' : 'success'" dot>
            {{ detail.isExpired ? 'Expired' : 'Active' }}
          </Badge>
          <Badge mono outline>
            <Icon name="clock" :size="10" /> {{ countdown.text }}
          </Badge>
          <Badge v-if="detail.hasPassword" mono outline>
            <Icon name="lock" :size="10" /> Password
          </Badge>
          <Badge mono outline>
            <Icon name="download" :size="10" />
            {{ detail.downloadCount }}<span v-if="detail.downloadLimit != null"> / {{ detail.downloadLimit }}</span>
          </Badge>
        </div>
      </Card>

      <Card pad="lg">
        <div style="font-weight: 600; font-size: 14px; margin-bottom: 12px">Share link</div>
        <div class="row" style="gap: 6px">
          <Input :model-value="shareUrl()" mono />
          <Button variant="secondary" @click="copyShare">
            <template #icon><Icon :name="copied ? 'check' : 'copy'" :size="13" /></template>
            {{ copied ? 'Copied' : 'Copy' }}
          </Button>
        </div>
      </Card>

      <Card pad="lg">
        <div style="font-weight: 600; font-size: 14px; margin-bottom: 12px">File details</div>
        <dl style="display: grid; grid-template-columns: 140px 1fr; gap: 8px 16px; font-size: 13px; margin: 0">
          <dt class="muted">Slug</dt>
          <dd class="mono" style="margin: 0">{{ detail.slug }}</dd>
          <dt class="muted">Uploaded</dt>
          <dd style="margin: 0">{{ formatDateTime(detail.createdAt) }}</dd>
          <dt class="muted">Expires</dt>
          <dd style="margin: 0">{{ formatDateTime(detail.expiresAt) }}</dd>
          <template v-if="detail.checksum">
            <dt class="muted">SHA-256</dt>
            <dd class="mono" style="margin: 0; font-size: 11px; word-break: break-all">{{ detail.checksum }}</dd>
          </template>
        </dl>
      </Card>

      <Card pad="lg">
        <div style="font-weight: 600; font-size: 14px; margin-bottom: 12px">
          Recent downloads
          <span class="muted" style="font-weight: 400">({{ detail.downloads.length }})</span>
        </div>
        <EmptyState
          v-if="detail.downloads.length === 0"
          icon="download"
          title="No downloads yet"
          message="When someone downloads this file, it'll appear here."
        />
        <table v-else class="table">
          <thead>
            <tr>
              <th>When</th>
              <th>IP</th>
              <th>User agent</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in detail.downloads" :key="d.id">
              <td>{{ formatDateTime(d.createdAt) }}</td>
              <td class="mono">{{ d.ip || '—' }}</td>
              <td
                class="muted"
                style="font-size: 12px; max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap"
              >
                {{ d.userAgent || '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>

    <ConfirmDialog
      :open="deleteOpen"
      title="Delete this file?"
      :message="detail ? `Are you sure you want to delete \u201C${detail.fileName}\u201D? This action cannot be undone.` : ''"
      confirm-label="Delete"
      @close="deleteOpen = false"
      @confirm="doDelete"
    />
  </div>
</template>
