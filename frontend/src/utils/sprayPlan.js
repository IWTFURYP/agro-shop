// Підказка «коли і чим обприскувати наступного разу» за щоденником саду.
// Логіка: етапи (фенофази) з програми + інтервали між обробками + чергування хімічних груп
// + скільки дощу випало після останньої обробки.

import { ORCHARD_PHASES, SKU_INFO, GROUP_LABELS } from '@/data/orchardProgram';

const DAY = 86400000;
// Препарати від парші на випадок, коли на етапі вже нічого не лишилось, а захист потрібен
const SCAB_ROTATION = ['APL-F03', 'APL-F06', 'APL-F04', 'APL-F08', 'APL-F05'];
const SCAB_SEASON = ['green-tip', 'pink-bud', 'bloom', 'petal-fall', 'fruit-growth'];
const WASH_OFF_MM = 20; // після такого дощу контактний препарат змито
const INFECTION_MM = 5; // дощ, за якого можливе зараження паршею

export const parseDate = (s) => new Date(`${s}T12:00:00`);
export const addDays = (s, n) => {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const diffDays = (a, b) => Math.round((parseDate(a) - parseDate(b)) / DAY);

// Найраніший етап, у місяці якого потрапляє дата (грудень — лютий: чекаємо березня)
export function calendarPhaseIndex(dateStr) {
  const m = parseDate(dateStr).getMonth() + 1;
  if (m === 12 || m <= 2) return 0;
  const i = ORCHARD_PHASES.findIndex((p) => p.months.includes(m));
  return i === -1 ? ORCHARD_PHASES.length - 1 : i;
}

const isSingleSite = (g) => g.startsWith('FRAC') || g.startsWith('IRAC');
const groupName = (g) => `${GROUP_LABELS[g] || g}${isSingleSite(g) ? ` (${g})` : ''}`;
// Чи лишилися на етапі обов'язкові препарати, які ще не застосовано потрібну кількість разів
const remainingOnPhase = (phase, list) => {
  const used = new Map();
  for (const e of list.filter((x) => x.phase === phase.key)) for (const s of e.skus) used.set(s, (used.get(s) || 0) + 1);
  return phase.items.filter((i) => !i.optional && (used.get(i.sku) || 0) < (i.times || 1));
};
const seasonOf = (dateStr) => {
  const d = parseDate(dateStr);
  // Сезон — з березня по лютий наступного року
  return d.getMonth() + 1 <= 2 ? d.getFullYear() - 1 : d.getFullYear();
};

/**
 * @param entries — записи щоденника { date: 'YYYY-MM-DD', time, phase, skus: [] }
 * @param today   — 'YYYY-MM-DD'
 * @param rainAfterLast — мм дощу після останньої обробки (якщо відомо з погоди)
 */
export function recommend(entries, today, rainAfterLast = null) {
  const season = seasonOf(today);
  const month = parseDate(today).getMonth() + 1;
  const list = entries.filter((e) => seasonOf(e.date) === season).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
  const last = list[list.length - 1];
  const notes = [];

  // Зима — до сезону ще далеко
  if (month === 12 || month <= 2) {
    const start = `${month === 12 ? parseDate(today).getFullYear() + 1 : parseDate(today).getFullYear()}-03-10`;
    return build(0, start, 'offseason', ['Сад відпочиває. Перша обробка — по сплячих бруньках, коли вдень стабільно вище +5 °C (зазвичай у березні).']);
  }

  const calIdx = calendarPhaseIndex(today);
  if (!last) {
    notes.push('У щоденнику цього сезону ще немає записів — підказуємо за календарем.');
    return build(calIdx, today, 'due', notes);
  }

  const lastIdx = Math.max(0, ORCHARD_PHASES.findIndex((p) => p.key === last.phase));
  const lastPhase = ORCHARD_PHASES[lastIdx];
  const phaseMonthsLeft = lastPhase.months.some((m) => m >= month);

  let idx;
  if (remainingOnPhase(lastPhase, list).length && phaseMonthsLeft) idx = lastIdx;
  else idx = Math.max(lastIdx + 1, calIdx);

  if (idx >= ORCHARD_PHASES.length) {
    return build(0, `${season + 1}-03-10`, 'offseason', ['Програму цього сезону виконано! Наступна обробка — навесні, по сплячих бруньках.']);
  }

  let nextDate = addDays(last.date, lastPhase.interval[0]);
  let status = diffDays(nextDate, today) > 0 ? 'wait' : diffDays(nextDate, today) < -lastPhase.interval[1] + lastPhase.interval[0] ? 'overdue' : 'due';
  // Перейшли на наступний етап за календарем — це не прострочення, просто час нової обробки
  if (idx !== lastIdx && diffDays(nextDate, today) < 0) {
    nextDate = today;
    status = 'due';
  }

  // Дощ після обробки
  const daysSinceLast = diffDays(today, last.date);
  let preferCurative = false;
  const lastHadContact = last.skus.some((s) => SKU_INFO[s]?.contact && SKU_INFO[s]?.kind === 'fungicide');
  if (rainAfterLast != null && SCAB_SEASON.includes(ORCHARD_PHASES[idx].key)) {
    if (rainAfterLast >= WASH_OFF_MM && lastHadContact) {
      status = 'urgent';
      nextDate = today;
      notes.push(`Після обробки випало ${fmtMm(rainAfterLast)} дощу — контактний препарат змито, сад без захисту від парші.`);
    } else if (rainAfterLast >= INFECTION_MM && daysSinceLast >= lastPhase.interval[0]) {
      // Захист уже вичерпався, а дощ був — можливе зараження
      preferCurative = true;
      status = 'urgent';
      nextDate = today;
      notes.push(`Після обробки випало ${fmtMm(rainAfterLast)} дощу, а захист уже закінчився — можливе зараження паршею. Протягом 3–4 днів після дощу застосуйте препарат з лікувальною дією.`);
    }
  }
  return build(idx, nextDate, status, notes, { last, list, preferCurative });

  function build(phaseIdx, date, st, extraNotes, ctx = {}) {
    const phase = ORCHARD_PHASES[phaseIdx];
    const { items, itemNotes } = pickItems(phase, ctx.list || [], ctx.last, ctx.preferCurative);
    return {
      phase,
      phaseIndex: phaseIdx,
      date,
      daysLeft: diffDays(date, today),
      status: st,
      items,
      notes: [...extraNotes, ...itemNotes],
      last: ctx.last || null,
      interval: ctx.last ? ORCHARD_PHASES.find((p) => p.key === ctx.last.phase)?.interval : null,
    };
  }
}

// Добір препаратів: те, що ще не зроблено на етапі, з урахуванням лімітів і чергування груп
function pickItems(phase, list, last, preferCurative) {
  const itemNotes = [];
  const usedInPhase = new Map();
  for (const e of list.filter((x) => x.phase === phase.key)) for (const s of e.skus) usedInPhase.set(s, (usedInPhase.get(s) || 0) + 1);
  const groupUses = new Map();
  for (const e of list) {
    for (const s of e.skus) for (const g of SKU_INFO[s]?.groups || []) groupUses.set(g, (groupUses.get(g) || 0) + 1);
  }
  const lastGroups = new Set((last?.skus || []).flatMap((s) => (SKU_INFO[s]?.kind === 'fungicide' || SKU_INFO[s]?.kind === 'insecticide' || SKU_INFO[s]?.kind === 'acaricide' ? SKU_INFO[s].groups : [])));

  const overLimit = (sku) => {
    const info = SKU_INFO[sku];
    if (!info?.max) return null;
    const g = info.groups.find((x) => (groupUses.get(x) || 0) >= info.max);
    return g ? `${groupName(g)} уже використано ${groupUses.get(g)} раз(и) за сезон — це максимум` : null;
  };
  const sameAsLast = (sku) => (SKU_INFO[sku]?.groups || []).find((g) => isSingleSite(g) && lastGroups.has(g));

  const chosen = [];
  for (const item of phase.items) {
    if (item.optional) continue;
    if ((usedInPhase.get(item.sku) || 0) >= (item.times || 1)) continue;
    const limit = overLimit(item.sku);
    if (limit) {
      itemNotes.push(limit);
      continue;
    }
    const repeat = sameAsLast(item.sku);
    if (repeat) {
      itemNotes.push(`Минулого разу вже була група «${groupName(repeat)}» — щоб не виникла стійкість, чергуємо з іншою.`);
      continue;
    }
    chosen.push({ sku: item.sku, why: item.why });
  }

  // У сезон парші фунгіцид потрібен завжди: якщо на етапі не лишилось — беремо з ротації
  const hasFungicide = chosen.some((c) => SKU_INFO[c.sku]?.kind === 'fungicide');
  if (SCAB_SEASON.includes(phase.key) && (!hasFungicide || preferCurative)) {
    const pool = preferCurative ? ['APL-F06', 'APL-F05', ...SCAB_ROTATION] : SCAB_ROTATION;
    const alt = pool.find((s) => !chosen.some((c) => c.sku === s) && !overLimit(s) && !sameAsLast(s)
      && (!preferCurative || !SKU_INFO[s].contact));
    if (alt) {
      chosen.unshift({ sku: alt, why: preferCurative ? 'Парша — лікувальна дія після дощу' : 'Парша — продовжуємо захист (чергування препаратів)' });
    }
  }
  return { items: chosen, itemNotes: [...new Set(itemNotes)] };
}

const fmtMm = (mm) => `${mm.toLocaleString('uk-UA', { maximumFractionDigits: 1 })} мм`;
