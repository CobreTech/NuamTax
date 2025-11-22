/**
 * @file dj1948CreditCalculator.ts
 * @description Servicio para calcular créditos tributarios (C17-C32) según fórmulas oficiales del SII
 * para la Declaración Jurada 1948.
 * 
 * Referencias:
 * - Instrucciones de llenado DJ1948 (SII)
 * - Artículos 14A y 14D N°3 de la Ley sobre Impuesto a la Renta (LIR)
 * - Artículos 56 N°3 y 63 LIR (restitución de créditos)
 */

import { TaxCreditsConfig } from '../dashboard/components/types';

/**
 * Estructura de montos de rentas afectas (C5-C8)
 */
export interface RentasAfectas {
    c5: number;  // Con créditos IDPC desde 2017
    c6: number;  // Con créditos IDPC hasta 2016
    c7: number;  // Con crédito IDPC voluntario
    c8: number;  // Sin derecho a crédito
}

/**
 * Estructura de montos de rentas con tributación cumplida y exentas (C9-C16)
 */
export interface RentasExentasYNC {
    c9: number;   // RAP y diferencia inicial
    c10: number;  // Otras rentas sin prioridad
    c11: number;  // Exceso distribuciones desproporcionadas
    c12: number;  // ISFUT Ley 20.780
    c13: number;  // Rentas hasta 1983 / ISFUT/ISIF
    c14: number;  // Exentas IGC Art. 11 Ley 18.401
    c15: number;  // Exentos IGC y/o IA
    c16: number;  // Ingresos no constitutivos de renta
}

/**
 * Estructura de créditos tributarios calculados (C17-C32)
 */
export interface CreditosTributarios {
    // Acumulados desde 01.01.2017 - No sujetos a restitución hasta 31.12.2019
    c17: number;  // Sin derecho a devolución (2017-2019)
    c18: number;  // Con derecho a devolución (2017-2019)

    // No sujetos a restitución desde 01.01.2020
    c19: number;  // Sin derecho a devolución (2020+)
    c20: number;  // Con derecho a devolución (2020+)

    // Sujetos a restitución
    c21: number;  // Sin derecho a devolución
    c22: number;  // Con derecho a devolución

    // Asociados a rentas exentas (Art. 11, Ley 18.401)
    c23: number;  // Sin derecho a devolución
    c24: number;  // Con derecho a devolución
    c25: number;  // Crédito por IPE

    // Acumulados hasta 31.12.2016
    c26: number;  // Sin derecho a devolución (rentas afectas)
    c27: number;  // Con derecho a devolución (rentas afectas)
    c28: number;  // Sin derecho a devolución (rentas exentas Art. 11)
    c29: number;  // Con derecho a devolución (rentas exentas Art. 11)
    c30: number;  // Crédito por IPE
    c31: number;  // Crédito por impuesto tasa adicional ex Art. 21
    c32: number;  // Devolución de capital Art. 17 N°7
}

/**
 * Calcula la tasa de crédito según el régimen tributario
 * Fórmula: tasaIDPC / (1 - tasaIDPC)
 * 
 * @param config - Configuración de créditos tributarios
 * @returns Tasa de crédito (factor multiplicador)
 * 
 * @example
 * // Para régimen 14A con tasa IDPC 27%:
 * calculateTasaCredito({ tasaIDPC: 0.27, ... }) // => 0.369863 (36.9863%)
 */
export function calculateTasaCredito(config: TaxCreditsConfig): number {
    if (config.tasaIDPC <= 0 || config.tasaIDPC >= 1) {
        throw new Error(`Tasa IDPC inválida: ${config.tasaIDPC}. Debe estar entre 0 y 1.`);
    }

    return config.tasaIDPC / (1 - config.tasaIDPC);
}

/**
 * Calcula los créditos tributarios sobre rentas afectas (C17-C22)
 * 
 * Los créditos se distribuyen según:
 * - Año de generación (2017-2019 vs 2020+)
 * - Derecho a devolución
 * - Obligación de restitución
 * 
 * @param rentasAfectas - Montos de rentas afectas (C5-C8)
 * @param config - Configuración de créditos tributarios
 * @returns Créditos C17-C22
 */
export function calculateCreditosRentasAfectas(
    rentasAfectas: RentasAfectas,
    config: TaxCreditsConfig
): Partial<CreditosTributarios> {
    const tasaCredito = calculateTasaCredito(config);

    // Solo se calculan créditos sobre rentas que DAN derecho a crédito (C5, C6, C7)
    // C8 (Sin derecho a crédito) NO genera créditos
    const baseCredito = rentasAfectas.c5 + rentasAfectas.c6 + rentasAfectas.c7;

    if (baseCredito === 0) {
        return { c17: 0, c18: 0, c19: 0, c20: 0, c21: 0, c22: 0 };
    }

    const creditoTotal = Math.round(baseCredito * tasaCredito);

    // Distribuir según configuración
    const creditos: Partial<CreditosTributarios> = {
        c17: 0, c18: 0, c19: 0, c20: 0, c21: 0, c22: 0
    };

    // Determinar en qué columna va el crédito
    if (config.creditoSujetoRestitucion) {
        // Sujeto a restitución (Art. 56 N°3 y 63 LIR)
        if (config.creditoConDevolucion) {
            creditos.c22 = creditoTotal;  // Con derecho a devolución
        } else {
            creditos.c21 = creditoTotal;  // Sin derecho a devolución
        }
    } else {
        // No sujeto a restitución
        // Determinar si es generado 2017-2019 o 2020+
        const esPost2020 = config.anioTributario >= 2020;

        if (esPost2020) {
            // Régimen Pro Pyme General (14D3) o post-2020
            if (config.creditoConDevolucion) {
                creditos.c20 = creditoTotal;  // Con derecho a devolución (2020+)
            } else {
                creditos.c19 = creditoTotal;  // Sin derecho a devolución (2020+)
            }
        } else {
            // Generados 2017-2019
            if (config.creditoConDevolucion) {
                creditos.c18 = creditoTotal;  // Con derecho a devolución (2017-2019)
            } else {
                creditos.c17 = creditoTotal;  // Sin derecho a devolución (2017-2019)
            }
        }
    }

    return creditos;
}

/**
 * Calcula los créditos sobre rentas exentas del Art. 11, Ley 18.401 (C23-C24)
 * (Capitalismo popular - acciones de bancos e instituciones financieras)
 * 
 * @param c14 - Monto de rentas exentas Art. 11
 * @param config - Configuración de créditos tributarios
 * @returns Créditos C23-C24
 */
export function calculateCreditosRentasExentas(
    c14: number,
    config: TaxCreditsConfig
): Partial<CreditosTributarios> {
    if (c14 === 0) {
        return { c23: 0, c24: 0 };
    }

    // Para rentas exentas sujetas a restitución, se calcula con tasa efectiva del crédito
    // Simplificación: asumimos misma tasa que rentas afectas
    const tasaCredito = calculateTasaCredito(config);
    const creditoTotal = Math.round(c14 * tasaCredito);

    // Distribuir según derecho a devolución
    if (config.creditoConDevolucion) {
        return { c23: 0, c24: creditoTotal };
    } else {
        return { c23: creditoTotal, c24: 0 };
    }
}

/**
 * Calcula todos los créditos tributarios (C17-C32) según la configuración
 * 
 * @param montos - Montos de dividendos (C5-C16)
 * @param config - Configuración de créditos tributarios
 * @returns Objeto completo de créditos C17-C32
 */
export function calculateAllCredits(
    montos: RentasAfectas & RentasExentasYNC,
    config: TaxCreditsConfig
): CreditosTributarios {
    // Validar configuración
    if (!config.regimenTributario) {
        throw new Error('Debe especificar régimen tributario (14A o 14D3)');
    }

    if (config.anioTributario < 2017) {
        throw new Error('Año tributario debe ser 2017 o posterior');
    }

    // Calcular créditos sobre rentas afectas (C5-C8)
    const creditosAfectas = calculateCreditosRentasAfectas(
        { c5: montos.c5, c6: montos.c6, c7: montos.c7, c8: montos.c8 },
        config
    );

    // Calcular créditos sobre rentas exentas Art. 11 (C14)
    const creditosExentas = calculateCreditosRentasExentas(montos.c14, config);

    // Combinar todos los créditos
    return {
        c17: creditosAfectas.c17 || 0,
        c18: creditosAfectas.c18 || 0,
        c19: creditosAfectas.c19 || 0,
        c20: creditosAfectas.c20 || 0,
        c21: creditosAfectas.c21 || 0,
        c22: creditosAfectas.c22 || 0,
        c23: creditosExentas.c23 || 0,
        c24: creditosExentas.c24 || 0,
        c25: 0,  // Crédito por IPE (no implementado - requiere datos adicionales)
        c26: 0,  // Créditos pre-2017 (no implementado en esta versión)
        c27: 0,
        c28: 0,
        c29: 0,
        c30: 0,
        c31: 0,  // Crédito ex Art. 21 (histórico, muy raro)
        c32: 0,  // Devolución de capital (no es crédito tributario)
    };
}

/**
 * Valida la configuración de créditos tributarios
 * @param config - Configuración a validar
 * @throws Error si la configuración es inválida
 */
export function validateCreditosConfig(config?: TaxCreditsConfig): void {
    if (!config) {
        // Config es opcional, si no existe no hay problema
        return;
    }

    if (!config.regimenTributario) {
        throw new Error('Debe especificar régimen tributario (14A o 14D3)');
    }

    if (config.tasaIDPC <= 0 || config.tasaIDPC >= 1) {
        throw new Error(`Tasa IDPC debe estar entre 0% y 100%. Recibido: ${config.tasaIDPC * 100}%`);
    }

    if (config.anioTributario < 2017) {
        throw new Error('Año tributario debe ser 2017 o posterior para cálculo de créditos');
    }
}
