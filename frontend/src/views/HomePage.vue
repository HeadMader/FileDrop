<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { ExpiresIn } from '@filedrop/shared';
import { ANON_EXPIRES_IN, USER_EXPIRES_IN } from '@filedrop/shared';
import { useAuthStore } from '@/stores/auth.store';
import { useRecentUploadsStore } from '@/stores/recent-uploads.store';
import { useToastStore } from '@/stores/toast.store';
import { useUpload } from '@/composables/useUpload';
import { useClipboard } from '@/composables/useUtils';
import { EXPIRATION_OPTIONS } from '@/utils/constants';
import { formatBytes, formatRelative } from '@/utils/format';
import Card from '@/components/ui/Card.vue';
import Button from '@/components/ui/Button.vue';
import Icon from '@/components/ui/Icon.vue';
import IconButton from '@/components/ui/IconButton.vue';
import Field from '@/components/ui/Field.vue';
import Input from '@/components/ui/Input.vue';
import Toggle from '@/components/ui/Toggle.vue';
import Badge from '@/components/ui/Badge.vue';
import FileTypeIcon from '@/components/ui/FileTypeIcon.vue';
import QRCode from '@/components/ui/QRCode.vue';

const auth = useAuthStore();
const router = useRouter();
const toast = useToastStore();
const recent = useRecentUploadsStore();
const { copy, copied } = useClipboard();

const isAuth = computed(() => auth.isAuthenticated);
const upload = useUpload({ isAuthenticated: () => isAuth.value });

const fileInput = ref<HTMLInputElement | null>(null);
const showQR = ref(false);

const expirationOptions = computed(() =>
  EXPIRATION_OPTIONS.filter((o) =>
    (isAuth.value ? USER_EXPIRES_IN : ANON_EXPIRES_IN).includes(o.value as ExpiresIn),
  ),
);

function pickFile() {
  fileInput.value?.click();
}
function onFileChange(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0];
  upload.selectFile(f);
}
function onDrop(e: DragEvent) {
  e.preventDefault();
  upload.over.value = false;
  const f = e.dataTransfer?.files?.[0];
  upload.selectFile(f);
}
function onDragOver(e: DragEvent) {
  e.preventDefault();
  upload.over.value = true;
}
function onDragLeave() {
  upload.over.value = false;
}

async function copyShare() {
  if (!upload.result.value) return;
  await copy(upload.result.value.shareUrl);
  toast.push({ type: 'success', message: 'Link copied' });
}

async function startUpload() {
  await upload.startUpload();
  if (upload.status.value === 'done' && upload.result.value) {
    recent.add(upload.result.value);
    toast.push({ type: 'success', message: 'Upload complete' });
  } else if (upload.status.value === 'error') {
    toast.push({ type: 'error', message: upload.error.value || 'Upload failed' });
  }
}

function copyRecent(url: string) {
  copy(url);
  toast.push({ type: 'success', message: 'Link copied' });
}

const downloadLimitMax = computed(() => upload.maxLimit());
</script>

<template>
  <div class="bg-grid" style="position: relative">
    <section class="container container-narrow" style="padding: 64px 24px 24px; text-align: center">
      <div class="eyebrow" style="margin-bottom: 12px">
        Self-hosted · End-to-end secured · Open source
      </div>
      <h1 class="h1" style="margin-bottom: 12px">Send files. No friction.</h1>
      <p class="muted" style="font-size: 15px; max-width: 540px; margin: 0 auto">
        Upload any file, share a short link, and let the file self-destruct on expiry or
        after the download limit. No accounts required.
      </p>
    </section>

    <section class="container container-narrow" style="padding-bottom: 16px">
      <Card pad="lg">
        <!-- Result -->
        <div v-if="upload.status.value === 'done' && upload.result.value" class="stack-lg">
          <div class="row" style="gap: 12px; align-items: flex-start">
            <div
              style="width: 36px; height: 36px; border-radius: var(--r-md); background: var(--success-soft); color: var(--success); display: flex; align-items: center; justify-content: center; border: 1px solid var(--success-soft-border)"
            >
              <Icon name="check" :size="16" />
            </div>
            <div style="flex: 1">
              <div style="font-weight: 600; font-size: 15px">Upload complete</div>
              <div class="muted" style="font-size: 13px; margin-top: 2px">
                {{ upload.result.value.fileName }} · {{ formatBytes(upload.result.value.fileSize) }}
              </div>
            </div>
            <IconButton icon="x" :icon-size="13" label="Close" @click="upload.reset()" />
          </div>

          <Field label="Share link">
            <div class="row" style="gap: 6px">
              <Input :model-value="upload.result.value.shareUrl" mono :disabled="false" />
              <Button variant="secondary" size="md" @click="copyShare">
                <template #icon><Icon :name="copied ? 'check' : 'copy'" :size="13" /></template>
                {{ copied ? 'Copied' : 'Copy' }}
              </Button>
              <Button variant="ghost" size="md" :icon-only="true" @click="showQR = !showQR">
                <Icon name="qr" :size="14" />
              </Button>
            </div>
          </Field>

          <div v-if="showQR" style="display: flex; justify-content: center">
            <QRCode :value="upload.result.value.shareUrl" :size="160" />
          </div>

          <div class="row" style="gap: 8px; flex-wrap: wrap">
            <Badge tone="success" dot>Active</Badge>
            <Badge mono outline>Expires in {{ upload.expiresIn.value }}</Badge>
            <Badge v-if="upload.result.value.downloadLimit != null" mono outline>
              {{ upload.result.value.downloadLimit }} downloads
            </Badge>
            <Badge v-if="upload.result.value.hasPassword" mono outline>
              <Icon name="lock" :size="10" /> Password
            </Badge>
          </div>

          <div class="row" style="gap: 8px">
            <Button variant="secondary" @click="upload.reset()">Upload another</Button>
            <Button v-if="isAuth" variant="ghost" @click="router.push('/dashboard')">Open dashboard</Button>
          </div>
        </div>

        <!-- Uploading -->
        <div v-else-if="upload.status.value === 'uploading'" class="stack-lg">
          <div class="row" style="gap: 12px">
            <FileTypeIcon :mime-type="upload.file.value?.type" :size="22" />
            <div style="flex: 1">
              <div style="font-weight: 500; font-size: 14px">{{ upload.file.value?.name }}</div>
              <div class="muted" style="font-size: 12px">
                {{ formatBytes(upload.file.value?.size || 0) }} · {{ Math.round(upload.progress.value) }}%
              </div>
            </div>
            <IconButton icon="x" :icon-size="13" label="Cancel" @click="upload.cancel()" />
          </div>
          <div class="progress">
            <div class="progress-bar" :style="{ width: `${upload.progress.value}%` }" />
          </div>
        </div>

        <!-- Form -->
        <div v-else class="stack-lg">
          <input
            ref="fileInput"
            type="file"
            style="display: none"
            @change="onFileChange"
          />

          <div
            v-if="!upload.file.value"
            :class="['dropzone', upload.over.value && 'over']"
            @click="pickFile"
            @drop="onDrop"
            @dragover="onDragOver"
            @dragleave="onDragLeave"
          >
            <Icon name="upload" :size="22" style="color: var(--text-subtle); margin-bottom: 10px" />
            <div style="font-weight: 500; font-size: 14px">
              Drop a file or <span class="link">browse</span>
            </div>
            <div class="muted" style="font-size: 12px; margin-top: 4px">
              Max {{ isAuth ? '500 MB' : '50 MB' }}
            </div>
          </div>

          <div
            v-else
            class="row"
            style="gap: 12px; padding: 12px; border: 1px solid var(--border); border-radius: var(--r-md); background: var(--bg-subtle)"
          >
            <FileTypeIcon :mime-type="upload.file.value.type" :size="22" />
            <div style="flex: 1">
              <div style="font-weight: 500; font-size: 14px">{{ upload.file.value.name }}</div>
              <div class="muted" style="font-size: 12px">{{ formatBytes(upload.file.value.size) }}</div>
            </div>
            <IconButton icon="x" :icon-size="13" label="Remove" @click="upload.selectFile(null as unknown as File)" />
          </div>

          <div v-if="upload.error.value" class="error-msg">{{ upload.error.value }}</div>

          <div class="grid-2" style="gap: 12px">
            <Field label="Expires in">
              <select v-model="upload.expiresIn.value" class="select">
                <option v-for="o in expirationOptions" :key="o.value" :value="o.value">
                  {{ o.label }}
                </option>
              </select>
            </Field>
            <Field label="Download limit">
              <div class="row" style="gap: 6px">
                <Input
                  v-model="upload.downloadLimit.value"
                  type="number"
                  :min="1"
                  :max="downloadLimitMax"
                  mono
                  :disabled="upload.limitMode.value === 'unlimited'"
                />
                <Toggle
                  :model-value="upload.limitMode.value === 'unlimited'"
                  @update:model-value="(v) => (upload.limitMode.value = v ? 'unlimited' : 'count')"
                >∞</Toggle>
              </div>
            </Field>
          </div>

          <div>
            <Toggle v-model="upload.showPwd.value" label="Password protect (optional)" />
            <Input
              v-if="upload.showPwd.value"
              v-model="upload.password.value"
              type="password"
              placeholder="At least 4 characters"
              :minlength="4"
              style="margin-top: 8px"
            />
          </div>

          <Button variant="primary" :block="true" :disabled="!upload.file.value" @click="startUpload">
            <template #icon><Icon name="upload" :size="14" /></template>
            Upload &amp; get link
          </Button>

          <p v-if="!isAuth" class="muted" style="font-size: 12px; text-align: center; margin: 0">
            <a href="/signup" class="link" @click.prevent="router.push('/signup')">Create an account</a>
            for 500 MB uploads, longer expirations &amp; a dashboard.
          </p>
        </div>
      </Card>
    </section>

    <!-- Recent -->
    <section v-if="recent.items.length > 0" class="container container-narrow" style="padding-top: 16px">
      <div class="row-between" style="margin-bottom: 12px">
        <h2 class="h4" style="margin: 0">Recent uploads</h2>
        <button class="btn btn-ghost btn-sm" @click="recent.clear()">Clear</button>
      </div>
      <div class="stack-sm">
        <Card v-for="it in recent.items" :key="it.id" pad="sm">
          <div class="row" style="gap: 12px">
            <FileTypeIcon :mime-type="it.mimeType" :size="18" />
            <div style="flex: 1; min-width: 0">
              <div style="font-weight: 500; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">
                {{ it.fileName }}
              </div>
              <div class="muted" style="font-size: 11px">
                {{ formatBytes(it.fileSize) }} · {{ formatRelative(it.createdAt) }}
              </div>
            </div>
            <Button variant="ghost" size="sm" @click="copyRecent(it.shareUrl)">
              <template #icon><Icon name="copy" :size="12" /></template>
              Copy
            </Button>
          </div>
        </Card>
      </div>
    </section>
  </div>
</template>

<style scoped>
.stack-sm > * + * {
  margin-top: 8px;
}
</style>
