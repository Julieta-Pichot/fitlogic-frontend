// Hora del gimnasio. Se usa siempre America/Argentina/Buenos_Aires de forma explícita,
// sin depender de la zona horaria del navegador (el backend hace lo mismo).
export const GYM_TIMEZONE = 'America/Argentina/Buenos_Aires';
// Argentina no aplica horario de verano: el offset es fijo.
const GYM_UTC_OFFSET = '-03:00';

export const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const DAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
// Se identifican como en la BD: 1=Lunes ... 7=Domingo.
export const dayName = (day: number) => DAY_NAMES[day - 1] ?? '';

const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: GYM_TIMEZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  weekday: 'short',
});

const WEEKDAY_TO_ISO: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

export const getGymParts = (value: Date | string) => {
  const parts = Object.fromEntries(
    formatter.formatToParts(typeof value === 'string' ? new Date(value) : value).map((part) => [part.type, part.value])
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    diaSemana: WEEKDAY_TO_ISO[parts.weekday],
  };
};

const pad = (value: number) => String(value).padStart(2, '0');

export const formatGymTime = (value: Date | string) => {
  const { hour, minute } = getGymParts(value);
  return `${pad(hour)}:${pad(minute)}`;
};

export const formatGymDate = (value: Date | string) => {
  const { day, month, year } = getGymParts(value);
  return `${pad(day)}/${pad(month)}/${year}`;
};

export const formatGymDateTime = (value: Date | string) => `${formatGymDate(value)} ${formatGymTime(value)}`;

export const gymDayOfWeek = (value: Date | string) => getGymParts(value).diaSemana;

const toIso = (year: number, month: number, day: number, time: string) =>
  `${year}-${pad(month)}-${pad(day)}T${time}:00${GYM_UTC_OFFSET}`;

// Próxima fecha (a partir de ahora) en que cae `diaSemana` a la hora `time` (HH:mm), como ISO con offset.
export const nextOccurrenceIso = (diaSemana: number, time: string, from: Date = new Date()) => {
  const now = getGymParts(from);
  const [hour, minute] = time.split(':').map(Number);
  let delta = (diaSemana - now.diaSemana + 7) % 7;
  if (delta === 0 && (hour < now.hour || (hour === now.hour && minute <= now.minute))) delta = 7;

  const target = new Date(Date.UTC(now.year, now.month - 1, now.day + delta));
  return toIso(target.getUTCFullYear(), target.getUTCMonth() + 1, target.getUTCDate(), time);
};

// Misma fecha calendario que `original` (hora del gimnasio) pero con otra hora.
export const withGymTime = (original: Date | string, time: string) => {
  const { year, month, day } = getGymParts(original);
  return toIso(year, month, day, time);
};

// ¿La clase ocurre en el día calendario de `reference` (hora del gimnasio)?
export const occursOnGymDay = (
  clase: { recurrente: boolean; fechaHora: string; diasSemana: number[] },
  reference: Date = new Date()
) => {
  const target = getGymParts(reference);
  const start = getGymParts(clase.fechaHora);
  const startKey = start.year * 10000 + start.month * 100 + start.day;
  const targetKey = target.year * 10000 + target.month * 100 + target.day;

  if (!clase.recurrente) return startKey === targetKey;
  return clase.diasSemana.includes(target.diaSemana) && targetKey >= startKey;
};

// Límites del día de HOY en Buenos Aires como instantes ISO: [inicio, inicio del día siguiente).
export const gymTodayBounds = (now: Date = new Date()) => {
  const { year, month, day } = getGymParts(now);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return {
    desde: toIso(year, month, day, '00:00'),
    hasta: toIso(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), '00:00'),
  };
};

// 'YYYY-MM-DD' (columnas DATE del backend) a 'dd/mm/yyyy', sin pasar por zonas horarias.
export const formatIsoDate = (iso: string) => iso.split('-').reverse().join('/');

// Texto de vencimiento: Vence en 12 días, Vence hoy, Vencida hace 3 días.
export const expiryText = (days: number) => {
  if (days === 0) return 'Vence hoy';
  if (days === 1) return 'Vence mañana';
  if (days > 1) return `Vence en ${days} días`;
  return days === -1 ? 'Vencida ayer' : `Vencida hace ${Math.abs(days)} días`;
};

export const formatMoney = (value: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);

// Tiempo restante hasta una clase: en 45 min, en 2 h 15 min, en 3 días.
export const formatRemaining = (minutes: number) => {
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `en ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `en ${hours} h${minutes % 60 ? ` ${minutes % 60} min` : ''}`;
  const days = Math.floor(hours / 24);
  return `en ${days} ${days === 1 ? 'día' : 'días'}`;
};
