<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  value: string;
  size?: number;
}
const props = withDefaults(defineProps<Props>(), { size: 128 });

const N = 25;

interface Cell {
  x: number;
  y: number;
}

const cells = computed<Cell[]>(() => {
  let h = 0;
  for (let i = 0; i < props.value.length; i++) {
    h = (h * 31 + props.value.charCodeAt(i)) & 0xffffffff;
  }
  const out: Cell[] = [];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const inFinder = (cx: number, cy: number) => x >= cx && x <= cx + 6 && y >= cy && y <= cy + 6;
      const fillFinder = (cx: number, cy: number) => {
        if ((x === cx || x === cx + 6 || y === cy || y === cy + 6) && inFinder(cx, cy)) return true;
        if (x >= cx + 2 && x <= cx + 4 && y >= cy + 2 && y <= cy + 4) return true;
        return false;
      };
      let on = false;
      if (inFinder(0, 0)) on = fillFinder(0, 0);
      else if (inFinder(N - 7, 0)) on = fillFinder(N - 7, 0);
      else if (inFinder(0, N - 7)) on = fillFinder(0, N - 7);
      else {
        h = (h * 9301 + 49297) & 0x7fffffff;
        on = h % 100 < 50;
      }
      if (on) out.push({ x, y });
    }
  }
  return out;
});
</script>

<template>
  <svg
    :viewBox="`0 0 ${N} ${N}`"
    :width="size"
    :height="size"
    style="background: white; padding: 8px; border-radius: var(--r-md); border: 1px solid var(--border); box-sizing: content-box; display: block"
  >
    <g fill="#0a0a0a">
      <rect v-for="c in cells" :key="`${c.x}-${c.y}`" :x="c.x" :y="c.y" width="1" height="1" />
    </g>
  </svg>
</template>
