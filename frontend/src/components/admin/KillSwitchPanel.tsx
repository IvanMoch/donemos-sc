/**
 * KillSwitchPanel (T137) — tarjeta grande con toggle del kill switch.
 *
 * Muestra el estado actual (`appointmentsDisabled`), quién lo cambió por última
 * vez y cuándo, con la razón opcional. Un modal de confirmación evita clicks
 * accidentales. Al alternar, hace POST /admin/system-state/kill-switch y
 * actualiza el estado local con la respuesta.
 */
import { useCallback, useEffect, useState } from 'react';
import { adminApi, type SystemStateFull } from '../../lib/api';
import { ApiError } from '../../lib/api-client';
import { Button } from '../ui/Button';

const formatterFechaHora = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function KillSwitchPanel(): JSX.Element {
  const [state, setState] = useState<SystemStateFull | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState<string>('');
  const [confirming, setConfirming] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    adminApi
      .getSystemState()
      .then((s) => {
        if (cancelled) return;
        setState(s);
        setReason(s?.reason ?? '');
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          window.location.href = '/admin/login';
          return;
        }
        setError('No pudimos cargar el estado actual. Recarga la página.');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onToggle = useCallback(async () => {
    if (!state) return;
    setError(null);
    setSaving(true);
    try {
      const actualizado = await adminApi.toggleKillSwitch({
        enabled: !state.appointmentsDisabled,
        reason: reason.trim() || null,
      });
      setState(actualizado);
      setReason(actualizado.reason ?? '');
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        window.location.href = '/admin/login';
        return;
      }
      setError('No pudimos actualizar el estado. Intenta de nuevo.');
    } finally {
      setSaving(false);
      setConfirming(false);
    }
  }, [reason, state]);

  if (loading) {
    return (
      <p role="status" aria-live="polite" className="text-sm text-ink-700">
        Cargando estado del sistema…
      </p>
    );
  }

  if (!state) {
    return (
      <p role="alert" className="rounded-md border border-primary bg-primary-50 p-3 text-sm text-primary-900">
        {error ?? 'No pudimos cargar el estado.'}
      </p>
    );
  }

  const activo = state.appointmentsDisabled;

  return (
    <article
      aria-labelledby="killswitch-heading"
      className={[
        'flex flex-col gap-4 rounded-lg border-2 p-6',
        activo ? 'border-primary bg-primary-50' : 'border-success-700 bg-success-50',
      ].join(' ')}
    >
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-700">
          Kill switch de agendamiento
        </p>
        <h2 id="killswitch-heading" className="text-2xl font-bold text-ink">
          {activo ? 'Agendamiento CERRADO' : 'Agendamiento ABIERTO'}
        </h2>
        <p className="text-base text-ink">
          {activo
            ? 'Los donantes no pueden crear ni reagendar citas. La cancelación sigue habilitada.'
            : 'Los donantes pueden agendar, cancelar y reagendar normalmente.'}
        </p>
      </header>

      <dl className="grid grid-cols-1 gap-2 text-sm text-ink sm:grid-cols-3">
        <div>
          <dt className="font-medium text-ink-700">Última modificación</dt>
          <dd>{state.updatedAt ? formatterFechaHora.format(new Date(state.updatedAt)) : '—'}</dd>
        </div>
        <div>
          <dt className="font-medium text-ink-700">Modificado por</dt>
          <dd>{state.updatedBy ?? '—'}</dd>
        </div>
        <div>
          <dt className="font-medium text-ink-700">Motivo actual</dt>
          <dd>{state.reason ?? '—'}</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-2">
        <label htmlFor="ks-reason" className="text-sm font-medium text-ink-700">
          Motivo del cambio (opcional, máximo 500 caracteres)
        </label>
        <textarea
          id="ks-reason"
          value={reason}
          onChange={(e) => setReason(e.currentTarget.value.slice(0, 500))}
          rows={2}
          className="rounded-md border border-neutral-300 bg-paper p-2 text-base text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-primary bg-primary-50 p-3 text-sm text-primary-900"
        >
          {error}
        </p>
      )}

      {!confirming ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            onClick={() => setConfirming(true)}
            className={activo ? '' : 'bg-primary text-paper hover:bg-primary-800'}
          >
            {activo ? 'Reabrir agendamiento' : 'Cerrar agendamiento'}
          </Button>
        </div>
      ) : (
        <div
          role="alertdialog"
          aria-labelledby="ks-confirm-heading"
          className="flex flex-col gap-3 rounded-md border border-neutral-300 bg-paper p-4"
        >
          <p id="ks-confirm-heading" className="text-base font-semibold text-ink">
            ¿Confirmas {activo ? 'reabrir' : 'cerrar'} el agendamiento?
          </p>
          <p className="text-sm text-ink-700">
            {activo
              ? 'Los donantes podrán crear y reagendar citas nuevamente.'
              : 'Los donantes no podrán crear ni reagendar citas mientras esté cerrado. La cancelación seguirá disponible.'}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              onClick={() => setConfirming(false)}
              className="bg-paper-warm text-ink hover:bg-neutral-200"
            >
              Cancelar
            </Button>
            <Button type="button" isLoading={saving} onClick={onToggle}>
              Sí, {activo ? 'reabrir' : 'cerrar'}
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}
