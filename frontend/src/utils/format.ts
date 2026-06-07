export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  const v = bytes / Math.pow(k, i);
  return (v < 10 && i > 0 ? v.toFixed(1) : Math.round(v).toString()) + ' ' + sizes[i];
}

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(d: string | Date | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatRelative(d: string | Date | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  if (diff < 86400 * 7) return Math.floor(diff / 86400) + 'd ago';
  return formatDate(date);
}

export interface CountdownInfo {
  text: string;
  expired: boolean;
  pct: number;
}

export function formatCountdown(expiresAt: string | Date | null | undefined): CountdownInfo {
  if (!expiresAt) return { text: '—', expired: false, pct: 0 };
  const exp = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  const ms = exp.getTime() - Date.now();
  if (ms <= 0) return { text: 'expired', expired: true, pct: 0 };
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  let text: string;
  if (d > 0) text = `${d}d ${h}h`;
  else if (h > 0) text = `${h}h ${m}m`;
  else if (m > 0) text = `${m}m ${sec}s`;
  else text = `${sec}s`;
  return { text, expired: false, pct: Math.max(0, Math.min(100, (ms / (1000 * 60 * 60 * 24 * 7)) * 100)) };
}

export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
