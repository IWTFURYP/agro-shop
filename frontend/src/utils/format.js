const priceFormatter = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 2 });

export function formatPrice(value) {
  if (value == null) return 'Ціна за запитом';
  return `${priceFormatter.format(value)} грн`;
}

export function formatDate(value) {
  if (!value) return '';
  // SQLite зберігає час в UTC без позначки часової зони
  const date = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
  return date.toLocaleString('uk-UA', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function pluralize(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
