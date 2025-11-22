import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        // 1. Verificar API Key
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: "Falta la API Key de Google en .env.local" },
                { status: 500 }
            );
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        // 2. Obtener mensaje y contexto desde el Frontend
        const { message, contextData } = await req.json();

        // 3. Configurar Modelo
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // 4. Crear el Prompt del Sistema según el tipo de contexto
        let systemPrompt: string;

        if (contextData?.type === 'table') {
            // Contexto detallado de tabla (módulo de calificaciones)
            systemPrompt = `
      Eres un experto analista tributario de NuamTax.
      El usuario está viendo el módulo: ${contextData.module}
      
      Tienes acceso a los siguientes datos de la tabla que está visualizando:
      ${JSON.stringify(contextData.data, null, 2)}
      
      Reglas:
      - Responde SOLO basándote en los datos de la tabla.
      - Si la respuesta no está en los datos, di "No tengo esa información en la tabla actual".
      - Sé breve, preciso y profesional.
      - Puedes hacer cálculos, buscar patrones y resumir información.
    `;
        } else {
            // Contexto general (otros módulos)
            const statsInfo = contextData?.stats
                ? `Estadísticas actuales:
- Total de Calificaciones: ${contextData.stats.totalCalificaciones}
- Factores Validados: ${contextData.stats.factoresValidados}
- Reportes Generados: ${contextData.stats.reportesGenerados}
- Tasa de Éxito: ${contextData.stats.tasaExito}`
                : 'No hay estadísticas disponibles en este momento.';

            systemPrompt = `
      Eres un experto asistente de NuamTax.
      El usuario está viendo el módulo: ${contextData?.module || 'Desconocido'}
      
      ${statsInfo}
      
      Reglas:
      - Proporciona información general sobre el módulo actual.
      - Ayuda al usuario a entender qué puede hacer en esta sección.
      - Usa las estadísticas disponibles para dar contexto si es relevante.
      - Si no tienes información específica, explica qué se puede hacer en este módulo.
      - Sé útil, breve y profesional.
    `;
        }

        // 5. Generar respuesta
        const result = await model.generateContent([systemPrompt, message]);
        const response = result.response.text();

        return NextResponse.json({ response });

    } catch (error) {
        console.error("Error en API Gemini:", error);
        return NextResponse.json(
            { error: "Error procesando la solicitud en el servidor." },
            { status: 500 }
        );
    }
}