<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '@/api';
import { ORCHARD_PHASES, SKU_INFO, GROUP_LABELS } from '@/data/orchardProgram';
import { addDays, calendarPhaseIndex, parseDate, recommend } from '@/utils/sprayPlan';
import {
  assessHour, fetchHourly, findWindows, fmtMm, fmtT, fmtW, LIMITS, localDate, rainSince, searchPlaces, summarizeDays,
} from '@/utils/sprayWeather';
import { useSprayJournalStore } from '@/stores/sprayJournal';
import { useCartStore } from '@/stores/cart';
import { useToastStore } from '@/stores/toast';
import AppIcon from '@/components/AppIcon.vue';

// Щоденник саду: записуємо обприскування → сайт підказує, коли й чим наступного разу,
// і чи підходить для цього погода (дощ, температура, вітер)
const route = useRoute();
const journal = useSprayJournalStore();
const cart = useCartStore();
const toast = useToastStore();

const today = localDate();
const products = ref({});
const programSkus = [...new Set(ORCHARD_PHASES.flatMap((p) => p.items.map((i) => i.sku)))];

onMounted(async () => {
  try {
    const data = await api.get('/products', { skus: programSkus.join(','), limit: 48 });
    products.value = Object.fromEntries(data.items.map((p) => [p.sku, p]));
  } catch {
    /* назви препаратів покажемо за артикулом */
  }
});
const productName = (sku) => products.value[sku]?.name || sku;

/* ---------- Місце й погода ---------- */
const hours = ref([]);
const weatherError = ref('');
const weatherLoading = ref(false);
const placeQuery = ref('');
const placeResults = ref([]);
const placeSearching = ref(false);
const editingPlace = ref(!journal.place);

async function loadWeather() {
  if (!journal.place) return;
  weatherLoading.value = true;
  weatherError.value = '';
  try {
    hours.value = await fetchHourly(journal.place);
  } catch (err) {
    weatherError.value = err.message || 'Не вдалося отримати прогноз погоди';
    hours.value = [];
  } finally {
    weatherLoading.value = false;
  }
}
watch(() => journal.place, loadWeather, { immediate: true });

async function findPlace() {
  const q = placeQuery.value.trim();
  if (q.length < 2) return;
  placeSearching.value = true;
  try {
    placeResults.value = await searchPlaces(q);
    if (!placeResults.value.length) toast.error('Нічого не знайдено — спробуйте найближче місто чи райцентр');
  } catch (err) {
    toast.error(err.message);
  } finally {
    placeSearching.value = false;
  }
}

function choosePlace(p) {
  journal.setPlace(p);
  placeResults.value = [];
  placeQuery.value = '';
  editingPlace.value = false;
}

function useMyLocation() {
  if (!navigator.geolocation) {
    toast.error('Браузер не підтримує визначення місцезнаходження');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => choosePlace({ name: 'Моє місцезнаходження', region: '', lat: +pos.coords.latitude.toFixed(3), lon: +pos.coords.longitude.toFixed(3) }),
    () => toast.error('Не вдалося визначити місцезнаходження — знайдіть село чи місто за назвою'),
    { timeout: 10000 },
  );
}

const nowIndex = computed(() => {
  const now = Date.now();
  const i = hours.value.findIndex((h) => h.ts > now - 3600000 && h.ts <= now);
  return i === -1 ? hours.value.findIndex((h) => h.ts > now) : i;
});
const now = computed(() => {
  if (nowIndex.value < 0) return null;
  return { hour: hours.value[nowIndex.value], ...assessHour(hours.value, nowIndex.value) };
});
const windows = computed(() => (hours.value.length ? findWindows(hours.value, Date.now(), 3) : []));
const days = computed(() =>
  hours.value.length
    ? summarizeDays(hours.value, Date.now(), 7).map((d) => ({
        ...d,
        strip: hours.value
          .map((h, i) => ({ h, i }))
          .filter(({ h }) => h.date === d.date && h.hour >= LIMITS.dayFrom && h.hour < LIMITS.dayTo)
          .map(({ h, i }) => ({ hour: h.hour, temp: h.temp, past: h.ts < Date.now() - 3600000, ...assessHour(hours.value, i) })),
      }))
    : [],
);

const VERDICT = {
  good: { title: 'Добрий час для обприскування', icon: 'check', label: 'Добре' },
  caution: { title: 'Можна, але з обережністю', icon: 'alert', label: 'Обережно' },
  bad: { title: 'Краще не йти обприскувати', icon: 'x', label: 'Не варто' },
};

/* ---------- Підказка: коли й чим далі ---------- */
const lastEntry = computed(() => [...journal.entries].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).at(-1));
const entryTs = (e) => parseDate(e.date).setHours(...(e.time || '12:00').split(':').map(Number), 0, 0);

// Дощ після останньої обробки — якщо вона в межах доступних даних погоди (7 днів)
const rainAfterLast = computed(() => {
  if (!lastEntry.value || !hours.value.length) return null;
  const ts = entryTs(lastEntry.value);
  if (ts < hours.value[0].ts) return null;
  return rainSince(hours.value, ts);
});

const plan = computed(() => recommend(journal.entries, today, rainAfterLast.value));

const STATUS = {
  wait: { badge: 'badge--green', label: 'За планом' },
  due: { badge: 'badge--yellow', label: 'Час обприскувати' },
  overdue: { badge: 'badge--red', label: 'Запізнюємося' },
  urgent: { badge: 'badge--red', label: 'Терміново' },
  offseason: { badge: 'badge--gray', label: 'Міжсезоння' },
};

const weekday = (dateStr, long = false) =>
  parseDate(dateStr).toLocaleDateString('uk-UA', long ? { weekday: 'long', day: 'numeric', month: 'long' } : { weekday: 'short' });
const dayLabel = (dateStr) => {
  if (dateStr === today) return 'Сьогодні';
  if (dateStr === addDays(today, 1)) return 'Завтра';
  return weekday(dateStr);
};
const shortDate = (dateStr) => parseDate(dateStr).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });

const whenText = computed(() => {
  const p = plan.value;
  if (p.status === 'offseason') return `орієнтовно ${weekday(p.date, true)}`;
  if (p.daysLeft > 1) return `через ${p.daysLeft} ${plural(p.daysLeft, 'день', 'дні', 'днів')} — ${weekday(p.date, true)}`;
  if (p.daysLeft === 1) return `завтра — ${weekday(p.date, true)}`;
  if (p.daysLeft === 0) return 'сьогодні або щойно дозволить погода';
  return `уже пора (запланована дата — ${shortDate(p.date)})`;
});

// Найкраще вікно погоди біля запланованої дати
const planWindow = computed(() => {
  if (!hours.value.length || plan.value.status === 'offseason') return null;
  const from = Math.max(Date.now(), parseDate(plan.value.date).setHours(0, 0, 0, 0) - 86400000);
  return findWindows(hours.value, from, 3)[0] || null;
});
const planInForecast = computed(() => hours.value.length && plan.value.daysLeft <= 6 && plan.value.status !== 'offseason');

function addPlanToCart() {
  let added = 0;
  for (const item of plan.value.items) {
    const p = products.value[item.sku];
    if (p) {
      cart.add(p, 1);
      added++;
    }
  }
  if (added) toast.success(`Додано ${added} ${plural(added, 'препарат', 'препарати', 'препаратів')} у кошик — кількість уточніть у кошику`);
}

const groupText = (sku) => (SKU_INFO[sku]?.groups || []).map((g) => GROUP_LABELS[g] || g).join(' + ');

/* ---------- Форма запису ---------- */
const formOpen = ref(Boolean(route.query.skus));
const form = ref(emptyForm());

function emptyForm() {
  const fromQuery = String(route.query.skus || '').split(',').filter((s) => programSkus.includes(s));
  const now = new Date();
  return {
    date: today,
    time: `${String(now.getHours()).padStart(2, '0')}:00`,
    phase: route.query.phase && ORCHARD_PHASES.some((p) => p.key === route.query.phase)
      ? String(route.query.phase)
      : ORCHARD_PHASES[calendarPhaseIndex(today)].key,
    skus: fromQuery,
    other: '',
    note: '',
  };
}

function openForm(prefill) {
  form.value = emptyForm();
  if (prefill) {
    form.value.phase = plan.value.phase.key;
    form.value.skus = plan.value.items.map((i) => i.sku);
  }
  formOpen.value = true;
}

const phaseItems = computed(() => ORCHARD_PHASES.find((p) => p.key === form.value.phase)?.items || []);
const otherSkus = computed(() => programSkus.filter((s) => !phaseItems.value.some((i) => i.sku === s)));
const extraSku = ref('');
watch(extraSku, (sku) => {
  if (sku && !form.value.skus.includes(sku)) form.value.skus.push(sku);
  extraSku.value = '';
});

function toggleSku(sku) {
  const list = form.value.skus;
  form.value.skus = list.includes(sku) ? list.filter((s) => s !== sku) : [...list, sku];
}

function saveEntry() {
  if (!form.value.skus.length && !form.value.other.trim()) {
    toast.error('Позначте, чим обприскували');
    return;
  }
  if (form.value.date > today) {
    toast.error('Дата не може бути в майбутньому');
    return;
  }
  journal.add({ ...form.value, other: form.value.other.trim(), note: form.value.note.trim() });
  formOpen.value = false;
  toast.success('Обприскування записано — підказку оновлено');
}

const entriesDesc = computed(() =>
  [...journal.entries].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).map((e) => ({
    ...e,
    phaseTitle: ORCHARD_PHASES.find((p) => p.key === e.phase)?.title || '',
    rain: hours.value.length && entryTs(e) >= hours.value[0].ts ? rainSince(hours.value, entryTs(e)) : null,
  })),
);

function removeEntry(e) {
  if (confirm(`Видалити запис від ${shortDate(e.date)}?`)) journal.remove(e.id);
}

function plural(n, one, few, many) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
</script>

<template>
  <div>
    <section class="page-hero">
      <div class="container">
        <nav class="breadcrumbs">
          <RouterLink to="/">Головна</RouterLink>
          <span><RouterLink to="/sad">Яблуневий сад</RouterLink></span>
          <span>Щоденник обприскувань</span>
        </nav>
        <span class="eyebrow">Яблуневий сад</span>
        <h1>Щоденник обприскувань і погода</h1>
        <p class="lead">
          Записуйте, коли й чим обприскали сад, — підкажемо, коли йти наступного разу і з яким препаратом.
          А прогноз погоди покаже, чи не змиє дощ розчин і чи підходить температура.
        </p>

        <div class="place">
          <template v-if="journal.place && !editingPlace">
            <span class="place__name"><AppIcon name="map-pin" :size="18" /> Погода для: <strong>{{ journal.place.name }}</strong>
              <span v-if="journal.place.region" class="muted">{{ journal.place.region }}</span></span>
            <button type="button" class="btn btn--ghost btn--sm" @click="editingPlace = true">Змінити</button>
          </template>
          <form v-else class="place__form" @submit.prevent="findPlace">
            <label class="sr-only" for="place-q">Ваше село чи місто</label>
            <input id="place-q" v-model="placeQuery" class="input" placeholder="Ваше село чи місто, напр. Мліїв" autocomplete="off" />
            <button class="btn" :disabled="placeSearching">{{ placeSearching ? 'Шукаю…' : 'Знайти' }}</button>
            <button type="button" class="btn btn--outline" @click="useMyLocation"><AppIcon name="map-pin" :size="16" /> Де я зараз</button>
            <ul v-if="placeResults.length" class="place__results">
              <li v-for="p in placeResults" :key="`${p.lat},${p.lon}`">
                <button type="button" @click="choosePlace(p)">
                  <strong>{{ p.name }}</strong> <span class="muted">{{ [p.region, p.country].filter(Boolean).join(', ') }}</span>
                </button>
              </li>
            </ul>
          </form>
        </div>
      </div>
    </section>

    <div class="container layout">
      <!-- ПІДКАЗКА: НАСТУПНЕ ОБПРИСКУВАННЯ -->
      <section class="card plan" aria-labelledby="plan-title">
        <div class="plan__head">
          <h2 id="plan-title"><AppIcon name="calendar-days" :size="22" /> Наступне обприскування</h2>
          <span class="badge" :class="STATUS[plan.status].badge">{{ STATUS[plan.status].label }}</span>
        </div>
        <p class="plan__when">{{ whenText }}</p>
        <p class="plan__phase">
          Етап: <strong>{{ plan.phase.title }}</strong> <span class="muted">({{ plan.phase.period }})</span>
          <template v-if="plan.last && plan.interval">
            <br /><span class="muted">Останнє обприскування — {{ shortDate(plan.last.date) }}, інтервал на цьому етапі {{ plan.interval[0] }}–{{ plan.interval[1] }} днів.</span>
          </template>
        </p>

        <ul v-if="plan.notes.length" class="plan__notes">
          <li v-for="n in plan.notes" :key="n"><AppIcon name="info" :size="16" /> {{ n }}</li>
        </ul>

        <h3 class="plan__sub">Чим обприскувати</h3>
        <ul class="plan__items">
          <li v-for="item in plan.items" :key="item.sku">
            <div>
              <RouterLink v-if="products[item.sku]" :to="`/product/${products[item.sku].slug}`" class="plan__name">{{ productName(item.sku) }}</RouterLink>
              <strong v-else>{{ productName(item.sku) }}</strong>
              <span class="muted">{{ item.why }}</span>
              <span v-if="groupText(item.sku)" class="plan__group">Група: {{ groupText(item.sku) }}</span>
            </div>
            <span v-if="products[item.sku]?.rate_max" class="plan__rate">{{ products[item.sku].rate_min }}–{{ products[item.sku].rate_max }} {{ products[item.sku].rate_unit }}</span>
          </li>
        </ul>

        <div v-if="planInForecast" class="plan__weather" :class="planWindow ? 'is-good' : 'is-bad'">
          <AppIcon :name="planWindow ? 'check' : 'alert'" :size="18" />
          <span v-if="planWindow">
            <template v-if="planWindow.date > plan.date && plan.daysLeft >= 0">На заплановану дату погода не підходить. </template>
            Найкраще вікно за прогнозом: <strong>{{ dayLabel(planWindow.date) }}, {{ planWindow.from }}:00–{{ planWindow.to }}:00</strong>
            ({{ fmtT(planWindow.tempMin) }}…{{ fmtT(planWindow.tempMax) }}, без дощу).
          </span>
          <span v-else>Найближчими днями погода не підходить (дощ, вітер або температура) — стежте за прогнозом нижче.</span>
        </div>

        <div class="plan__actions">
          <button class="btn" type="button" @click="openForm(true)"><AppIcon name="check" :size="18" /> Я обприскав(ла) — записати</button>
          <button class="btn btn--outline" type="button" :disabled="!plan.items.length" @click="addPlanToCart"><AppIcon name="shopping-cart" :size="18" /> Препарати в кошик</button>
        </div>
      </section>

      <!-- ПОГОДА ЗАРАЗ -->
      <section class="card weather" aria-labelledby="weather-title">
        <h2 id="weather-title" class="sr-only">Погода для обприскування</h2>
        <p v-if="!journal.place" class="muted weather__empty">
          <AppIcon name="cloud-rain" :size="28" /><br />
          Вкажіть своє село чи місто вгорі — покажемо, коли погода підходить для обприскування.
        </p>
        <div v-else-if="weatherLoading" class="skeleton" style="height: 220px" />
        <p v-else-if="weatherError" class="alert alert--error">{{ weatherError }}. Перевірте інтернет і <button type="button" class="link-btn" @click="loadWeather">спробуйте ще раз</button>.</p>
        <template v-else-if="now">
          <div class="verdict" :class="`verdict--${now.level}`">
            <span class="verdict__icon"><AppIcon :name="VERDICT[now.level].icon" :size="26" /></span>
            <div>
              <span class="verdict__label">Чи можна обприскувати зараз?</span>
              <strong>{{ VERDICT[now.level].title }}</strong>
            </div>
          </div>
          <dl class="now">
            <div><dt>Температура</dt><dd>{{ fmtT(now.hour.temp) }}</dd></div>
            <div><dt>Вітер</dt><dd>{{ fmtW(now.hour.wind) }}</dd></div>
            <div><dt>Дощ</dt><dd>{{ now.hour.rainProb ?? '—' }} %</dd></div>
            <div v-if="now.hour.humidity != null"><dt>Вологість</dt><dd>{{ now.hour.humidity }} %</dd></div>
          </dl>
          <ul v-if="now.reasons.length" class="reasons">
            <li v-for="r in now.reasons" :key="r">{{ r }}</li>
          </ul>
          <p v-else class="reasons reasons--ok">Сухо, тепло й тихо — препарат встигне висохнути й подіяти.</p>

          <h3 class="weather__sub">Найкращий час у найближчі 3 дні</h3>
          <ul v-if="windows.length" class="windows">
            <li v-for="w in windows.slice(0, 5)" :key="`${w.date}-${w.from}`">
              <strong>{{ dayLabel(w.date) }}</strong> {{ w.from }}:00–{{ w.to }}:00
              <span class="muted">{{ fmtT(w.tempMin) }}…{{ fmtT(w.tempMax) }}</span>
            </li>
          </ul>
          <p v-else class="muted">Гарних вікон немає — дощ, вітер або невідповідна температура.</p>
        </template>
      </section>
    </div>

    <!-- ПРОГНОЗ НА ТИЖДЕНЬ -->
    <section v-if="days.length" class="container week-wrap">
      <h2>Прогноз для обприскування на тиждень</h2>
      <p class="muted">Кожна смужка — година з {{ LIMITS.dayFrom }}:00 до {{ LIMITS.dayTo }}:00. Наведіть або торкніться, щоб побачити причину.</p>
      <div class="week">
        <article v-for="d in days" :key="d.date" class="day card" :class="{ 'day--plan': d.date === plan.date }">
          <header>
            <strong>{{ dayLabel(d.date) }}</strong>
            <span class="muted">{{ shortDate(d.date) }}</span>
          </header>
          <span class="day__level" :class="`lvl--${d.level}`"><AppIcon :name="VERDICT[d.level].icon" :size="14" /> {{ VERDICT[d.level].label }}</span>
          <p class="day__temp">{{ fmtT(d.tempMin) }} … {{ fmtT(d.tempMax) }}</p>
          <p class="day__meta">
            <span><AppIcon name="cloud-rain" :size="14" /> {{ d.rain > 0 ? fmtMm(d.rain) : 'без дощу' }}<template v-if="d.probMax"> · {{ d.probMax }} %</template></span>
            <span>вітер до {{ fmtW(d.windMax) }}</span>
          </p>
          <div class="strip" role="img" :aria-label="`Погодинна оцінка на ${shortDate(d.date)}`">
            <span
              v-for="s in d.strip"
              :key="s.hour"
              class="strip__cell"
              :class="[`lvl--${s.level}`, { past: s.past }]"
              :title="`${s.hour}:00 · ${fmtT(s.temp)} · ${VERDICT[s.level].label}${s.reasons.length ? ' — ' + s.reasons[0] : ''}`"
            />
          </div>
          <div class="strip__axis"><span>{{ LIMITS.dayFrom }}</span><span>12</span><span>{{ LIMITS.dayTo }}</span></div>
          <span v-if="d.date === plan.date" class="badge badge--yellow day__plan">заплановано</span>
        </article>
      </div>
      <ul class="legend">
        <li><span class="strip__cell lvl--good" /> Добре</li>
        <li><span class="strip__cell lvl--caution" /> Обережно</li>
        <li><span class="strip__cell lvl--bad" /> Не варто</li>
      </ul>
      <p class="rules muted">
        Правила: після обробки має бути сухо щонайменше {{ LIMITS.rainFreeHours }} год; температура +{{ LIMITS.tempCool }}…+{{ LIMITS.tempWarm }} °C
        (не нижче +{{ LIMITS.tempMin }} і не вище +{{ LIMITS.tempMax }}); вітер до {{ LIMITS.windWarn }} м/с. Прогноз —
        <a href="https://open-meteo.com" target="_blank" rel="noopener">Open-Meteo</a>.
      </p>
    </section>

    <!-- ЩОДЕННИК -->
    <section class="container journal">
      <div class="journal__head">
        <h2>Мої обприскування</h2>
        <button v-if="!formOpen" class="btn" type="button" @click="openForm(false)"><AppIcon name="plus" :size="18" /> Записати обприскування</button>
      </div>

      <form v-if="formOpen" class="card card--pad entry-form" @submit.prevent="saveEntry">
        <div class="entry-form__row">
          <div class="field">
            <label for="f-date">Дата</label>
            <input id="f-date" v-model="form.date" class="input" type="date" :max="today" required />
          </div>
          <div class="field">
            <label for="f-time">Час</label>
            <input id="f-time" v-model="form.time" class="input" type="time" />
          </div>
          <div class="field">
            <label for="f-phase">Етап розвитку саду</label>
            <select id="f-phase" v-model="form.phase" class="input">
              <option v-for="p in ORCHARD_PHASES" :key="p.key" :value="p.key">{{ p.title }} ({{ p.period }})</option>
            </select>
          </div>
        </div>

        <fieldset class="field">
          <legend class="label">Чим обприскували</legend>
          <div class="sku-list">
            <label v-for="item in phaseItems" :key="item.sku" class="sku" :class="{ active: form.skus.includes(item.sku) }">
              <input type="checkbox" :checked="form.skus.includes(item.sku)" @change="toggleSku(item.sku)" />
              <span><strong>{{ productName(item.sku) }}</strong><small>{{ item.why }}</small></span>
            </label>
            <label v-for="sku in form.skus.filter((s) => !phaseItems.some((i) => i.sku === s))" :key="sku" class="sku active">
              <input type="checkbox" checked @change="toggleSku(sku)" />
              <span><strong>{{ productName(sku) }}</strong><small>з іншого етапу</small></span>
            </label>
          </div>
        </fieldset>

        <div class="entry-form__row">
          <div class="field">
            <label for="f-extra">Інший препарат з програми</label>
            <select id="f-extra" v-model="extraSku" class="input">
              <option value="">— обрати —</option>
              <option v-for="sku in otherSkus" :key="sku" :value="sku">{{ productName(sku) }}</option>
            </select>
          </div>
          <div class="field">
            <label for="f-other">Препарат не з нашого каталогу</label>
            <input id="f-other" v-model="form.other" class="input" placeholder="Назва та норма" />
          </div>
        </div>
        <div class="field">
          <label for="f-note">Нотатка</label>
          <input id="f-note" v-model="form.note" class="input" placeholder="Напр.: 600 л на 1 га, помічено перші плями парші" />
        </div>
        <div class="entry-form__actions">
          <button class="btn">Зберегти</button>
          <button type="button" class="btn btn--ghost" @click="formOpen = false">Скасувати</button>
        </div>
      </form>

      <p v-if="!entriesDesc.length && !formOpen" class="muted journal__empty">
        Записів ще немає. Після першого обприскування натисніть «Записати» — і ми почнемо підказувати наступні.
      </p>
      <ol v-else class="entries">
        <li v-for="e in entriesDesc" :key="e.id" class="entry card">
          <div class="entry__date">
            <strong>{{ shortDate(e.date) }}</strong>
            <span class="muted">{{ e.time }}</span>
          </div>
          <div class="entry__body">
            <span class="muted entry__phase">{{ e.phaseTitle }}</span>
            <p>
              <template v-for="(sku, i) in e.skus" :key="sku">{{ i ? ', ' : '' }}<RouterLink v-if="products[sku]" :to="`/product/${products[sku].slug}`">{{ productName(sku) }}</RouterLink><template v-else>{{ productName(sku) }}</template></template>
              <template v-if="e.other">{{ e.skus.length ? ', ' : '' }}{{ e.other }}</template>
            </p>
            <p v-if="e.note" class="muted entry__note">{{ e.note }}</p>
            <span v-if="e.rain != null" class="entry__rain" :class="{ warn: e.rain >= 20 }">
              <AppIcon name="cloud-rain" :size="14" /> після обробки {{ e.rain > 0 ? `випало ${fmtMm(e.rain)}` : 'дощу не було' }}<template v-if="e.rain >= 20"> — препарат змито</template>
            </span>
          </div>
          <button type="button" class="btn btn--ghost btn--icon" aria-label="Видалити запис" @click="removeEntry(e)"><AppIcon name="trash" :size="18" /></button>
        </li>
      </ol>
      <p class="muted journal__store">Щоденник зберігається в цьому браузері на вашому пристрої.</p>
    </section>
  </div>
</template>

<style scoped>
.page-hero { background: var(--c-sand); padding: 4px 0 36px; }
.lead { font-size: 17px; color: var(--c-muted); max-width: 680px; }

.place { margin-top: 20px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.place__name { display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 15px; }
.place__name .icon { color: var(--c-primary); }
.place__form { position: relative; display: flex; gap: 8px; flex-wrap: wrap; width: 100%; max-width: 680px; }
.place__form .input { flex: 1 1 240px; min-width: 0; }
.place__results {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 5;
  list-style: none;
  margin: 0;
  padding: 6px;
  background: #fff;
  border: 1px solid var(--c-border);
  border-radius: 14px;
  box-shadow: var(--shadow);
}
.place__results button { width: 100%; text-align: left; border: 0; background: none; padding: 10px 12px; border-radius: 10px; cursor: pointer; font: inherit; color: var(--c-text); }
.place__results button:hover { background: var(--c-primary-soft); }

.layout { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: 20px; margin-top: 32px; align-items: start; }

.plan { padding: 24px; border: 2px solid var(--c-primary); }
.plan__head { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.plan__head h2 { display: flex; align-items: center; gap: 10px; font-size: 21px; margin: 0; }
.plan__head .icon { color: var(--c-primary); }
.plan__when { font: 800 24px/1.25 var(--font-head); margin: 14px 0 6px; color: var(--c-text); }
.plan__phase { margin: 0 0 12px; font-size: 14px; }
.plan__notes { list-style: none; margin: 0 0 12px; padding: 12px 14px; border-radius: 12px; background: var(--c-accent-light); color: #6b4a0b; font-size: 14px; display: flex; flex-direction: column; gap: 6px; }
.plan__notes li { display: flex; gap: 8px; }
.plan__notes .icon { flex-shrink: 0; margin-top: 2px; }
.plan__sub { font-size: 15px; margin: 16px 0 8px; }
.plan__items { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.plan__items li { display: flex; justify-content: space-between; gap: 12px; padding: 12px 14px; border: 1px solid var(--c-border); border-radius: 12px; }
.plan__items li > div { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.plan__name { font-weight: 700; color: var(--c-text); }
.plan__items .muted { font-size: 14px; }
.plan__group { font-size: 12px; color: var(--c-muted); }
.plan__rate { font-size: 13px; font-weight: 600; white-space: nowrap; }
.plan__weather { display: flex; gap: 10px; align-items: flex-start; margin-top: 14px; padding: 12px 14px; border-radius: 12px; font-size: 14px; }
.plan__weather .icon { flex-shrink: 0; margin-top: 1px; }
.plan__weather.is-good { background: var(--c-primary-soft); color: var(--c-primary-dark); }
.plan__weather.is-bad { background: var(--c-danger-light); color: #8f3127; }
.plan__actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }

.weather { padding: 24px; }
.weather__empty { text-align: center; padding: 32px 8px; }
.weather__empty .icon { color: var(--c-primary); }
.verdict { display: flex; gap: 14px; align-items: center; padding: 16px; border-radius: 16px; }
.verdict__icon { width: 48px; height: 48px; border-radius: 50%; display: grid; place-items: center; flex-shrink: 0; color: #fff; }
.verdict__label { display: block; font-size: 13px; color: var(--c-muted); }
.verdict strong { font: 800 19px/1.25 var(--font-head); color: var(--c-text); }
.verdict--good { background: var(--c-primary-soft); }
.verdict--good .verdict__icon { background: var(--c-primary); }
.verdict--caution { background: var(--c-accent-light); }
.verdict--caution .verdict__icon { background: var(--c-accent); color: #2b1f05; }
.verdict--bad { background: var(--c-danger-light); }
.verdict--bad .verdict__icon { background: var(--c-danger); }
.now { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin: 14px 0; }
.now div { padding: 10px; border-radius: 12px; background: #f6f7f3; }
.now dt { font-size: 12px; color: var(--c-muted); }
.now dd { margin: 2px 0 0; font-weight: 700; font-size: 16px; }
.reasons { margin: 0; padding-left: 18px; font-size: 14px; display: flex; flex-direction: column; gap: 4px; }
.reasons--ok { padding: 0; color: var(--c-primary-dark); }
.weather__sub { font-size: 15px; margin: 18px 0 8px; }
.windows { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; font-size: 14px; }
.windows li { display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; padding: 8px 12px; border-radius: 10px; background: var(--c-primary-soft); }
.link-btn { border: 0; background: none; padding: 0; color: inherit; text-decoration: underline; cursor: pointer; font: inherit; }

.week-wrap { margin-top: 48px; }
.week-wrap h2 { font-size: 24px; margin-bottom: 4px; }
.week { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 10px; margin-top: 16px; }
.day { position: relative; padding: 14px; display: flex; flex-direction: column; gap: 6px; }
.day--plan { border: 2px solid var(--c-accent); }
.day header { display: flex; justify-content: space-between; align-items: baseline; gap: 6px; }
.day header strong { text-transform: capitalize; }
.day header .muted { font-size: 12px; }
.day__level { display: inline-flex; align-items: center; gap: 4px; width: fit-content; padding: 2px 8px; border-radius: 999px; font-size: 12px; font-weight: 700; color: var(--c-text); }
.day__level.lvl--good { background: var(--c-primary-soft); }
.day__level.lvl--caution { background: var(--c-accent-light); }
.day__level.lvl--bad { background: var(--c-danger-light); }
.day__temp { margin: 0; font-weight: 700; }
.day__meta { margin: 0; display: flex; flex-direction: column; font-size: 12px; color: var(--c-muted); }
.day__meta span { display: inline-flex; align-items: center; gap: 4px; }
.day__plan { position: absolute; top: -10px; right: 10px; }
.strip { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 2px; margin-top: 4px; }
.strip__cell { display: block; height: 18px; border-radius: 3px; }
.strip__cell.past { opacity: 0.35; }
.lvl--good.strip__cell { background: var(--c-primary); }
.lvl--caution.strip__cell { background: var(--c-accent); }
.lvl--bad.strip__cell { background: var(--c-danger); }
.strip__axis { display: flex; justify-content: space-between; font-size: 10px; color: var(--c-muted); }
.legend { list-style: none; display: flex; gap: 18px; padding: 0; margin: 14px 0 0; font-size: 13px; }
.legend li { display: inline-flex; align-items: center; gap: 6px; }
.legend .strip__cell { width: 14px; height: 14px; }
.rules { font-size: 13px; margin-top: 10px; max-width: 820px; }

.journal { margin-top: 48px; margin-bottom: 24px; }
.journal__head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
.journal__head h2 { margin: 0; font-size: 24px; }
.journal__empty { padding: 24px; border: 1px dashed var(--c-border); border-radius: 16px; text-align: center; }
.journal__store { font-size: 12px; margin-top: 12px; }
.entry-form { display: flex; flex-direction: column; gap: 16px; margin-bottom: 20px; }
.entry-form__row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
.entry-form fieldset { border: 0; padding: 0; margin: 0; }
.entry-form__actions { display: flex; gap: 8px; }
.sku-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 8px; }
.sku { display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px; border: 1px solid var(--c-border); border-radius: 12px; cursor: pointer; }
.sku.active { border-color: var(--c-primary); background: var(--c-primary-soft); }
.sku input { width: 18px; height: 18px; margin-top: 2px; accent-color: var(--c-primary); flex-shrink: 0; }
.sku span { display: flex; flex-direction: column; font-size: 14px; }
.sku small { color: var(--c-muted); }
.entries { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.entry { display: grid; grid-template-columns: 90px minmax(0, 1fr) auto; gap: 16px; align-items: start; padding: 16px 18px; }
.entry__date { display: flex; flex-direction: column; }
.entry__date strong { font: 800 18px var(--font-head); }
.entry__phase { font-size: 13px; }
.entry__body p { margin: 2px 0; }
.entry__note { font-size: 14px; }
.entry__rain { display: inline-flex; align-items: center; gap: 6px; margin-top: 4px; font-size: 13px; color: var(--c-muted); }
.entry__rain.warn { color: var(--c-danger); font-weight: 600; }

@media (max-width: 1100px) {
  .week { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
@media (max-width: 900px) {
  .layout { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 640px) {
  .week { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .now { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .plan, .weather { padding: 18px; }
  .plan__when { font-size: 20px; }
  .plan__items li { flex-direction: column; gap: 4px; }
  .entry { grid-template-columns: minmax(0, 1fr) auto; }
  .entry__date { grid-column: 1; flex-direction: row; gap: 8px; align-items: baseline; }
  .entry__body { grid-column: 1 / -1; grid-row: 2; }
}
</style>
