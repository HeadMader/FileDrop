import { onUnmounted, ref } from 'vue';
import { formatCountdown, type CountdownInfo } from '@/utils/format';

export function useCountdown(expiresAt: () => string | Date | null | undefined) {
  const info = ref<CountdownInfo>(formatCountdown(expiresAt()));
  const timer = setInterval(() => {
    info.value = formatCountdown(expiresAt());
  }, 1000);
  onUnmounted(() => clearInterval(timer));
  return info;
}

export function useClipboard() {
  const copied = ref(false);
  let t: ReturnType<typeof setTimeout> | null = null;
  async function copy(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      copied.value = true;
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        copied.value = false;
      }, 2000);
      return true;
    } catch {
      return false;
    }
  }
  return { copy, copied };
}
