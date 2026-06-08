<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { ExpiresIn, UploadResult } from '@filedrop/shared';
import { ANON_EXPIRES_IN, USER_EXPIRES_IN } from '@filedrop/shared';
import { useAuthStore } from '@/stores/auth.store';
import { useRecentUploadsStore } from '@/stores/recent-uploads.store';
import { useToastStore } from '@/stores/toast.store';
import { useUpload } from '@/composables/useUpload';
import { useClipboard, useCountdown } from '@/composables/useUtils';
import { EXPIRATION_OPTIONS } from '@/utils/constants';
import { formatBytes, formatCountdown } from '@/utils/format';
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

const EXT_CHIPS = ['.pdf', '.zip', '.png', '.mp4', '.csv', '.any'];

const maxLabel = computed(() => (isAuth.value ? '500 MB' : '50 MB'));

const expirationOptions = computed(() =>
  EXPIRATION_OPTIONS.filter((o) =>
    (isAuth.value ? USER_EXPIRES_IN : ANON_EXPIRES_IN).includes(o.value as ExpiresIn),
  ),
);

// Live countdown for the freshly-created link.
const countdown = useCountdown(() => upload.result.value?.expiresAt ?? null);

function absoluteUrl(path: string): string {
  return typeof window !== 'undefined' ? window.location.origin + path : path;
}
const shareUrl = computed(() => (upload.result.value ? absoluteUrl(upload.result.value.shareUrl) : ''));

// Recent uploads with a (static) countdown badge, newest first.
const recentRows = computed(() =>
  recent.items.map((it) => ({ it, cd: formatCountdown(it.expiresAt) })),
);

function pickFile() {
  fileInput.value?.click();
}
function onFileChange(e: Event) {
  upload.selectFile((e.target as HTMLInputElement).files?.[0]);
}
function onDrop(e: DragEvent) {
  e.preventDefault();
  upload.over.value = false;
  upload.selectFile(e.dataTransfer?.files?.[0]);
}
function onDragOver(e: DragEvent) {
  e.preventDefault();
  upload.over.value = true;
}
function onDragLeave() {
  upload.over.value = false;
}

function onLimitInput(v: string) {
  const n = parseInt(v, 10) || 1;
  upload.downloadLimit.value = Math.max(1, Math.min(upload.maxLimit(), n));
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

async function copyShare() {
  if (!upload.result.value) return;
  await copy(shareUrl.value);
  toast.push({ type: 'success', message: 'Link copied to clipboard' });
}

function copyRecent(item: UploadResult) {
  copy(absoluteUrl(item.shareUrl));
  toast.push({ type: 'success', message: 'Link copied' });
}
</script>

<template>
  <div style="display: flex; flex-direction: column">
    <!-- ───────── Hero (full-bleed) ───────── -->
    <div
      class="bg-grid"
      style="
        position: relative;
        padding: 32px 24px 48px;
        border-bottom: 1px solid var(--border);
        background-color: var(--bg-subtle);
      "
    >
      <div class="container container-narrow" style="position: relative">
        <div class="stack-lg">
          <!-- badges -->
          <div class="row" style="gap: 8px; justify-content: center">
            <Badge mono outline><span class="badge-dot" style="color: var(--accent)" />encrypted</Badge>
            <Badge mono outline>no-account uploads</Badge>
            <Badge mono outline>{{ maxLabel }} free</Badge>
          </div>

          <!-- headline -->
          <h1 class="h1" style="text-align: center; font-size: 44px; font-weight: 600">
            Drop a file.<br />
            <span style="color: var(--text-muted)">Get a link in seconds.</span>
          </h1>

          <!-- idle: big drop zone -->
          <div v-if="upload.status.value === 'idle' && !upload.file.value" style="margin-top: 12px">
            <div
              :class="['dropzone', upload.over.value && 'over']"
              style="cursor: pointer; padding: 80px 32px; background: var(--bg); box-shadow: var(--shadow-md)"
              @click="pickFile"
              @drop="onDrop"
              @dragover="onDragOver"
              @dragleave="onDragLeave"
            >
              <input ref="fileInput" type="file" style="display: none" @change="onFileChange" />
              <div
                style="
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  gap: 16px;
                  pointer-events: none;
                "
              >
                <div
                  class="dz-icon"
                  :style="{
                    background: upload.over.value ? 'var(--accent-soft)' : 'var(--bg-muted)',
                    color: upload.over.value ? 'var(--accent)' : 'var(--text-muted)',
                  }"
                >
                  <Icon name="upload" :size="30" />
                </div>
                <div style="text-align: center">
                  <div style="font-size: 22px; font-weight: 500">
                    {{ upload.over.value ? 'Release to upload' : 'Drag a file anywhere here' }}
                  </div>
                  <div class="subtle" style="margin-top: 6px; font-size: 13px">
                    or <span class="link">browse from your computer</span> · max {{ maxLabel }}
                  </div>
                </div>
                <div class="row" style="gap: 6px; pointer-events: auto">
                  <span
                    v-for="ext in EXT_CHIPS"
                    :key="ext"
                    class="badge mono"
                    style="height: 20px; font-size: 10px"
                    >{{ ext }}</span
                  >
                </div>
              </div>
            </div>

            <div v-if="upload.error.value" class="upload-error" style="margin-top: 12px">
              <Icon name="x" :size="14" /><span>{{ upload.error.value }}</span>
            </div>
          </div>

          <!-- file selected / uploading / done -->
          <Card v-else pad="lg">
            <!-- Done → share result -->
            <div v-if="upload.status.value === 'done' && upload.result.value" class="stack-lg">
              <div class="row" style="gap: 12px">
                <div
                  style="
                    width: 36px;
                    height: 36px;
                    border-radius: var(--r-md);
                    background: var(--success-soft);
                    color: var(--success);
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                  "
                >
                  <Icon name="check" :size="18" />
                </div>
                <div style="flex: 1">
                  <div class="h4">Ready to share</div>
                  <div class="subtle" style="font-size: 13px; margin-top: 2px">
                    Your link expires in
                    <span class="mono" style="color: var(--text)">{{ countdown.text }}</span>
                    <template v-if="upload.result.value.downloadLimit">
                      · <span class="mono" style="color: var(--text)">{{ upload.result.value.downloadLimit }}</span> downloads
                    </template>
                    <template v-else> · unlimited downloads</template>
                  </div>
                </div>
              </div>

              <div class="row" style="align-items: stretch; gap: 16px; flex-wrap: wrap">
                <div style="flex: 1 1 320px; display: flex; flex-direction: column; gap: 10px">
                  <!-- url bar -->
                  <div
                    style="
                      display: flex;
                      align-items: stretch;
                      border: 1px solid var(--border-strong);
                      border-radius: var(--r-md);
                      overflow: hidden;
                      background: var(--bg-subtle);
                    "
                  >
                    <div
                      class="mono ellipsis"
                      style="flex: 1; padding: 10px 12px; font-size: 13px; color: var(--text)"
                    >
                      {{ shareUrl }}
                    </div>
                    <button
                      class="row"
                      :style="{
                        padding: '0 14px',
                        borderLeft: '1px solid var(--border-strong)',
                        background: copied ? 'var(--success-soft)' : 'var(--bg-elevated)',
                        color: copied ? 'var(--success)' : 'var(--text)',
                        fontSize: '12.5px',
                        fontWeight: 500,
                        gap: '6px',
                        transition: 'background .15s',
                      }"
                      @click="copyShare"
                    >
                      <template v-if="copied"><Icon name="check" :size="13" />Copied</template>
                      <template v-else><Icon name="copy" :size="13" />Copy</template>
                    </button>
                  </div>

                  <!-- file + expiry summary -->
                  <div class="grid-2" style="gap: 8px">
                    <div class="card card-pad-sm row" style="gap: 8px; padding: 12px">
                      <FileTypeIcon :mime-type="upload.result.value.mimeType" :size="18" />
                      <div style="min-width: 0">
                        <div class="mono ellipsis" style="font-size: 12px">
                          {{ upload.result.value.fileName }}
                        </div>
                        <div class="subtle mono" style="font-size: 11px">
                          {{ formatBytes(upload.result.value.fileSize) }}
                        </div>
                      </div>
                    </div>
                    <div class="card card-pad-sm" style="padding: 12px">
                      <div class="subtle" style="font-size: 11px">Expires in</div>
                      <div class="mono" style="font-size: 13px; margin-top: 2px">{{ countdown.text }}</div>
                    </div>
                  </div>

                  <!-- badges -->
                  <div class="row" style="gap: 6px; margin-top: 4px">
                    <Badge v-if="upload.result.value.hasPassword" tone="warning" dot>password</Badge>
                    <Badge tone="success" dot>active</Badge>
                    <Badge mono outline>{{ upload.result.value.slug }}</Badge>
                  </div>
                </div>

                <!-- QR -->
                <div
                  style="
                    flex: 0 0 auto;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                  "
                >
                  <QRCode :value="shareUrl" :size="132" />
                  <div class="subtle mono" style="font-size: 10px">Scan to download</div>
                </div>
              </div>

              <hr />

              <div class="row-between">
                <Button variant="ghost" @click="upload.reset()">
                  <template #icon><Icon name="plus" :size="14" /></template>
                  Upload another
                </Button>
                <div class="row" style="gap: 6px">
                  <Button variant="secondary" @click="router.push(upload.result.value.shareUrl)">
                    <template #icon><Icon name="eye" :size="14" /></template>
                    Preview
                  </Button>
                </div>
              </div>
            </div>

            <!-- Uploading → progress -->
            <div v-else-if="upload.status.value === 'uploading'" class="stack-lg">
              <div class="row" style="gap: 12px; align-items: flex-start">
                <div style="flex: 0 0 auto; padding-top: 2px">
                  <FileTypeIcon :mime-type="upload.file.value?.type" :size="22" />
                </div>
                <div style="flex: 1">
                  <div class="mono" style="font-size: 13px; margin-bottom: 6px">
                    {{ upload.file.value?.name }}
                  </div>
                  <div class="progress">
                    <div class="progress-bar" :style="{ width: `${upload.progress.value}%` }" />
                  </div>
                  <div class="row-between subtle" style="margin-top: 6px; font-size: 12px">
                    <span class="mono">
                      {{ formatBytes((upload.file.value?.size || 0) * upload.progress.value / 100) }} /
                      {{ formatBytes(upload.file.value?.size || 0) }}
                    </span>
                    <span class="mono">{{ Math.round(upload.progress.value) }}%</span>
                  </div>
                </div>
              </div>
              <div class="row-between">
                <div class="row subtle" style="gap: 6px; font-size: 12px">
                  <span class="pulse-dot" />
                  Uploading…
                </div>
                <Button variant="ghost" size="sm" @click="upload.cancel()">
                  <template #icon><Icon name="x" :size="13" /></template>
                  Cancel
                </Button>
              </div>
            </div>

            <!-- File selected → upload form -->
            <div v-else class="stack-lg">
              <!-- file row -->
              <div class="row card card-pad-sm" style="gap: 12px; padding: 14px">
                <div style="flex: 0 0 auto"><FileTypeIcon :mime-type="upload.file.value?.type" :size="22" /></div>
                <div style="flex: 1; min-width: 0">
                  <div class="mono ellipsis" style="font-size: 13px; color: var(--text)">
                    {{ upload.file.value?.name }}
                  </div>
                  <div class="subtle" style="font-size: 12px; margin-top: 2px">
                    {{ formatBytes(upload.file.value?.size || 0) }} · {{ upload.file.value?.type || 'unknown' }}
                  </div>
                </div>
                <IconButton icon="x" :icon-size="14" size="md" label="Remove file" @click="upload.reset()" />
              </div>

              <div v-if="upload.error.value" class="upload-error">
                <Icon name="x" :size="14" /><span>{{ upload.error.value }}</span>
              </div>

              <!-- options -->
              <div class="grid-2">
                <Field>
                  <template #label><Icon name="clock" :size="12" /> Expiration</template>
                  <div style="display: flex; flex-wrap: wrap; gap: 6px">
                    <button
                      v-for="o in expirationOptions"
                      :key="o.value"
                      type="button"
                      :class="['btn', 'btn-sm', upload.expiresIn.value === o.value ? 'btn-primary' : 'btn-secondary']"
                      style="border-radius: var(--r-pill); height: 28px"
                      @click="upload.expiresIn.value = o.value"
                    >
                      {{ o.label }}
                    </button>
                  </div>
                </Field>

                <Field>
                  <template #label><Icon name="download" :size="12" /> Download limit</template>
                  <div class="row" style="gap: 8px">
                    <Input
                      type="number"
                      :model-value="upload.limitMode.value === 'unlimited' ? '' : upload.downloadLimit.value"
                      :disabled="upload.limitMode.value === 'unlimited'"
                      :min="1"
                      :max="upload.maxLimit()"
                      placeholder="—"
                      style="flex: 0 1 120px"
                      @update:model-value="onLimitInput"
                    />
                    <Toggle
                      v-if="isAuth"
                      :model-value="upload.limitMode.value === 'unlimited'"
                      label="No limit"
                      @update:model-value="(v) => (upload.limitMode.value = v ? 'unlimited' : 'count')"
                    />
                  </div>
                </Field>
              </div>

              <!-- password (authenticated only) -->
              <Field v-if="isAuth">
                <div class="row" :style="{ marginBottom: upload.showPwd.value ? '8px' : '0' }">
                  <Toggle v-model="upload.showPwd.value">
                    <span class="row" style="gap: 6px"><Icon name="lock" :size="12" /> Password-protect</span>
                  </Toggle>
                </div>
                <Input
                  v-if="upload.showPwd.value"
                  v-model="upload.password.value"
                  type="password"
                  placeholder="4–72 characters"
                  autofocus
                />
              </Field>

              <div class="row-between" style="padding-top: 4px">
                <div class="mono subtle" style="font-size: 12px"><span>POST /api/uploads</span></div>
                <Button variant="primary" @click="startUpload">
                  <template #icon><Icon name="upload" :size="14" /></template>
                  Upload &amp; create link
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>

    <!-- ───────── Recent uploads ───────── -->
    <div v-if="recentRows.length" class="container container-narrow" style="padding: 24px 24px 0">
      <Card pad="none">
        <div class="row-between" style="padding: 12px 16px; border-bottom: 1px solid var(--border)">
          <div class="row" style="gap: 8px">
            <div class="h4" style="font-size: 13px">Recent uploads</div>
            <Badge mono outline>{{ recentRows.length }}</Badge>
          </div>
          <div class="subtle" style="font-size: 11px">Stored locally · last 10</div>
        </div>
        <div>
          <div
            v-for="(row, i) in recentRows"
            :key="row.it.id"
            class="row"
            :style="{
              padding: '10px 16px',
              gap: '12px',
              borderBottom: i < recentRows.length - 1 ? '1px solid var(--border)' : 'none',
              opacity: row.cd.expired ? 0.5 : 1,
            }"
          >
            <FileTypeIcon :mime-type="row.it.mimeType" :size="16" />
            <div style="flex: 1; min-width: 0">
              <div class="mono ellipsis" style="font-size: 12.5px">{{ row.it.fileName }}</div>
              <div class="subtle mono" style="font-size: 11px; margin-top: 1px">
                /s/{{ row.it.slug }} · {{ formatBytes(row.it.fileSize) }} ·
                {{ row.cd.expired ? 'expired' : `expires in ${row.cd.text}` }}
              </div>
            </div>
            <Badge :tone="row.cd.expired ? 'default' : 'success'" :dot="!row.cd.expired">
              {{ row.cd.expired ? 'expired' : 'active' }}
            </Badge>
            <IconButton icon="copy" :icon-size="13" label="Copy link" @click="copyRecent(row.it)" />
            <IconButton icon="chev-r" :icon-size="13" label="Open" @click="router.push(`/s/${row.it.slug}`)" />
          </div>
        </div>
      </Card>
    </div>
  </div>
</template>

<style scoped>
.dz-icon {
  width: 72px;
  height: 72px;
  border-radius: var(--r-xl);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  transition: all 0.15s;
}

.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upload-error {
  padding: 10px 12px;
  background: var(--danger-soft);
  color: var(--danger);
  border-radius: var(--r-md);
  font-size: 13px;
  display: flex;
  gap: 8px;
  align-items: center;
}

.pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

@media (max-width: 720px) {
  .h1 {
    font-size: 32px !important;
  }
}
</style>
