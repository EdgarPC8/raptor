/**
 * Assets de marca Raptor (archivos en /public/brand).
 * Usar cuando no hay logo del backend (shell offline / plantilla DEV).
 */
export const RAPTOR_LOGO_URL = `${import.meta.env.BASE_URL}brand/raptor-logo.svg`;
export const RAPTOR_LOGO_INK_URL = `${import.meta.env.BASE_URL}brand/raptor-logo-ink.svg`;

/** Logo para fondos oscuros o claros. */
export function raptorLogoUrl(onDark = true) {
  return onDark ? RAPTOR_LOGO_URL : RAPTOR_LOGO_INK_URL;
}
