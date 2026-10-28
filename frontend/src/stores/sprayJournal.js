import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

// Щоденник обприскувань саду та місце для прогнозу погоди.
// Зберігається в браузері покупця (на цьому пристрої).
const ENTRIES_KEY = 'agro_spray_journal';
const PLACE_KEY = 'agro_spray_place';

function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback;
  } catch {
    return fallback;
  }
}
function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* браузер не дозволяє зберігати — щоденник працюватиме до закриття сторінки */
  }
}

export const useSprayJournalStore = defineStore('sprayJournal', () => {
  // { id, date: 'YYYY-MM-DD', time: 'HH:MM', phase, skus: [], other, note }
  const entries = ref(load(ENTRIES_KEY, []).filter((e) => e && e.date && Array.isArray(e.skus)));
  // { name, region, lat, lon }
  const place = ref(load(PLACE_KEY, null));

  watch(entries, (v) => save(ENTRIES_KEY, v), { deep: true });
  watch(place, (v) => save(PLACE_KEY, v));

  function add(entry) {
    entries.value.push({ id: Date.now(), ...entry });
    entries.value.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  }

  function remove(id) {
    entries.value = entries.value.filter((e) => e.id !== id);
  }

  function setPlace(value) {
    place.value = value;
  }

  return { entries, place, add, remove, setPlace };
});
