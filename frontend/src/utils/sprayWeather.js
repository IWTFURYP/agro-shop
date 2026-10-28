// Погода для обприскування саду. Прогноз — безкоштовний сервіс Open-Meteo (без ключа):
// https://open-meteo.com. Тут же — правила, коли обприскувати добре, а коли не варто.

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';

// Пороги — орієнтир для більшості препаратів; конкретні умови дивіться на етикетці
export const LIMITS = {
  rainFreeHours: 6, // скільки годин після обробки має бути сухо
  rainMm: 0.5, // дощ, що вже змиває препарат, мм за 6 год
  rainProbBad: 60, // ймовірність дощу, %
  rainProbWarn: 35,
  tempMin: 5, // нижче — холодно для більшості препаратів
  tempCool: 10, // нижче — системні діють слабше
  tempWarm: 25, // вище — бажано відкласти на вечір
  tempMax: 28, // вище — спека, випаровування, опіки
  windWarn: 3.5, // м/с
  windMax: 5,
  dayFrom: 6, // години, коли зазвичай виходять у сад
  dayTo: 21,
};

export async function searchPlaces(query) {
  const url = `${GEOCODING_URL}?name=${encodeURIComponent(query)}&count=8&language=uk&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Не вдалося знайти населений пункт');
  const data = await res.json();
  const results = data.results || [];
  // Українські населені пункти — першими
  return results
    .sort((a, b) => (b.country_code === 'UA') - (a.country_code === 'UA'))
    .map((r) => ({
      name: r.name,
      region: [r.admin2, r.admin1].filter(Boolean).join(', '),
      country: r.country,
      lat: r.latitude,
      lon: r.longitude,
    }));
}

// Погодинний прогноз на 7 днів + 7 днів минулого (щоб знати, скільки випало дощу після обробки)
export async function fetchHourly({ lat, lon }) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    hourly: 'temperature_2m,relative_humidity_2m,precipitation,precipitation_probability,wind_speed_10m',
    wind_speed_unit: 'ms',
    timezone: 'auto',
    forecast_days: '7',
    past_days: '7',
  });
  const res = await fetch(`${FORECAST_URL}?${params}`);
  if (!res.ok) throw new Error('Не вдалося отримати прогноз погоди');
  return parseHourly(await res.json());
}

// Відповідь Open-Meteo → масив годин. Час у місцевому часовому поясі місця.
export function parseHourly(data) {
  const h = data.hourly;
  const offset = (data.utc_offset_seconds || 0) * 1000;
  return h.time.map((t, i) => ({
    time: t, // «2026-10-28T14:00» — місцевий час саду
    ts: Date.parse(`${t}:00Z`) - offset, // справжній момент часу
    date: t.slice(0, 10),
    hour: Number(t.slice(11, 13)),
    temp: h.temperature_2m[i],
    humidity: h.relative_humidity_2m?.[i] ?? null,
    rain: h.precipitation?.[i] ?? 0,
    rainProb: h.precipitation_probability?.[i] ?? null,
    wind: h.wind_speed_10m?.[i] ?? 0,
  }));
}

// Оцінка однієї години: good | caution | bad + пояснення людською мовою
export function assessHour(hours, index) {
  const h = hours[index];
  const ahead = hours.slice(index, index + LIMITS.rainFreeHours);
  const rainAhead = ahead.reduce((s, x) => s + (x.rain || 0), 0);
  const probAhead = Math.max(0, ...ahead.map((x) => x.rainProb ?? 0));
  const night = hours.slice(index, index + 18).filter((x) => x.hour <= 7 || x.hour >= 20);
  const minNight = night.length ? Math.min(...night.map((x) => x.temp)) : h.temp;

  const bad = [];
  const warn = [];
  if (h.rain >= 0.2) bad.push('Зараз іде дощ');
  else if (rainAhead >= LIMITS.rainMm || probAhead >= LIMITS.rainProbBad) {
    bad.push(`Дощ протягом ${LIMITS.rainFreeHours} год (${fmtMm(rainAhead)}, до ${probAhead} %) — змиє препарат`);
  } else if (probAhead >= LIMITS.rainProbWarn || rainAhead > 0) {
    warn.push(`Можливий дощ у найближчі години (до ${probAhead} %)`);
  }

  if (h.temp < LIMITS.tempMin) bad.push(`Холодно: ${fmtT(h.temp)} — препарати майже не діють`);
  else if (h.temp < LIMITS.tempCool) warn.push(`Прохолодно: ${fmtT(h.temp)} — системні препарати діють слабше (ципродиніл і мідь — можна)`);
  else if (h.temp > LIMITS.tempMax) bad.push(`Спека: ${fmtT(h.temp)} — розчин випаровується, ризик опіків листя`);
  else if (h.temp > LIMITS.tempWarm) warn.push(`Тепло: ${fmtT(h.temp)} — краще ввечері або зранку`);

  if (h.wind > LIMITS.windMax) bad.push(`Сильний вітер: ${fmtW(h.wind)} — знесення розчину`);
  else if (h.wind > LIMITS.windWarn) warn.push(`Вітер ${fmtW(h.wind)} — частина розчину знесеться`);

  if (h.humidity != null && h.humidity < 40 && h.temp > 22) warn.push(`Суха спека (вологість ${h.humidity} %) — краплі швидко висихають`);
  if (minNight < 0) warn.push(`Уночі заморозок (${fmtT(minNight)}) — олію та мідь не застосовуйте`);

  const level = bad.length ? 'bad' : warn.length ? 'caution' : 'good';
  return { level, reasons: [...bad, ...warn] };
}

// Найкращі «вікна» для роботи в саду: поспіль щонайменше 2 гарні години вдень
export function findWindows(hours, fromTs, days = 3) {
  const endTs = fromTs + days * 86400000;
  const windows = [];
  let current = null;
  hours.forEach((h, i) => {
    const daytime = h.hour >= LIMITS.dayFrom && h.hour < LIMITS.dayTo;
    const inRange = h.ts >= fromTs - 3600000 && h.ts < endTs;
    const ok = inRange && daytime && assessHour(hours, i).level === 'good';
    if (ok && current && current.date === h.date) {
      current.to = h.hour + 1;
      current.temps.push(h.temp);
    } else if (ok) {
      current = { date: h.date, from: h.hour, to: h.hour + 1, temps: [h.temp] };
      windows.push(current);
    } else {
      current = null;
    }
  });
  return windows
    .filter((w) => w.to - w.from >= 2)
    .map((w) => ({ ...w, tempMin: Math.min(...w.temps), tempMax: Math.max(...w.temps) }));
}

// Скільки дощу випало з моменту обробки (мм)
export function rainSince(hours, fromTs, toTs = Date.now()) {
  return hours.filter((h) => h.ts >= fromTs && h.ts <= toTs).reduce((s, h) => s + (h.rain || 0), 0);
}

// Короткий підсумок дня для календарика: найгірший/найкращий стан у світлий час
export function summarizeDays(hours, fromTs, days = 7) {
  const byDate = new Map();
  hours.forEach((h, i) => {
    if (h.ts < fromTs - 86400000 || h.hour < LIMITS.dayFrom || h.hour >= LIMITS.dayTo) return;
    const day = byDate.get(h.date) || { date: h.date, temps: [], rain: 0, probMax: 0, windMax: 0, good: 0 };
    day.temps.push(h.temp);
    day.rain += h.rain || 0;
    day.probMax = Math.max(day.probMax, h.rainProb ?? 0);
    day.windMax = Math.max(day.windMax, h.wind || 0);
    if (assessHour(hours, i).level === 'good') day.good++;
    byDate.set(h.date, day);
  });
  const today = localDate(fromTs);
  return [...byDate.values()]
    .filter((d) => d.date >= today)
    .slice(0, days)
    .map((d) => ({
      ...d,
      tempMin: Math.min(...d.temps),
      tempMax: Math.max(...d.temps),
      level: d.good >= 3 ? 'good' : d.good >= 2 ? 'caution' : 'bad',
    }));
}

export function localDate(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const fmtT = (t) => `${t > 0 ? '+' : ''}${Math.round(t)} °C`;
const fmtW = (w) => `${w.toLocaleString('uk-UA', { maximumFractionDigits: 1 })} м/с`;
const fmtMm = (mm) => `${mm.toLocaleString('uk-UA', { maximumFractionDigits: 1 })} мм`;
export { fmtT, fmtW, fmtMm };
