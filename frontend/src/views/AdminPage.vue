<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import type { AdminUploadItem, DailyCount } from '@filedrop/shared';
import { useAdminStore } from '@/stores/admin.store';
import { useToastStore } from '@/stores/toast.store';
import { useClipboard } from '@/composables/useUtils';
import { formatBytes, formatDate } from '@/utils/format';
import Card from '@/components/ui/Card.vue';
import Button from '@/components/ui/Button.vue';
import Icon from '@/components/ui/Icon.vue';
import IconButton from '@/components/ui/IconButton.vue';
import Badge from '@/components/ui/Badge.vue';
import Input from '@/components/ui/Input.vue';
import Toggle from '@/components/ui/Toggle.vue';
import Pagination from '@/components/ui/Pagination.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import MiniBarChart from '@/components/ui/MiniBarChart.vue';
import MiniLineChart from '@/components/ui/MiniLineChart.vue';
import FileTypeIcon from '@/components/ui/FileTypeIcon.vue';
import Spinner from '@/components/ui/Spinner.vue';

const store = useAdminStore();
const toast = useToastStore();
const { copy } = useClipboard();

type Tab = 'overview' | 'files' | 'users';
const tab = ref<Tab>('overview');

const fileSearchInput = ref('');
const userSearchInput = ref('');
let ft: ReturnType<typeof setTimeout> | null = null;
let ut: ReturnType<typeof setTimeout> | null = null;

watch(fileSearchInput, (v) => {
  if (ft) clearTimeout(ft);
  ft = setTimeout(() => {
    store.filesSearch = v;
    store.filesPage = 1;
    store.fetchFiles();
  }, 250);
});
watch(userSearchInput, (v) => {
  if (ut) clearTimeout(ut);
  ut = setTimeout(() => {
    store.usersSearch = v;
    store.usersPage = 1;
    store.fetchUsers();
  }, 250);
});

onMounted(() => store.fetchOverview());

watch(tab, (t) => {
  if (t === 'overview' && !store.stats) store.fetchOverview();
  if (t === 'files' && store.files.length === 0) store.fetchFiles();
  if (t === 'users' && store.users.length === 0) store.fetchUsers();
});

const deleteTarget = ref<AdminUploadItem | null>(null);
async function confirmDelete() {
  if (!deleteTarget.value) return;
  try {
    await store.deleteFile(deleteTarget.value.id);
    toast.push({ type: 'success', message: 'File force-deleted' });
  } catch (e) {
    toast.push({ type: 'error', message: (e as Error).message });
  } finally {
    deleteTarget.value = null;
  }
}

const fmtNum = (n?: number | null) => (n ?? 0).toLocaleString();

type Delta = { label: string; tone: 'success' | 'danger' | 'default' };
function deltaInfo(today?: number, yesterday?: number): Delta {
  if (today == null || yesterday == null || yesterday === 0) return { label: '—', tone: 'default' };
  const pct = Math.round(((today - yesterday) / yesterday) * 100);
  return { label: `${pct >= 0 ? '+' : ''}${pct}%`, tone: pct >= 0 ? 'success' : 'danger' };
}
const uploadsDelta = computed(() => deltaInfo(store.stats?.uploadsToday, store.stats?.uploadsYesterday));
const downloadsDelta = computed(() => deltaInfo(store.stats?.downloadsToday, store.stats?.downloadsYesterday));

function sumCounts(data?: DailyCount[]): number {
  return (data ?? []).reduce((a, d) => a + d.count, 0);
}
function trendInfo(data?: DailyCount[]): { label: string; color: string } {
  if (!data || data.length < 4) return { label: '', color: 'var(--success)' };
  const half = Math.floor(data.length / 2);
  const first = data.slice(0, half).reduce((a, d) => a + d.count, 0);
  const second = data.slice(half).reduce((a, d) => a + d.count, 0);
  if (first === 0) return { label: '', color: 'var(--success)' };
  const pct = Math.round(((second - first) / first) * 100);
  return { label: `${pct >= 0 ? '+' : ''}${pct}%`, color: pct >= 0 ? 'var(--success)' : 'var(--danger)' };
}
const uploadsTotal = computed(() => sumCounts(store.stats?.uploadsPerDay));
const downloadsTotal = computed(() => sumCounts(store.stats?.downloadsPerDay));
const uploadsTrend = computed(() => trendInfo(store.stats?.uploadsPerDay));
const downloadsTrend = computed(() => trendInfo(store.stats?.downloadsPerDay));

function onAnonToggle(v: boolean) {
  store.filesAnon = v;
  store.filesPage = 1;
  store.fetchFiles();
}
function onFilesSort(e: Event) {
  store.filesSort = (e.target as HTMLSelectElement).value as 'newest' | 'largest' | 'most';
  store.filesPage = 1;
  store.fetchFiles();
}
function onFilesPage(p: number) {
  store.filesPage = p;
  store.fetchFiles();
}
function onUsersSort(e: Event) {
  store.usersSort = (e.target as HTMLSelectElement).value as 'newest' | 'uploads' | 'storage';
  store.usersPage = 1;
  store.fetchUsers();
}
function onUsersPage(p: number) {
  store.usersPage = p;
  store.fetchUsers();
}
function copyFileLink(slug: string) {
  copy(`${window.location.origin}/s/${slug}`);
  toast.push({ type: 'success', message: 'Link copied' });
}
</script>

<template>
  <div class="container container-wide" style="padding: 32px 24px">
    <div class="stack-lg">
      <!-- header -->
      <div class="row-between">
        <div>
          <div class="row" style="gap: 8px">
            <div class="eyebrow">filedrop / admin</div>
            <Badge tone="accent" mono><Icon name="shield" :size="10" />elevated</Badge>
          </div>
          <h1 class="h2" style="margin-top: 4px">Admin panel</h1>
          <p class="subtle" style="font-size: 13.5px; margin-top: 4px">
            System-wide statistics, file moderation, and user management.
          </p>
        </div>
        <Button variant="secondary" @click="store.exportCsv(tab === 'users' ? 'users' : 'files')">
          <template #icon><Icon name="download" :size="13" /></template>
          Export CSV
        </Button>
      </div>

      <!-- tabs -->
      <div class="tabs">
        <button :class="['tab', tab === 'overview' && 'active']" @click="tab = 'overview'">
          <Icon name="bar" :size="13" />Overview
        </button>
        <button :class="['tab', tab === 'files' && 'active']" @click="tab = 'files'">
          <Icon name="file" :size="13" />Files
        </button>
        <button :class="['tab', tab === 'users' && 'active']" @click="tab = 'users'">
          <Icon name="users" :size="13" />Users
        </button>
      </div>

      <!-- ───────── Overview ───────── -->
      <div v-if="tab === 'overview'" class="stack-lg">
        <!-- primary stats -->
        <div class="admin-stat-grid">
          <div class="card card-pad-sm" style="padding: 18px">
            <div class="row-between" style="margin-bottom: 6px">
              <span class="stat-label">Total files</span>
              <span style="color: var(--text-faint)"><Icon name="file" :size="15" /></span>
            </div>
            <div class="stat-value-lg">{{ fmtNum(store.stats?.totalFiles) }}</div>
            <div class="subtle" style="font-size: 12px; margin-top: 3px">
              <span class="mono" style="color: var(--success)">{{ fmtNum(store.stats?.activeFiles) }}</span> active ·
              <span class="mono">{{ fmtNum(store.stats?.expiredFiles) }}</span> expired
            </div>
          </div>
          <div class="card card-pad-sm" style="padding: 18px">
            <div class="row-between" style="margin-bottom: 6px">
              <span class="stat-label">Total users</span>
              <span style="color: var(--text-faint)"><Icon name="users" :size="15" /></span>
            </div>
            <div class="stat-value-lg">{{ fmtNum(store.stats?.totalUsers) }}</div>
            <div class="subtle" style="font-size: 12px; margin-top: 3px">
              of which {{ fmtNum(store.stats?.totalAdmins) }} admins
            </div>
          </div>
          <div class="card card-pad-sm" style="padding: 18px">
            <div class="row-between" style="margin-bottom: 6px">
              <span class="stat-label">Anon uploads</span>
              <span style="color: var(--text-faint)"><Icon name="globe" :size="15" /></span>
            </div>
            <div class="stat-value-lg">{{ fmtNum(store.stats?.totalAnonymousUploads) }}</div>
            <div class="subtle" style="font-size: 12px; margin-top: 3px">all-time · no account</div>
          </div>
          <div class="card card-pad-sm" style="padding: 18px">
            <div class="row-between" style="margin-bottom: 6px">
              <span class="stat-label">Storage</span>
              <span style="color: var(--text-faint)"><Icon name="database" :size="15" /></span>
            </div>
            <div class="stat-value-lg">{{ formatBytes(store.stats?.totalStorageBytes) }}</div>
            <div class="subtle" style="font-size: 12px; margin-top: 3px">across all uploads</div>
          </div>
        </div>

        <!-- secondary stats -->
        <div class="admin-stat-grid">
          <div class="card card-pad-sm" style="padding: 14px">
            <div class="row-between" style="margin-bottom: 6px">
              <span class="stat-label">Uploads today</span>
              <span style="color: var(--text-faint)"><Icon name="upload" :size="14" /></span>
            </div>
            <div class="stat-value-sm">{{ fmtNum(store.stats?.uploadsToday) }}</div>
            <div class="subtle" style="font-size: 12px; margin-top: 3px">
              <Badge :tone="uploadsDelta.tone" mono>{{ uploadsDelta.label }}</Badge> vs yesterday
            </div>
          </div>
          <div class="card card-pad-sm" style="padding: 14px">
            <div class="row-between" style="margin-bottom: 6px">
              <span class="stat-label">Downloads today</span>
              <span style="color: var(--text-faint)"><Icon name="download" :size="14" /></span>
            </div>
            <div class="stat-value-sm">{{ fmtNum(store.stats?.downloadsToday) }}</div>
            <div class="subtle" style="font-size: 12px; margin-top: 3px">
              <Badge :tone="downloadsDelta.tone" mono>{{ downloadsDelta.label }}</Badge> vs yesterday
            </div>
          </div>
          <div class="card card-pad-sm" style="padding: 14px">
            <div class="row-between" style="margin-bottom: 6px">
              <span class="stat-label">Total downloads</span>
              <span style="color: var(--text-faint)"><Icon name="activity" :size="14" /></span>
            </div>
            <div class="stat-value-sm">{{ fmtNum(store.stats?.totalDownloads) }}</div>
            <div class="subtle" style="font-size: 12px; margin-top: 3px">all-time</div>
          </div>
          <div class="card card-pad-sm" style="padding: 14px">
            <div class="row-between" style="margin-bottom: 6px">
              <span class="stat-label">Avg file size</span>
              <span style="color: var(--text-faint)"><Icon name="bar" :size="14" /></span>
            </div>
            <div class="stat-value-sm">{{ formatBytes(store.stats?.avgFileSizeBytes) }}</div>
            <div class="subtle" style="font-size: 12px; margin-top: 3px">trailing 30d</div>
          </div>
        </div>

        <!-- charts -->
        <div class="admin-chart-grid">
          <Card pad="none">
            <div class="row-between" style="padding: 14px 18px; border-bottom: 1px solid var(--border)">
              <div>
                <div class="h4" style="font-size: 14px">Uploads — last 30 days</div>
                <div class="subtle mono" style="font-size: 11px">
                  {{ fmtNum(uploadsTotal) }} total
                  <template v-if="uploadsTrend.label">
                    · <span :style="{ color: uploadsTrend.color }">{{ uploadsTrend.label }}</span>
                  </template>
                </div>
              </div>
              <Badge mono outline>30d</Badge>
            </div>
            <div style="padding: 16px">
              <MiniBarChart v-if="store.stats" :data="store.stats.uploadsPerDay" label="Uploads" :height="160" />
            </div>
          </Card>
          <Card pad="none">
            <div class="row-between" style="padding: 14px 18px; border-bottom: 1px solid var(--border)">
              <div>
                <div class="h4" style="font-size: 14px">Downloads — last 30 days</div>
                <div class="subtle mono" style="font-size: 11px">
                  {{ fmtNum(downloadsTotal) }} total
                  <template v-if="downloadsTrend.label">
                    · <span :style="{ color: downloadsTrend.color }">{{ downloadsTrend.label }}</span>
                  </template>
                </div>
              </div>
              <Badge mono outline>30d</Badge>
            </div>
            <div style="padding: 16px">
              <MiniLineChart v-if="store.stats" :data="store.stats.downloadsPerDay" color="var(--info)" :height="160" />
            </div>
          </Card>
        </div>

        <!-- system health -->
        <Card v-if="store.health" pad="none">
          <div class="row-between" style="padding: 12px 16px; border-bottom: 1px solid var(--border)">
            <div class="h4" style="font-size: 13px">System health</div>
            <Badge tone="success" dot>operational</Badge>
          </div>
          <div class="admin-health-grid">
            <div style="padding: 16px; border-right: 1px solid var(--border)">
              <div class="stat-label">API uptime</div>
              <div class="mono" style="margin-top: 6px; font-size: 18px">{{ store.health.uptime }}</div>
            </div>
            <div style="padding: 16px; border-right: 1px solid var(--border)">
              <div class="stat-label">Upload p95 latency</div>
              <div class="mono" style="margin-top: 6px; font-size: 18px">{{ store.health.uploadLatencyP95Ms }}ms</div>
            </div>
            <div style="padding: 16px; border-right: 1px solid var(--border)">
              <div class="stat-label">Storage available</div>
              <div class="mono" style="margin-top: 6px; font-size: 18px">
                {{ formatBytes(store.health.storageTotalBytes - store.health.storageUsedBytes) }} /
                {{ formatBytes(store.health.storageTotalBytes) }}
              </div>
            </div>
            <div style="padding: 16px">
              <div class="stat-label">Background queue</div>
              <div class="mono" style="margin-top: 6px; font-size: 18px">{{ store.health.cleanupQueueSize }} jobs</div>
            </div>
          </div>
        </Card>
      </div>

      <!-- ───────── Files ───────── -->
      <Card v-else-if="tab === 'files'" pad="none">
        <div style="padding: 14px; border-bottom: 1px solid var(--border)">
          <div class="row-between" style="gap: 12px; flex-wrap: wrap">
            <div style="position: relative; flex: 1 1 280px; max-width: 380px">
              <Icon
                name="search"
                :size="13"
                style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-faint); pointer-events: none"
              />
              <Input v-model="fileSearchInput" placeholder="Search by file name or uploader…" style="padding-left: 30px" />
            </div>
            <div class="row" style="gap: 12px">
              <Toggle :model-value="store.filesAnon" label="Anonymous only" @update:model-value="onAnonToggle" />
              <select
                class="select"
                :value="store.filesSort"
                style="width: auto; height: 30px; font-size: 12.5px"
                @change="onFilesSort"
              >
                <option value="newest">Newest</option>
                <option value="largest">Largest</option>
                <option value="most">Most downloaded</option>
              </select>
            </div>
          </div>
        </div>

        <div v-if="store.filesLoading" style="padding: 40px; display: flex; justify-content: center">
          <Spinner :size="28" />
        </div>
        <EmptyState
          v-else-if="store.files.length === 0"
          icon="file"
          title="No files match"
          message="Try a different search."
        />
        <table v-else class="table">
          <thead>
            <tr>
              <th>File</th>
              <th>Uploader</th>
              <th>Size</th>
              <th>Downloads</th>
              <th>Status</th>
              <th>Created</th>
              <th style="width: 1px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="f in store.files" :key="f.id">
              <td>
                <div class="row" style="gap: 10px">
                  <FileTypeIcon :mime-type="f.mimeType" :size="16" />
                  <div style="min-width: 0">
                    <div class="mono ellipsis" style="font-size: 12.5px; max-width: 220px">{{ f.fileName }}</div>
                    <div class="subtle mono" style="font-size: 11px">/s/{{ f.slug }}</div>
                  </div>
                </div>
              </td>
              <td>
                <div v-if="f.uploaderEmail" class="row" style="gap: 8px">
                  <div class="avatar" style="width: 22px; height: 22px; font-size: 9px">
                    {{ f.uploaderEmail.charAt(0).toUpperCase() }}
                  </div>
                  <span class="mono" style="font-size: 12px">{{ f.uploaderEmail }}</span>
                </div>
                <Badge v-else tone="default" style="height: 20px; font-size: 11px">
                  <Icon name="globe" :size="10" />Anonymous
                </Badge>
              </td>
              <td class="mono subtle" style="font-size: 12px">{{ formatBytes(f.fileSize) }}</td>
              <td class="mono" style="font-size: 12.5px">
                {{ f.downloadCount }}<span v-if="f.downloadLimit" class="subtle">/{{ f.downloadLimit }}</span
                ><span v-else class="subtle">·∞</span>
              </td>
              <td>
                <Badge v-if="f.isExpired" tone="default" dot>expired</Badge>
                <Badge v-else tone="success" dot>active</Badge>
                <Badge v-if="f.hasPassword" tone="warning" dot style="margin-left: 4px; height: 18px; font-size: 10px">pwd</Badge>
              </td>
              <td class="subtle" style="font-size: 12px">{{ formatDate(f.createdAt) }}</td>
              <td>
                <div class="row" style="gap: 2px; justify-content: flex-end">
                  <IconButton icon="copy" :icon-size="12" label="Copy link" @click="copyFileLink(f.slug)" />
                  <IconButton icon="trash" :icon-size="12" label="Force-delete" @click="deleteTarget = f" />
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="row-between" style="padding: 12px 14px; border-top: 1px solid var(--border)">
          <div class="subtle" style="font-size: 12px"><span class="mono">{{ store.filesTotal }}</span> files</div>
          <Pagination :page="store.filesPage" :total-pages="store.filesTotalPages" @change="onFilesPage" />
        </div>
      </Card>

      <!-- ───────── Users ───────── -->
      <Card v-else-if="tab === 'users'" pad="none">
        <div style="padding: 14px; border-bottom: 1px solid var(--border)">
          <div class="row-between" style="gap: 12px; flex-wrap: wrap">
            <div style="position: relative; flex: 1 1 240px; max-width: 320px">
              <Icon
                name="search"
                :size="13"
                style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-faint); pointer-events: none"
              />
              <Input v-model="userSearchInput" placeholder="Search users…" style="padding-left: 30px" />
            </div>
            <div class="row" style="gap: 6px">
              <select
                class="select"
                :value="store.usersSort"
                style="width: auto; height: 30px; font-size: 12.5px"
                @change="onUsersSort"
              >
                <option value="newest">Newest</option>
                <option value="uploads">Most uploads</option>
                <option value="storage">Most storage</option>
              </select>
            </div>
          </div>
        </div>

        <div v-if="store.usersLoading" style="padding: 40px; display: flex; justify-content: center">
          <Spinner :size="28" />
        </div>
        <EmptyState
          v-else-if="store.users.length === 0"
          icon="users"
          title="No users"
          message="No users match the current filter."
        />
        <table v-else class="table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Uploads</th>
              <th>Downloads</th>
              <th>Storage</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in store.users" :key="u.id">
              <td>
                <div class="row" style="gap: 10px">
                  <div class="avatar">{{ (u.firstName || u.email).charAt(0).toUpperCase() }}</div>
                  <div style="min-width: 0">
                    <div style="font-size: 13px">{{ u.firstName || '' }} {{ u.lastName || '' }}</div>
                    <div class="subtle mono" style="font-size: 11.5px">{{ u.email }}</div>
                  </div>
                </div>
              </td>
              <td>
                <Badge v-if="u.role === 'ADMIN'" tone="accent" mono><Icon name="shield" :size="10" />ADMIN</Badge>
                <Badge v-else mono outline>USER</Badge>
              </td>
              <td class="mono" style="font-size: 12.5px">{{ u.uploadCount }}</td>
              <td class="mono" style="font-size: 12.5px">{{ u.totalDownloads.toLocaleString() }}</td>
              <td class="mono subtle" style="font-size: 12px">{{ formatBytes(u.storageUsedBytes) }}</td>
              <td class="subtle" style="font-size: 12px">{{ formatDate(u.createdAt) }}</td>
            </tr>
          </tbody>
        </table>

        <div class="subtle" style="padding: 12px 14px; border-top: 1px solid var(--border); font-size: 12px">
          <span class="mono">{{ store.usersTotal }}</span> users
        </div>
      </Card>
    </div>

    <ConfirmDialog
      :open="deleteTarget != null"
      variant="danger"
      title="Force-delete file?"
      :message="
        deleteTarget
          ? `“${deleteTarget.fileName}” will be permanently deleted. This action will be logged in the admin audit trail.`
          : ''
      "
      confirm-label="Force-delete"
      @close="deleteTarget = null"
      @confirm="confirmDelete"
    />
  </div>
</template>

<style scoped>
.stat-label {
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-subtle);
}
.stat-value-lg {
  font-size: 30px;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.stat-value-sm {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.admin-stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.admin-chart-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.admin-health-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
}
.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
@media (max-width: 920px) {
  .admin-stat-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .admin-chart-grid {
    grid-template-columns: 1fr;
  }
  .admin-health-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .admin-health-grid > div {
    border-right: none !important;
    border-bottom: 1px solid var(--border);
  }
}
</style>
