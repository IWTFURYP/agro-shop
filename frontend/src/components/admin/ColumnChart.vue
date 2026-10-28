<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

// Стовпчиковий графік однієї величини в часі (виручка по днях/місяцях).
// Один ряд → без легенди; підказка при наведенні; таблиця даних для доступності.
const props = defineProps({
  data: { type: Array, required: true }, // [{ label, value, hint }]
  format: { type: Function, default: (v) => String(v) },
  height: { type: Number, default: 240 },
  label: { type: String, default: '' },
});

const hover = ref(-1);
const showTable = ref(false);

const PAD = { top: 16, right: 8, bottom: 28, left: 56 };
// Ширина SVG дорівнює ширині контейнера — текст не масштабується на телефоні
const plot = ref(null);
const W = ref(720);
let observer;
onMounted(() => {
  observer = new ResizeObserver(([entry]) => {
    W.value = Math.max(280, Math.round(entry.contentRect.width));
  });
  observer.observe(plot.value);
});
onBeforeUnmount(() => observer?.disconnect());
const innerW = computed(() => W.value - PAD.left - PAD.right);
const innerH = computed(() => props.height - PAD.top - PAD.bottom);

// «Круглі» поділки осі Y: 0, 1, 2, 5 × 10ⁿ
const ticks = computed(() => {
  const max = Math.max(...props.data.map((d) => d.value), 0);
  if (!max) return [0, 1];
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw);
  const result = [];
  for (let v = 0; v <= max + step * 0.001; v += step) result.push(v);
  if (result[result.length - 1] < max) result.push(result[result.length - 1] + step);
  return result;
});
const yMax = computed(() => ticks.value[ticks.value.length - 1] || 1);
const y = (v) => PAD.top + innerH.value - (v / yMax.value) * innerH.value;

const slot = computed(() => innerW.value / Math.max(props.data.length, 1));
const barW = computed(() => Math.min(24, Math.max(3, slot.value - 2)));
const barX = (i) => PAD.left + i * slot.value + (slot.value - barW.value) / 2;

// Стовпчик з округленим верхом (4px) і прямим низом біля осі
function barPath(i, v) {
  const x = barX(i);
  const w = barW.value;
  const top = y(v);
  const bottom = y(0);
  const r = Math.min(4, w / 2, bottom - top);
  if (bottom - top <= 0.5) return '';
  return `M${x},${bottom} V${top + r} Q${x},${top} ${x + r},${top} H${x + w - r} Q${x + w},${top} ${x + w},${top + r} V${bottom} Z`;
}

// Підписи осі X — не частіше ніж ~8 на графік
const labelEvery = computed(() => Math.ceil(props.data.length / Math.max(3, Math.floor(W.value / 80))));

const compact = (v) => {
  if (v >= 1e6) return `${(v / 1e6).toLocaleString('uk-UA', { maximumFractionDigits: 1 })} млн`;
  if (v >= 1e3) return `${(v / 1e3).toLocaleString('uk-UA', { maximumFractionDigits: 0 })} тис.`;
  return v.toLocaleString('uk-UA');
};

const tooltip = computed(() => {
  if (hover.value < 0) return null;
  const d = props.data[hover.value];
  const xPct = ((barX(hover.value) + barW.value / 2) / W.value) * 100;
  return { d, left: `${Math.min(85, Math.max(15, xPct))}%` };
});
</script>

<template>
  <div class="chart">
    <div ref="plot" class="chart__plot" @mouseleave="hover = -1">
      <svg :viewBox="`0 0 ${W} ${height}`" role="img" :aria-label="label" class="chart__svg">
        <g class="grid">
          <g v-for="t in ticks" :key="t">
            <line :x1="PAD.left" :x2="W - PAD.right" :y1="y(t)" :y2="y(t)" />
            <text :x="PAD.left - 8" :y="y(t) + 4" text-anchor="end">{{ compact(t) }}</text>
          </g>
        </g>
        <g>
          <g v-for="(d, i) in data" :key="i">
            <path :d="barPath(i, d.value)" class="bar" :class="{ dim: hover >= 0 && hover !== i }" />
            <!-- Зона наведення ширша за сам стовпчик -->
            <rect
              :x="PAD.left + i * slot"
              :y="PAD.top"
              :width="slot"
              :height="innerH"
              fill="transparent"
              @mouseenter="hover = i"
              @touchstart.passive="hover = i"
            />
            <text v-if="i % labelEvery === 0" :x="barX(i) + barW / 2" :y="height - 8" text-anchor="middle" class="xlabel">
              {{ d.label }}
            </text>
          </g>
        </g>
      </svg>
      <div v-if="tooltip" class="tip" :style="{ left: tooltip.left }">
        <strong>{{ format(tooltip.d.value) }}</strong>
        <span>{{ tooltip.d.hint || tooltip.d.label }}</span>
      </div>
    </div>
    <button type="button" class="chart__toggle" @click="showTable = !showTable">
      {{ showTable ? 'Сховати таблицю' : 'Показати таблицею' }}
    </button>
    <table v-if="showTable" class="table chart__table">
      <thead><tr><th>Період</th><th>Значення</th></tr></thead>
      <tbody>
        <tr v-for="(d, i) in data" :key="i"><td>{{ d.hint || d.label }}</td><td>{{ format(d.value) }}</td></tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.chart__plot { position: relative; }
.chart__svg { width: 100%; height: auto; display: block; overflow: visible; }
.grid line { stroke: #eceee8; stroke-width: 1; vector-effect: non-scaling-stroke; }
.grid text,
.xlabel { font: 500 11px var(--font-body); fill: var(--c-muted); }
.bar { fill: var(--c-chart, #2e8b47); transition: opacity 0.15s; }
.bar.dim { opacity: 0.45; }
.tip {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--c-text);
  color: #fff;
  font-size: 12px;
  line-height: 1.35;
  pointer-events: none;
  white-space: nowrap;
  box-shadow: var(--shadow-lg);
}
.tip strong { font: 700 14px var(--font-head); }
.tip span { color: rgba(255, 255, 255, 0.7); }
.chart__toggle {
  margin-top: 6px;
  padding: 0;
  border: 0;
  background: none;
  font: 500 12px var(--font-body);
  color: var(--c-muted);
  cursor: pointer;
  text-decoration: underline;
}
.chart__table { margin-top: 8px; max-height: 260px; display: block; overflow-y: auto; }
</style>
