import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, Download, Loader2, RefreshCw, Scale, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal, Pagination } from '@/components/ui';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useDebounce } from '@/hooks/use-debounce';
import { plansService } from '@/services/api';
import {
  ingresosService,
  type IncomePayment,
  type PaymentSort,
  type PendingPayment,
  type PeriodTotals,
  type Reconciliation,
} from '@/services/ingresos.service';
import { getErrorMessage } from '@/utils/get-error-message';
import { formatGymDateTime, formatIsoDate, formatMoney, getGymParts } from '@/utils/gym-time';

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

const pad = (value: number) => String(value).padStart(2, '0');
const isoOf = (year: number, month: number, day: number) => `${year}-${pad(month)}-${pad(day)}`;
const shiftIso = (iso: string, days: number) => {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return isoOf(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
};

// Presets de rango calculados con la fecha de hoy en Buenos Aires (no la del navegador).
const buildPresets = () => {
  const now = getGymParts(new Date());
  const today = isoOf(now.year, now.month, now.day);
  const monthStart = isoOf(now.year, now.month, 1);
  const prev = now.month === 1 ? { year: now.year - 1, month: 12 } : { year: now.year, month: now.month - 1 };
  return [
    { id: 'hoy', label: 'Hoy', desde: today, hasta: today },
    { id: 'mes', label: 'Este mes', desde: monthStart, hasta: today },
    { id: 'anterior', label: 'Mes anterior', desde: isoOf(prev.year, prev.month, 1), hasta: shiftIso(monthStart, -1) },
    { id: '30', label: 'Últimos 30 días', desde: shiftIso(today, -29), hasta: today },
    { id: '365', label: 'Últimos 12 meses', desde: shiftIso(today, -364), hasta: today },
  ];
};

const METHOD_LABEL: Record<string, string> = { MERCADO_PAGO: 'Mercado Pago', EFECTIVO: 'Efectivo' };
const methodLabel = (value: string) => METHOD_LABEL[value] ?? value;

const card = 'rounded-2xl border border-border bg-card';
const fieldClass = 'rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20';

function QueryError({ error, onRetry, fallback }: { error: unknown; onRetry: () => void; fallback: string }) {
  return (
    <div role="alert" className="space-y-3 rounded-2xl border border-red-500/30 bg-red-500/5 p-5 text-center">
      <AlertTriangle className="mx-auto h-5 w-5 text-red-500" />
      <p className="text-sm text-red-500">{getErrorMessage(error, fallback)}</p>
      <button type="button" onClick={onRetry} className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary/70">
        Reintentar
      </button>
    </div>
  );
}

const Empty = ({ children }: { children: string }) => <p className="px-4 py-8 text-center text-sm text-muted-foreground">{children}</p>;

// ---------------------------------------------------------------------------
// Pantalla
// ---------------------------------------------------------------------------

export function IngresosManagement() {
  const presets = buildPresets();
  const [presetId, setPresetId] = useState('mes');
  const preset = presets.find((item) => item.id === presetId);
  const [custom, setCustom] = useState({ desde: presets[1].desde, hasta: presets[1].hasta });
  const range = preset ? { desde: preset.desde, hasta: preset.hasta } : custom;
  const rangeInvalid = Boolean(range.desde && range.hasta && range.desde > range.hasta);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ingresos</h1>
        <p className="text-sm text-muted-foreground">Cobros de membresías en hora de Buenos Aires. Bruto = lo que pagó el cliente; neto = lo que recibe el gimnasio tras comisiones.</p>
      </div>

      <div className={`${card} space-y-3 p-4`}>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Período">
          {presets.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={presetId === item.id}
              onClick={() => setPresetId(item.id)}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${presetId === item.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-secondary/70'}`}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={presetId === 'custom'}
            onClick={() => setPresetId('custom')}
            className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${presetId === 'custom' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-secondary/70'}`}
          >
            Personalizado
          </button>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Desde
            <input type="date" className={fieldClass} value={range.desde} disabled={presetId !== 'custom'} onChange={(event) => setCustom((prev) => ({ ...prev, desde: event.target.value }))} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Hasta
            <input type="date" className={fieldClass} value={range.hasta} disabled={presetId !== 'custom'} onChange={(event) => setCustom((prev) => ({ ...prev, hasta: event.target.value }))} />
          </label>
          {rangeInvalid && <p role="alert" className="text-sm text-red-500">«Desde» no puede ser posterior a «Hasta».</p>}
        </div>
      </div>

      <SummarySection range={range} disabled={rangeInvalid} />
      {!rangeInvalid && range.desde && range.hasta && (
        <>
          <ChartSection range={range} />
          <BreakdownSection range={range} />
          <PaymentsSection range={range} />
        </>
      )}
      <PendingSection />
      <ReconciliationSection range={range} disabled={rangeInvalid || !range.desde || !range.hasta} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Resumen
// ---------------------------------------------------------------------------

function SummarySection({ range, disabled }: { range: { desde: string; hasta: string }; disabled: boolean }) {
  const query = useQuery({ queryKey: ['admin', 'ingresos', 'resumen', range], queryFn: () => ingresosService.getSummary(range), enabled: !disabled });
  if (disabled) return null;
  if (query.isLoading) return <LoadingSpinner label="Cargando ingresos..." />;
  if (query.isError) return <QueryError error={query.error} onRetry={() => query.refetch()} fallback="No se pudo cargar el resumen de ingresos" />;
  const data = query.data;
  if (!data) return null;

  const blocks: Array<{ title: string; subtitle: string; totals: PeriodTotals }> = [
    { title: 'Cobrado hoy', subtitle: formatIsoDate(data.hoy.desde), totals: data.hoy },
    { title: 'Este mes', subtitle: `${formatIsoDate(data.mes.desde)} al ${formatIsoDate(data.mes.hasta)}`, totals: data.mes },
    { title: 'Mes anterior', subtitle: `${formatIsoDate(data.mesAnterior.desde)} al ${formatIsoDate(data.mesAnterior.hasta)}`, totals: data.mesAnterior },
    { title: 'Período elegido', subtitle: `${formatIsoDate(data.rango.desde)} al ${formatIsoDate(data.rango.hasta)}`, totals: data.rango },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {blocks.map((block) => (
        <div key={block.title} className={`${card} p-5`}>
          <p className="text-sm text-muted-foreground">{block.title}</p>
          <p className="text-xs text-muted-foreground">{block.subtitle}</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{formatMoney(block.totals.bruto)}</p>
          {block.totals.cantidad === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">Todavía no hay ingresos en este período.</p>
          ) : (
            <dl className="mt-2 space-y-0.5 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Comisiones</dt><dd className="text-foreground">{formatMoney(block.totals.comisiones)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Neto</dt><dd className="font-medium text-foreground">{formatMoney(block.totals.neto)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Pagos</dt><dd className="text-foreground">{block.totals.cantidad}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Ticket promedio</dt><dd className="text-foreground">{formatMoney(block.totals.ticketPromedio)}</dd></div>
            </dl>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gráfico
// ---------------------------------------------------------------------------

function ChartSection({ range }: { range: { desde: string; hasta: string } }) {
  const [measure, setMeasure] = useState<'bruto' | 'neto'>('bruto');
  const query = useQuery({ queryKey: ['admin', 'ingresos', 'grafico', range], queryFn: () => ingresosService.getChart({ ...range, agrupar: 'auto' }) });
  const points = query.data?.puntos ?? [];
  const max = Math.max(1, ...points.map((point) => point[measure]));
  const total = points.reduce((sum, point) => sum + point[measure], 0);

  return (
    <section className={`${card} p-5`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-foreground">Ingresos {query.data?.agrupacion === 'mes' ? 'por mes' : 'por día'}</h2>
          <p className="text-xs text-muted-foreground">{query.data?.agrupacion === 'mes' ? 'Rango largo: se agrupa por mes.' : 'Rango corto: se muestra día por día.'}</p>
        </div>
        <div className="flex rounded-xl bg-secondary p-1" role="group" aria-label="Medida">
          {(['bruto', 'neto'] as const).map((item) => (
            <button key={item} type="button" aria-pressed={measure === item} onClick={() => setMeasure(item)} className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors ${measure === item ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>
              {item}
            </button>
          ))}
        </div>
      </div>

      {query.isLoading ? (
        <LoadingSpinner label="Cargando gráfico..." />
      ) : query.isError ? (
        <QueryError error={query.error} onRetry={() => query.refetch()} fallback="No se pudo cargar el gráfico" />
      ) : total === 0 ? (
        <Empty>Todavía no hay ingresos en este período.</Empty>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <div className="flex h-48 items-end gap-1" style={{ minWidth: `${Math.min(points.length, 62) * 22}px` }} role="img" aria-label={`Ingresos ${measure}s: total ${formatMoney(total)}`}>
            {points.map((point) => (
              <div key={point.clave} className="flex h-full min-w-[14px] flex-1 flex-col items-center justify-end gap-1" title={`${point.etiqueta}: ${formatMoney(point[measure])} (${point.cantidad} ${point.cantidad === 1 ? 'pago' : 'pagos'})`}>
                <div className="w-full rounded-t-md bg-primary transition-all" style={{ height: `${(point[measure] / max) * 100}%`, minHeight: point[measure] > 0 ? 3 : 0 }} />
                {points.length <= 31 && <span className="text-[10px] text-muted-foreground">{point.etiqueta.slice(0, 2)}</span>}
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Total {measure}: <span className="font-semibold text-foreground">{formatMoney(total)}</span> · pasá el mouse (o tocá) sobre una barra para ver el detalle.
          </p>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Desglose
// ---------------------------------------------------------------------------

function BreakdownSection({ range }: { range: { desde: string; hasta: string } }) {
  const query = useQuery({ queryKey: ['admin', 'ingresos', 'desglose', range], queryFn: () => ingresosService.getBreakdown(range) });
  if (query.isLoading) return <LoadingSpinner label="Cargando desglose..." />;
  if (query.isError) return <QueryError error={query.error} onRetry={() => query.refetch()} fallback="No se pudo cargar el desglose" />;
  const data = query.data;
  if (!data) return null;

  const table = (title: string, rows: typeof data.porMetodo, label: (name: string) => string) => (
    <div className={`${card} p-5`}>
      <h2 className="mb-3 font-semibold text-foreground">{title}</h2>
      {rows.length === 0 ? (
        <Empty>Todavía no hay ingresos en este período.</Empty>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.clave}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate font-medium text-foreground">{label(row.nombre)}</span>
                <span className="flex-shrink-0 text-foreground">{formatMoney(row.bruto)} · {row.porcentaje.toLocaleString('es-AR')}%</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${row.porcentaje}%` }} /></div>
              <p className="mt-0.5 text-xs text-muted-foreground">{row.cantidad} {row.cantidad === 1 ? 'pago' : 'pagos'} · comisiones {formatMoney(row.comisiones)} · neto {formatMoney(row.neto)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {table('Por método de pago', data.porMetodo, methodLabel)}
      {table('Por plan', data.porPlan, (name) => name)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Listado de pagos
// ---------------------------------------------------------------------------

const COLUMNS: Array<{ id: PaymentSort; label: string; align?: 'right' }> = [
  { id: 'fecha', label: 'Fecha' },
  { id: 'cliente', label: 'Cliente' },
  { id: 'plan', label: 'Plan' },
  { id: 'metodo', label: 'Método' },
  { id: 'bruto', label: 'Bruto', align: 'right' },
  { id: 'comision', label: 'Comisión', align: 'right' },
  { id: 'neto', label: 'Neto', align: 'right' },
];

function PaymentsSection({ range }: { range: { desde: string; hasta: string } }) {
  const [page, setPage] = useState(1);
  const [method, setMethod] = useState('');
  const [planId, setPlanId] = useState('');
  const [text, setText] = useState('');
  const [sort, setSort] = useState<PaymentSort>('fecha');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [detailId, setDetailId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const q = useDebounce(text.trim(), 350);

  const plans = useQuery({ queryKey: ['admin', 'ingresos', 'planes'], queryFn: plansService.list, staleTime: 300_000 });
  const filters = { ...range, metodo: method || undefined, planId: planId || undefined, q: q || undefined, orden: sort, dir };
  const query = useQuery({
    queryKey: ['admin', 'ingresos', 'pagos', filters, page],
    queryFn: () => ingresosService.listPayments({ ...filters, page, limit: 10 }),
    placeholderData: (previous) => previous,
  });

  const change = (apply: () => void) => {
    apply();
    setPage(1);
  };
  const toggleSort = (id: PaymentSort) => {
    if (id === sort) setDir((current) => (current === 'asc' ? 'desc' : 'asc'));
    else {
      setSort(id);
      setDir(id === 'fecha' || id === 'bruto' || id === 'neto' || id === 'comision' ? 'desc' : 'asc');
    }
    setPage(1);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const blob = await ingresosService.exportCsv(filters);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ingresos-${range.desde}_a_${range.hasta}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo exportar el CSV'));
    } finally {
      setExporting(false);
    }
  };

  const items = query.data?.items ?? [];
  const hasFilters = Boolean(method || planId || text);

  return (
    <section className={`${card} p-5`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-foreground">Pagos</h2>
        <button type="button" onClick={exportCsv} disabled={exporting} className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary/70 disabled:opacity-60">
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Exportar CSV
        </button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input type="search" value={text} onChange={(event) => change(() => setText(event.target.value))} placeholder="Cliente, email o referencia" aria-label="Buscar pagos" maxLength={100} className={fieldClass} />
        <select value={method} onChange={(event) => change(() => setMethod(event.target.value))} aria-label="Método" className={fieldClass}>
          <option value="">Todos los métodos</option>
          <option value="MERCADO_PAGO">Mercado Pago</option>
          <option value="EFECTIVO">Efectivo</option>
        </select>
        <select value={planId} onChange={(event) => change(() => setPlanId(event.target.value))} aria-label="Plan" className={fieldClass}>
          <option value="">Todos los planes</option>
          {(plans.data ?? []).map((plan: { id: number; nombre: string }) => (
            <option key={plan.id} value={plan.id}>{plan.nombre}</option>
          ))}
        </select>
        {hasFilters && (
          <button type="button" onClick={() => change(() => { setText(''); setMethod(''); setPlanId(''); })} className="rounded-lg px-3 py-2 text-left text-sm font-medium text-primary hover:underline">
            Limpiar filtros
          </button>
        )}
      </div>

      {query.isLoading ? (
        <LoadingSpinner label="Cargando pagos..." />
      ) : query.isError ? (
        <div className="mt-4"><QueryError error={query.error} onRetry={() => query.refetch()} fallback="No se pudo cargar el listado de pagos" /></div>
      ) : items.length === 0 ? (
        <Empty>{hasFilters ? 'No hay pagos que coincidan con los filtros.' : 'Todavía no hay ingresos en este período.'}</Empty>
      ) : (
        <>
          <div className={`mt-4 overflow-x-auto ${query.isPlaceholderData ? 'opacity-60' : ''}`}>
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  {COLUMNS.map((column) => (
                    <th key={column.id} scope="col" aria-sort={sort === column.id ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'} className={`py-2 pr-3 font-medium ${column.align === 'right' ? 'text-right' : ''}`}>
                      <button type="button" onClick={() => toggleSort(column.id)} className="inline-flex items-center gap-1 hover:text-foreground">
                        {column.label}
                        {sort === column.id && (dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </button>
                    </th>
                  ))}
                  <th scope="col" className="py-2 font-medium">Referencia</th>
                  <th scope="col" className="py-2 pl-3 font-medium">Cuota</th>
                </tr>
              </thead>
              <tbody>
                {items.map((payment) => (
                  <tr key={payment.id} onClick={() => setDetailId(payment.id)} className="cursor-pointer border-b border-border/60 hover:bg-secondary/40">
                    <td className="whitespace-nowrap py-2.5 pr-3 text-foreground">{formatGymDateTime(payment.fechaPago)}</td>
                    <td className="py-2.5 pr-3 text-foreground">{payment.cliente.nombre}</td>
                    <td className="py-2.5 pr-3 text-foreground">{payment.plan}</td>
                    <td className="py-2.5 pr-3 text-foreground">{methodLabel(payment.metodo)}</td>
                    <td className="py-2.5 pr-3 text-right font-medium text-foreground">{formatMoney(payment.bruto)}</td>
                    <td className="py-2.5 pr-3 text-right text-foreground">{formatMoney(payment.comision)}</td>
                    <td className="py-2.5 pr-3 text-right text-foreground">{formatMoney(payment.neto)}</td>
                    <td className="max-w-[140px] truncate py-2.5 text-muted-foreground">{payment.referenciaExterna ?? '—'}</td>
                    <td className="py-2.5 pl-3 text-muted-foreground">{payment.estadoCuota}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <Pagination page={query.data?.pagination.page ?? 1} totalPages={query.data?.pagination.totalPages ?? 1} total={query.data?.pagination.total ?? 0} onPageChange={setPage} />
          </div>
        </>
      )}

      {detailId !== null && <PaymentDetailModal id={detailId} onClose={() => setDetailId(null)} />}
    </section>
  );
}

function PaymentDetailModal({ id, onClose }: { id: number; onClose: () => void }) {
  const query = useQuery({ queryKey: ['admin', 'ingresos', 'pago', id], queryFn: () => ingresosService.getPayment(id) });
  const payment = query.data;
  const rows = (item: IncomePayment): Array<[string, string]> => [
    ['Fecha', formatGymDateTime(item.fechaPago)],
    ['Cliente', `${item.cliente.nombre} · ${item.cliente.email}`],
    ['Plan', item.plan],
    ['Vigencia de la cuota', `${formatIsoDate(item.vigencia.desde)} al ${formatIsoDate(item.vigencia.hasta)} (${item.estadoCuota})`],
    ['Método', `${methodLabel(item.metodo)}${item.medioPago ? ` · ${item.medioPago}` : ''}${item.ultimosDigitos ? ` ****${item.ultimosDigitos}` : ''}`],
    ['Bruto', formatMoney(item.bruto)],
    ['Comisión', formatMoney(item.comision)],
    ['Neto', `${formatMoney(item.neto)}${item.sinDatosDeNeto ? ' (pago sin datos de comisión: se toma el bruto)' : ''}`],
    ['Acreditación', item.fechaAcreditacion ? formatGymDateTime(item.fechaAcreditacion) : '—'],
    ['Referencia', item.referenciaExterna ?? '—'],
  ];

  return (
    <Modal open onClose={onClose} title={`Pago #${id}`} className="max-w-xl">
      {query.isLoading ? (
        <LoadingSpinner label="Cargando pago..." />
      ) : query.isError || !payment ? (
        <QueryError error={query.error} onRetry={() => query.refetch()} fallback="No se pudo cargar el pago" />
      ) : (
        <div className="space-y-4">
          <dl className="divide-y divide-border text-sm">
            {rows(payment).map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-2"><dt className="text-muted-foreground">{label}</dt><dd className="break-words text-right font-medium text-foreground">{value}</dd></div>
            ))}
          </dl>
          {payment.eventosMp.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-foreground">Eventos de Mercado Pago</h3>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {payment.eventosMp.map((event) => (
                  <li key={event.id}>{formatGymDateTime(event.fechaRecepcion)} · {event.origen} · {event.estado}{event.detalleEstado ? ` (${event.detalleEstado})` : ''}{event.procesado ? ' · procesado' : ''}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Pendientes y rechazados
// ---------------------------------------------------------------------------

const CLASS_UI: Record<PendingPayment['clasificacion'], { label: string; color: string }> = {
  SIN_INTENTO: { label: 'Sin intento de pago', color: 'bg-secondary text-muted-foreground' },
  PENDIENTE: { label: 'Pendiente', color: 'bg-yellow-500/10 text-yellow-600' },
  RECHAZADO: { label: 'Rechazado', color: 'bg-red-500/10 text-red-500' },
};

const ageText = (hours: number) => (hours < 1 ? 'hace menos de 1 h' : hours < 48 ? `hace ${hours} h` : `hace ${Math.round(hours / 24)} días`);

function PendingSection() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['admin', 'ingresos', 'pendientes'], queryFn: ingresosService.listPending });
  const verify = useMutation({
    mutationFn: (cuotaId: number) => ingresosService.verifyPending(cuotaId),
    onSuccess: (result) => {
      toast.success(result.estado === 'APROBADO' ? 'Pago acreditado: la membresía quedó activa' : result.mensaje ?? `Estado en Mercado Pago: ${result.estado}`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'ingresos'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'No se pudo verificar el pago')),
  });
  const items = query.data?.items ?? [];

  return (
    <section className={`${card} p-5`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-foreground">Pagos pendientes y rechazados</h2>
          <p className="text-xs text-muted-foreground">Cuotas de Mercado Pago sin acreditar. «Verificar ahora» consulta a Mercado Pago y, si el pago está aprobado, activa la membresía.</p>
        </div>
        <button type="button" onClick={() => query.refetch()} aria-label="Actualizar" className="rounded-lg bg-secondary p-2 text-foreground hover:bg-secondary/70"><RefreshCw className={`h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} /></button>
      </div>
      {query.isLoading ? (
        <LoadingSpinner label="Cargando pendientes..." />
      ) : query.isError ? (
        <div className="mt-4"><QueryError error={query.error} onRetry={() => query.refetch()} fallback="No se pudieron cargar los pagos pendientes" /></div>
      ) : items.length === 0 ? (
        <Empty>No hay pagos pendientes ni rechazados.</Empty>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => {
            const ui = CLASS_UI[item.clasificacion];
            return (
              <li key={item.cuotaId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{item.cliente.nombre} · {item.plan}</p>
                  <p className="text-xs text-muted-foreground">{item.cliente.email} · {ageText(item.antiguedadHoras)}{item.monto !== null ? ` · ${formatMoney(item.monto)}` : ''}{item.mpPaymentId ? ` · MP ${item.mpPaymentId}` : ''}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.mensajeMp}</p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ui.color}`}>{ui.label}</span>
                  <button type="button" onClick={() => verify.mutate(item.cuotaId)} disabled={verify.isPending} className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                    {verify.isPending && verify.variables === item.cuotaId ? 'Verificando...' : 'Verificar ahora'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Conciliación (solo lectura)
// ---------------------------------------------------------------------------

function ReconciliationSection({ range, disabled }: { range: { desde: string; hasta: string }; disabled: boolean }) {
  const [report, setReport] = useState<Reconciliation | null>(null);
  const run = useMutation({
    mutationFn: () => ingresosService.reconcile(range),
    onSuccess: setReport,
  });

  return (
    <section className={`${card} p-5`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-foreground"><Scale className="h-4 w-4" /> Conciliación con Mercado Pago</h2>
          <p className="text-xs text-muted-foreground">Compara los pagos aprobados en Mercado Pago contra los registrados en FitLogic para el período elegido. Es solo de lectura: no corrige nada.</p>
        </div>
        <button type="button" onClick={() => run.mutate()} disabled={run.isPending || disabled} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
          {run.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />} Conciliar período
        </button>
      </div>

      {run.isError && <p role="alert" className="mt-3 text-sm text-red-500">{getErrorMessage(run.error, 'No se pudo conciliar')} <button type="button" onClick={() => run.mutate()} className="font-medium underline">Reintentar</button></p>}

      {report && (
        <div className="mt-4 space-y-4">
          <p className={`flex items-center gap-2 rounded-xl p-3 text-sm ${report.resumen.conDiferencias === 0 ? 'bg-green-500/10 text-green-600' : 'bg-yellow-500/10 text-yellow-700'}`}>
            {report.resumen.conDiferencias === 0 ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {report.resumen.conDiferencias === 0 ? 'Todo coincide.' : `${report.resumen.conDiferencias} diferencia(s) encontradas.`} En Mercado Pago: {report.resumen.pagosAprobadosEnMp} pagos de FitLogic ({report.resumen.pagosAjenosIgnorados} ajenos ignorados). En FitLogic: {report.resumen.pagosLocalesMercadoPago}.
            {report.truncado && ' El resultado se truncó: acotá el período.'}
          </p>
          {report.enMpSinRegistro.length > 0 && (
            <div>
              <h3 className="mb-1 text-sm font-semibold text-foreground">Aprobados en Mercado Pago sin registro en FitLogic</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {report.enMpSinRegistro.map((row) => <li key={row.mpPaymentId}>MP {row.mpPaymentId} · {formatMoney(row.monto)}{row.cuotaId ? ` · cuota ${row.cuotaId}` : ''}{row.fechaAprobacion ? ` · ${formatGymDateTime(row.fechaAprobacion)}` : ''}</li>)}
              </ul>
            </div>
          )}
          {report.localSinPagoEnMp.length > 0 && (
            <div>
              <h3 className="mb-1 text-sm font-semibold text-foreground">Registrados en FitLogic sin pago aprobado en Mercado Pago</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {report.localSinPagoEnMp.map((row) => <li key={row.pagoId}>Pago #{row.pagoId} · {row.cliente} · {formatMoney(row.monto)} · ref. {row.referenciaExterna ?? '—'} · estado en MP: {row.estadoEnMp}</li>)}
              </ul>
            </div>
          )}
          {report.montosDistintos.length > 0 && (
            <div>
              <h3 className="mb-1 text-sm font-semibold text-foreground">Montos que no coinciden</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {report.montosDistintos.map((row) => <li key={row.mpPaymentId}>MP {row.mpPaymentId} (pago #{row.pagoId}): Mercado Pago {formatMoney(row.brutoMp)} · FitLogic {formatMoney(row.brutoLocal)}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
