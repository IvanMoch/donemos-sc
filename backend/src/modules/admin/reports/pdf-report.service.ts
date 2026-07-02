/**
 * PdfReportService (T127) — genera el PDF de citas por rango (FR-022) con pdfkit
 * (research §3). Cabecera con el nombre del hospital y el rango; tabla ordenada
 * por fecha/hora con columnas hora / nombre / apellido / cédula / código / estado.
 *
 * Se genera SIN compresión para que el contenido sea inspeccionable en tests, y
 * el nombre del hospital se fija también en el título (Info dict) del documento.
 */
import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import type { AdminAppointment } from '../../appointments/appointments.repository';

const HOSPITAL = 'Hospital Central de San Cristóbal';
// ASCII para el Info dict (buscable en los bytes del PDF sin depender del kerning).
const HOSPITAL_ASCII = 'Hospital Central de San Cristobal';

const ESTADOS: Record<string, string> = {
  active: 'Activa',
  attended: 'Asistió',
  no_show: 'No asistió',
  cancelled_by_donor: 'Cancelada (donante)',
  cancelled_by_bank: 'Cancelada (banco)',
};

@Injectable()
export class PdfReportService {
  async generateAppointmentsPdf(
    citas: AdminAppointment[],
    range: { from: string; to: string },
  ): Promise<Buffer> {
    const doc = new PDFDocument({
      margin: 40,
      compress: false,
      info: { Title: `${HOSPITAL_ASCII} - Reporte de Citas`, Author: 'DonemosSC' },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    doc.fontSize(16).text(HOSPITAL, { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(11).text(`Reporte de citas — del ${range.from} al ${range.to}`, { align: 'center' });
    doc.moveDown(1);

    doc.fontSize(10).text('Hora | Nombre | Apellido | Cedula | Codigo | Estado');
    doc.moveDown(0.5);

    if (citas.length === 0) {
      doc.text('Sin citas en el rango seleccionado.');
    } else {
      for (const c of citas) {
        const linea = [
          `${c.slot.date} ${c.slot.startTime}`,
          c.firstName,
          c.lastName,
          c.idNumber,
          c.code,
          ESTADOS[c.status] ?? c.status,
        ].join(' | ');
        doc.text(linea);
      }
    }

    doc.end();
    return done;
  }
}
