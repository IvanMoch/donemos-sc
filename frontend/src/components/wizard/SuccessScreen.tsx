/**
 * SuccessScreen — pantalla final del wizard tras confirmar la cita (T081).
 *
 * Muestra el código de cita (10 chars, Nano ID alfabeto sin ambigüedades)
 * en fuente monospace GRANDE para que se pueda leer/dictar por teléfono
 * si hiciera falta (research §14). Incluye botón "Descargar comprobante"
 * que dispara window.print() — la hoja @media print (T082) oculta la
 * navegación y deja solo el bloque del comprobante.
 *
 * Muestra los datos del hospital y el link al mapa (Google Maps, href
 * estático — no integración SDK; respeta Principio I "solo API propia").
 */
import { Button } from '../ui/Button';
import type { WizardAppointment } from './wizard-state';

interface SuccessScreenProps {
  appointment: WizardAppointment;
  donorName: string;
}

const HOSPITAL = {
  nombre: 'Hospital Central de San Cristóbal',
  direccion: 'Avenida Lucio Oquendo, San Cristóbal, Táchira',
  mapUrl: 'https://maps.google.com/?q=Hospital+Central+San+Crist%C3%B3bal+T%C3%A1chira',
};

const formatterFecha = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

export function SuccessScreen({ appointment, donorName }: SuccessScreenProps): JSX.Element {
  const handlePrint = () => {
    window.print();
  };
  const fecha = new Date(`${appointment.slotDate}T${appointment.slotStart}:00`);

  return (
    <article className="mx-auto flex max-w-xl flex-col gap-6 print:mx-0 print:max-w-none">
      <div className="print-block flex flex-col gap-6 rounded-md border border-success-700 bg-success-50 p-6 print:border-none print:bg-transparent print:p-0">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium uppercase tracking-wide text-success-700">
            Cita confirmada
          </p>
          <h1 className="text-2xl font-bold text-ink">
            {donorName ? `¡Gracias, ${donorName}!` : '¡Gracias por agendar!'}
          </h1>
          <p className="text-base text-ink">
            Presenta este código en el banco de sangre el día de tu cita.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-ink-700">Código de cita</p>
          <p className="font-mono text-4xl font-bold tracking-widest text-primary">
            {appointment.code}
          </p>
        </div>

        <dl className="flex flex-col gap-3 text-base text-ink">
          <div className="flex flex-col gap-0.5">
            <dt className="text-sm font-medium text-ink-700">Fecha</dt>
            <dd className="capitalize">{formatterFecha.format(fecha)}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-sm font-medium text-ink-700">Horario</dt>
            <dd>
              {appointment.slotStart} – {appointment.slotEnd}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-sm font-medium text-ink-700">Lugar</dt>
            <dd>
              {HOSPITAL.nombre}
              <br />
              <span className="text-ink-700">{HOSPITAL.direccion}</span>
            </dd>
          </div>
        </dl>

        <div className="flex flex-col gap-2 border-t border-success-700/40 pt-4 text-sm text-ink">
          <p className="font-medium">Antes de venir, recuerda:</p>
          <ul className="flex flex-col gap-1 pl-4">
            <li>Traer tu cédula de identidad vigente.</li>
            <li>Venir bien desayunado (no en ayunas).</li>
            <li>Haber dormido bien la noche anterior.</li>
          </ul>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row print:hidden">
        <Button type="button" onClick={handlePrint} className="sm:min-w-[12rem]">
          Descargar comprobante
        </Button>
        <a
          href={HOSPITAL.mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-touch items-center justify-center rounded-md border border-primary px-6 py-2 text-base font-medium text-primary transition-colors duration-[220ms] hover:bg-primary-50 sm:min-w-[12rem]"
        >
          Ver ubicación en el mapa
        </a>
      </div>
    </article>
  );
}
