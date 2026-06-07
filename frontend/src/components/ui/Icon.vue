<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  name: IconName;
  size?: number | string;
  strokeWidth?: number;
}
const props = withDefaults(defineProps<Props>(), { size: 16, strokeWidth: 1.6 });

export type IconName =
  | 'upload' | 'download' | 'copy' | 'check' | 'x' | 'link' | 'lock' | 'unlock'
  | 'eye' | 'eye-off' | 'clock' | 'plus' | 'minus' | 'trash' | 'edit' | 'more'
  | 'search' | 'filter' | 'chev' | 'chev-l' | 'chev-r' | 'arrow' | 'arrow-l'
  | 'sun' | 'moon' | 'user' | 'users' | 'shield' | 'settings' | 'home' | 'logout'
  | 'qr' | 'pause' | 'file' | 'image' | 'video' | 'audio' | 'pdf' | 'zip' | 'text'
  | 'bar' | 'database' | 'activity' | 'globe' | 'logo';

const px = computed(() => (typeof props.size === 'number' ? `${props.size}px` : props.size));
</script>

<template>
  <svg
    :width="px"
    :height="px"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class="fd-icon"
  >
    <template v-if="name === 'upload'"><path d="M12 16V4M6 10l6-6 6 6M4 20h16" /></template>
    <template v-else-if="name === 'download'"><path d="M12 4v12M6 10l6 6 6-6M4 20h16" /></template>
    <template v-else-if="name === 'copy'"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></template>
    <template v-else-if="name === 'check'"><path d="M4 12l5 5L20 6" /></template>
    <template v-else-if="name === 'x'"><path d="M6 6l12 12M18 6L6 18" /></template>
    <template v-else-if="name === 'link'"><path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" /><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" /></template>
    <template v-else-if="name === 'lock'"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></template>
    <template v-else-if="name === 'unlock'"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 7.5-2" /></template>
    <template v-else-if="name === 'eye'"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></template>
    <template v-else-if="name === 'eye-off'"><path d="M3 3l18 18" /><path d="M10.5 5.1A11 11 0 0 1 12 5c6.5 0 10 7 10 7a18.7 18.7 0 0 1-3.16 3.97" /><path d="M6.1 6.1A18.6 18.6 0 0 0 2 12s3.5 7 10 7a11 11 0 0 0 5.1-1.2" /><path d="M14.1 14.1a3 3 0 0 1-4.2-4.2" /></template>
    <template v-else-if="name === 'clock'"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></template>
    <template v-else-if="name === 'plus'"><path d="M12 5v14M5 12h14" /></template>
    <template v-else-if="name === 'minus'"><path d="M5 12h14" /></template>
    <template v-else-if="name === 'trash'"><path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" /></template>
    <template v-else-if="name === 'edit'"><path d="M14 4l6 6L9 21H3v-6L14 4z" /></template>
    <template v-else-if="name === 'more'"><circle cx="5" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="19" cy="12" r="1.2" /></template>
    <template v-else-if="name === 'search'"><circle cx="11" cy="11" r="7" /><path d="M21 21l-5-5" /></template>
    <template v-else-if="name === 'filter'"><path d="M4 5h16l-6 8v6l-4-2v-4z" /></template>
    <template v-else-if="name === 'chev'"><path d="M6 9l6 6 6-6" /></template>
    <template v-else-if="name === 'chev-l'"><path d="M15 6l-6 6 6 6" /></template>
    <template v-else-if="name === 'chev-r'"><path d="M9 6l6 6-6 6" /></template>
    <template v-else-if="name === 'arrow'"><path d="M5 12h14M13 6l6 6-6 6" /></template>
    <template v-else-if="name === 'arrow-l'"><path d="M19 12H5M11 18l-6-6 6-6" /></template>
    <template v-else-if="name === 'sun'"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></template>
    <template v-else-if="name === 'moon'"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></template>
    <template v-else-if="name === 'user'"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></template>
    <template v-else-if="name === 'users'"><circle cx="9" cy="8" r="4" /><path d="M2 21a7 7 0 0 1 14 0" /><circle cx="17" cy="9" r="3" /><path d="M22 19a5 5 0 0 0-4-5" /></template>
    <template v-else-if="name === 'shield'"><path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" /></template>
    <template v-else-if="name === 'settings'"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.36.16.65.41.85.74" /></template>
    <template v-else-if="name === 'home'"><path d="M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z" /></template>
    <template v-else-if="name === 'logout'"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 17l-5-5 5-5M5 12h12" /></template>
    <template v-else-if="name === 'qr'"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><path d="M14 14h3v3h-3zM20 14v3M14 20h7M17 17v4" /></template>
    <template v-else-if="name === 'pause'"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></template>
    <template v-else-if="name === 'file'"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /></template>
    <template v-else-if="name === 'image'"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-9 9" /></template>
    <template v-else-if="name === 'video'"><rect x="3" y="6" width="14" height="12" rx="2" /><path d="M17 10l5-3v10l-5-3z" /></template>
    <template v-else-if="name === 'audio'"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></template>
    <template v-else-if="name === 'pdf'"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /><path d="M8 14h1.5a1.5 1.5 0 1 1 0 3H8v-3zm0 3v2M14 14v5M14 14h1.5a1.5 1.5 0 0 1 0 3H14" stroke-width="1.2" /></template>
    <template v-else-if="name === 'zip'"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /><path d="M10 7v2M10 11v2M10 15v2" /></template>
    <template v-else-if="name === 'text'"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6M8 13h8M8 17h5" /></template>
    <template v-else-if="name === 'bar'"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2" /></template>
    <template v-else-if="name === 'database'"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14a9 3 0 0 0 18 0V5M3 12a9 3 0 0 0 18 0" /></template>
    <template v-else-if="name === 'activity'"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></template>
    <template v-else-if="name === 'globe'"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></template>
    <template v-else-if="name === 'logo'">
      <rect x="2.5" y="3" width="14" height="18" rx="2.5" stroke="currentColor" stroke-width="1.6" fill="none" />
      <path d="M7 9h5M7 13h7M7 17h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
      <path d="M16 8l5 4-5 4" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    </template>
  </svg>
</template>

<style scoped>
.fd-icon {
  flex-shrink: 0;
  display: inline-block;
  vertical-align: middle;
}
</style>
