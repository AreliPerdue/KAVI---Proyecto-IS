/**
 * Aviso de privacidad (T260). El texto en español vive en `constants/privacy`, que es el que se
 * acepta y el que vale legalmente; el inglés es una traducción de referencia (spec 12).
 */
import { PRIVACY_INTRO, PRIVACY_SECTIONS, PRIVACY_UPDATED, type PrivacySection } from '@/constants/privacy';

export const privacy = {
  title: 'Aviso de privacidad',
  updated: (fecha: string) => `Última actualización: ${fecha}`,
  updatedOn: PRIVACY_UPDATED,
  /** Aviso de que la traducción es de referencia; en español no hace falta. */
  referenceNote: null as string | null,
  otherLanguage: 'Read it in English (reference translation)',
  intro: PRIVACY_INTRO,
  sections: PRIVACY_SECTIONS as readonly PrivacySection[],
  back: 'Volver',
};
