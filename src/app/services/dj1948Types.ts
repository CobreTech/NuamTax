/**
 * @file dj1948Types.ts
 * @description Interfaces TypeScript para el formulario DJ1948
 * Declaración Jurada 1948 del SII de Chile
 */

/**
 * Sección A: Identificación del Declarante
 */
export interface DJ1948Declarante {
  rut: string;                    // RUT del contribuyente que declara
  nombreRazonSocial: string;      // Nombre o razón social
  domicilioPostal: string;        // Domicilio postal
  comuna: string;                 // Comuna
  correoElectronico: string;       // Correo electrónico
  telefono: string;                // Número de teléfono (con código de ciudad)
}

/**
 * Sección B: Fila de datos de los informados (receptores)
 * 35 columnas según instructivo
 */
export interface DJ1948Row {
  // Identificación básica
  c1: string;  // Fecha del retiro, remesa y/o dividendo distribuido (DD.MM.AAAA)
  c2: string;  // RUT del pleno propietario o usufructuario receptor
  c3: 1 | 2 | '';  // Usufructuario (1) o Nudo Propietario (2)
  c4: number;  // Cantidad de acciones al 31/12
  
  // Montos de retiros, remesas y/o dividendos reajustados ($)
  // Afectos a impuestos
  c5: number;  // Con créditos por IDPC generados a contar del 01.01.2017
  c6: number;  // Con créditos por IDPC acumulados hasta el 31.12.2016
  c7: number;  // Con derecho a crédito por pago de IDPC voluntario
  c8: number;  // Sin derecho a crédito
  
  // Rentas con tributación cumplida
  c9: number;  // Rentas provenientes del registro RAP y diferencia inicial
  c10: number; // Otras rentas percibidas sin prioridad en su orden de imputación
  c11: number; // Exceso distribuciones desproporcionadas
  c12: number; // Utilidades afectadas con impuesto sustitutivo al FUT (ISFUT) Ley N°20.780
  c13: number; // Rentas generadas hasta el 31.12.1983 y/o utilidades afectadas con ISFUT/ISIF
  
  // Rentas exentas
  c14: number; // Rentas exentas de IGC (artículo 11, Ley 18.401), afectas a impuesto adicional
  c15: number; // Exentos de IGC y/o IA
  
  // Ingresos no constitutivos de renta
  c16: number; // Ingresos No constitutivos de renta
  
  // Créditos para IGC o IA - Acumulados a contar del 01.01.2017
  // Asociados a Rentas Afectas - No sujetos a restitución generados Hasta el 31.12.2019
  c17: number; // Sin derecho a devolución
  c18: number; // Con derecho a devolución
  
  // No sujetos a restitución generados a contar del 01.01.2020
  c19: number; // Sin derecho a devolución
  c20: number; // Con derecho a devolución
  
  // Sujetos a restitución
  c21: number; // Sin derecho a devolución
  c22: number; // Con derecho a devolución
  
  // Asociados a Rentas Exentas (artículo 11, Ley 18.401) - Sujetos a restitución
  c23: number; // Sin derecho a devolución
  c24: number; // Con derecho a devolución
  c25: number; // Crédito por IPE
  
  // Acumulados hasta el 31.12.2016
  // Asociados a Rentas Afectas
  c26: number; // Sin derecho a devolución
  c27: number; // Con derecho a devolución
  
  // Asociados a Rentas Exentas (artículo 11, Ley 18.401)
  c28: number; // Sin derecho a devolución
  c29: number; // Con derecho a devolución
  c30: number; // Crédito por IPE
  
  // Otros créditos
  c31: number; // Crédito por impuesto tasa adicional, ex. Art. 21 de la LIR
  c32: number; // Devolución de capital Art.17 N° 7 LIR
  c33: string; // Número de certificado
}

/**
 * Sección C: Retiros en exceso
 */
export interface DJ1948RetiroExceso {
  c34: string;  // RUT del beneficiario del retiro (titular, cesionario o usufructuario)
  c35: number;  // Montos de retiros en exceso reajustados ($)
}

/**
 * Estructura completa del DJ1948
 */
export interface DJ1948Data {
  declarante: DJ1948Declarante;
  informados: DJ1948Row[];
  retirosExceso: DJ1948RetiroExceso[];
  anioTributario: string;  // Año comercial que se informa (ej: "2024")
  fechaGeneracion: Date;
}

/**
 * Totales del cuadro resumen final
 */
export interface DJ1948Totales {
  [key: string]: number;  // Totales por columna (c1-c35)
}

