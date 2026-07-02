/**
 * CitasPanel (T136) — listado de citas administrativas + export PDF.
 *
 * Filtros: rango `from` / `to` (defaults hoy) + estado (default: todas).
 * La tabla usa <table>/<caption>/<th scope="col"> para accesibilidad. El
 * botón "Descargar PDF" abre la URL del endpoint en una pestaña nueva; el
 * navegador maneja la descarga por Content-Disposition (el backend registra
 * `pdf_exported` en el audit log automáticamente).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminApi, type AdminAppointment } from '../../lib/api';
import { ApiError } from '../../lib/api-client';
import { Button } from '../ui/Button';

const formatterFecha = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
});

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

function labelEstado(status: string): string {
  switch (status) {
    case 'active':
      return 'Activa';
    case 'cancelled_by_donor':
      return 'Cancelada (donante)';
    case 'cancelled_by_bank':
      return 'Cancelada (banco)';
    case 'attended':
      return 'Asistida';
    case 'no_show':
      return 'No asistida';
    default:
      return status;
  }
}

export function CitasPanel(): JSX.Element {
  const [from, setFrom] = useState<string>(hoy());
  const [to, setTo] = useState<string>(hoy());
  const [status, setStatus] = useState<string>('');
  const [rows, setRows] = useState<AdminAppointment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRows = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const query: { from: string; to: string; status?: string } = { from, to };
      if (status) query.status = status;
      const data = await adminApi.listAppointments(query);
      setRows(data ?? []);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        window.location.href = '/admin/login';
        return;
      }
      setError('No pudimos cargar las citas. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }, [from, status, to]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  const pdfUrl = useMemo(() => adminApi.exportPdfUrl({ from, to }), [from, to]);

  return (
    <div className="flex flex-col gap-6">
      <form
        className="grid grid-cols-1 gap-4 rounded-md border border-neutral-200 bg-paper-warm p-4 sm:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          void fetchRows();
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-ink-700">Desde</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.currentTarget.value)}
            className="min-h-touch rounded-md border border-neutral-300 bg-paper p-2 text-base text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-ink-700">Hasta</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.currentTarget.value)}
            className="min-h-touch rounded-md border border-neutral-300 bg-paper p-2 text-base text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-ink-700">Estado</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.currentTarget.value)}
            className="min-h-touch rounded-md border border-neutral-300 bg-paper p-2 text-base text-ink"
          >
            <option value="">Todas</option>
            <option value="active">Activa</option>
            <option value="cancelled_by_donor">Cancelada (donante)</option>
            <option value="cancelled_by_bank">Cancelada (banco)</option>
            <option value="attended">Asistida</option>
            <option value="no_show">No asistida</option>
          </select>
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <Button type="submit" isLoading={loading}>
            Actualizar
          </Button>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-touch items-center justify-center rounded-md border border-primary px-6 py-2 text-base font-medium text-primary transition-colors duration-[220ms] hover:bg-primary-50"
          >
            Descargar PDF
          </a>
        </div>
      </form>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-primary bg-primary-50 p-3 text-sm text-primary-900"
        >
          {error}
        </p>
      )}

      {loading ? (
        <p role="status" aria-live="polite" className="text-sm text-ink-700">
          Cargando citas…
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-md border border-neutral-200 bg-paper-warm p-3 text-sm text-ink-700">
          No hay citas en este rango.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-neutral-200">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <caption className="sr-only">Citas en el rango seleccionado</caption>
            <thead className="bg-paper-warm text-left">
              <tr>
                <th scope="col" className="border-b p-3">Fecha</th>
                <th scope="col" className="border-b p-3">Hora</th>
                <th scope="col" className="border-b p-3">Nombre</th>
                <th scope="col" className="border-b p-3">Apellido</th>
                <th scope="col" className="border-b p-3">Cédula</th>
                <th scope="col" className="border-b p-3">Código</th>
                <th scope="col" className="border-b p-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const fecha = new Date(`${row.slot.date}T${row.slot.startTime}:00`);
                return (
                  <tr key={row.id}>
                    <td className="border-b p-3 capitalize">{formatterFecha.format(fecha)}</td>
                    <td className="border-b p-3">
                      {row.slot.startTime} – {row.slot.endTime}
                    </td>
                    <td className="border-b p-3">{row.firstName}</td>
                    <td className="border-b p-3">{row.lastName}</td>
                    <td className="border-b p-3 font-mono">{row.idNumber}</td>
                    <td className="border-b p-3 font-mono">{row.code}</td>
                    <td className="border-b p-3">{labelEstado(row.status)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
