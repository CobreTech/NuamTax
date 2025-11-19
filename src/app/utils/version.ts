/**
 * Versión del Sistema NUAM
 * 
 * Centraliza la versión del sistema para uso en toda la aplicación.
 * Actualizar este archivo cuando se haga un release.
 */

export const APP_VERSION = '0.8.5';
export const APP_VERSION_DISPLAY = 'v0.8.5';
export const APP_NAME = 'NUAM';

// Información adicional de versión
export const VERSION_INFO = {
  major: 0,
  minor: 8,
  patch: 5,
  full: APP_VERSION,
  display: APP_VERSION_DISPLAY,
  name: APP_NAME,
} as const;
