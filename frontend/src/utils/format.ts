const number = new Intl.NumberFormat('en', { maximumFractionDigits: 2 });
export const formatNumber = (value: number | null | undefined) => value == null || !Number.isFinite(value) ? 'Unavailable' : number.format(value);
export const formatScore = (value: number | null | undefined) => value == null || !Number.isFinite(value) ? 'Unavailable' : value.toFixed(4);
export const formatPercent = (value: number) => `${formatNumber(value)}%`;
export const formatDate = (value: string) => {
  const date = new Date(value.endsWith('Z') || /[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(date) + ' UTC';
};
