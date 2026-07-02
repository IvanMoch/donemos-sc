/**
 * ContentService (T059) — sirve el contenido informativo de la landing
 * (FR-001, FR-002). Los textos autoritativos viven en JSON versionado
 * (data-model.md §6); aquí se leen y se complementan con los datos fijos del
 * hospital. El panel admin NO los edita en el MVP.
 */
import { Injectable } from '@nestjs/common';
import exclusions from './data/exclusions.es.json';
import requirements from './data/requirements.es.json';

export interface DonationRequirement {
  title: string;
  description: string;
}

export interface DonationExclusion {
  title: string;
  description: string;
  kind: 'conditional' | 'excluding' | 'special_section';
}

export interface DonationInfo {
  requirements: DonationRequirement[];
  exclusions: DonationExclusion[];
  hospital: { name: string; mapUrl: string; schedule: string };
}

const HOSPITAL = {
  name: 'Hospital Central de San Cristóbal',
  mapUrl: 'https://maps.app.goo.gl/Qu1wBKkyzh4RThGi6',
  schedule: 'Lunes a viernes, de 7:00 a 12:00',
} as const;

@Injectable()
export class ContentService {
  getDonationInfo(): DonationInfo {
    return {
      requirements: requirements as DonationRequirement[],
      exclusions: exclusions as DonationExclusion[],
      hospital: { ...HOSPITAL },
    };
  }
}
