/**
 * @file rutUtils.ts
 * @description Utilidades para validar y formatear RUTs chilenos
 * Soporta formatos: 11.111.111-1 o 11111111-1
 */

/**
 * Valida un RUT chileno
 * @param rut - RUT en cualquier formato (con o sin puntos y guión)
 * @returns true si el RUT es válido, false en caso contrario
 */
export function validateRUT(rut: string): boolean {
  if (!rut || typeof rut !== 'string') {
    return false;
  }

  // Limpiar el RUT: remover puntos, espacios y convertir a mayúsculas
  const cleanRUT = rut.replace(/\./g, '').replace(/\s/g, '').replace(/-/g, '').toUpperCase();

  // Verificar formato básico (debe tener al menos 7 dígitos + 1 dígito verificador)
  if (cleanRUT.length < 8 || cleanRUT.length > 9) {
    return false;
  }

  // Separar número y dígito verificador
  const rutNumber = cleanRUT.slice(0, -1);
  const dv = cleanRUT.slice(-1);

  // Verificar que el número sea solo dígitos
  if (!/^\d+$/.test(rutNumber)) {
    return false;
  }

  // Verificar que el dígito verificador sea un dígito o 'K'
  if (!/^[\dK]$/.test(dv)) {
    return false;
  }

  // Calcular dígito verificador
  const calculatedDV = calculateDV(rutNumber);

  // Comparar dígito verificador
  return calculatedDV === dv;
}

/**
 * Calcula el dígito verificador de un RUT chileno
 * @param rutNumber - Número del RUT sin dígito verificador
 * @returns Dígito verificador calculado ('0'-'9' o 'K')
 */
export function calculateDV(rutNumber: string): string {
  let sum = 0;
  let multiplier = 2;

  // Recorrer el RUT de derecha a izquierda
  for (let i = rutNumber.length - 1; i >= 0; i--) {
    sum += parseInt(rutNumber[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = sum % 11;
  const dv = 11 - remainder;

  if (dv === 11) return '0';
  if (dv === 10) return 'K';
  return dv.toString();
}

/**
 * Formatea un RUT al formato estándar chileno: 11.111.111-1
 * @param rut - RUT en cualquier formato
 * @returns RUT formateado o string vacío si no es válido
 */
export function formatRUT(rut: string): string {
  if (!rut || typeof rut !== 'string') {
    return '';
  }

  // Limpiar el RUT
  const cleanRUT = rut.replace(/\./g, '').replace(/\s/g, '').replace(/-/g, '').toUpperCase();

  // Verificar longitud mínima
  if (cleanRUT.length < 8) {
    return cleanRUT; // Retornar sin formatear si es muy corto
  }

  // Separar número y dígito verificador
  const rutNumber = cleanRUT.slice(0, -1);
  const dv = cleanRUT.slice(-1);

  // Formatear número con puntos cada 3 dígitos desde la derecha
  let formattedNumber = '';
  let count = 0;
  for (let i = rutNumber.length - 1; i >= 0; i--) {
    if (count > 0 && count % 3 === 0) {
      formattedNumber = '.' + formattedNumber;
    }
    formattedNumber = rutNumber[i] + formattedNumber;
    count++;
  }

  // Retornar formato: 11.111.111-1
  return `${formattedNumber}-${dv}`;
}

/**
 * Limpia un RUT removiendo puntos y guiones
 * @param rut - RUT en cualquier formato
 * @returns RUT limpio (solo números y dígito verificador)
 */
export function cleanRUT(rut: string): string {
  if (!rut || typeof rut !== 'string') {
    return '';
  }
  return rut.replace(/\./g, '').replace(/\s/g, '').replace(/-/g, '').toUpperCase();
}

/**
 * Valida y formatea un RUT
 * @param rut - RUT en cualquier formato
 * @returns Objeto con el RUT formateado y si es válido
 */
export function validateAndFormatRUT(rut: string): {
  isValid: boolean;
  formatted: string;
  clean: string;
} {
  const clean = cleanRUT(rut);
  const isValid = validateRUT(clean);
  const formatted = isValid ? formatRUT(clean) : rut;

  return {
    isValid,
    formatted,
    clean,
  };
}

