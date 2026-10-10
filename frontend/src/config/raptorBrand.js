/**
 * Marca de la plataforma y assets (archivos en /public/brand).
 *
 * Cambiá BRAND_NAME acá y se actualiza en UI / fallbacks que importan esta constante.
 */
export const BRAND_NAME = "Raptor-Solutions";

export const RAPTOR_LOGO_URL = `${import.meta.env.BASE_URL}brand/raptor-logo.svg`;
export const RAPTOR_LOGO_INK_URL = `${import.meta.env.BASE_URL}brand/raptor-logo-ink.svg`;

/** Logo para fondos oscuros o claros. */
export function raptorLogoUrl(onDark = true) {
  return onDark ? RAPTOR_LOGO_URL : RAPTOR_LOGO_INK_URL;
}
