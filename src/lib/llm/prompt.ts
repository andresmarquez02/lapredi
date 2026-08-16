import type { QualitativeMatchContext } from "./context";

function formatAbsences(absences: QualitativeMatchContext["homeKeyAbsences"]): string {
  if (absences.length === 0) return "Ninguna reportada.";
  return absences.map((a) => `- ${a.playerName}${a.role ? ` (${a.role})` : ""}: ${a.reason}`).join("\n");
}

function formatRecentResults(results: QualitativeMatchContext["homeRecentResults"]): string {
  if (results.length === 0) return "Sin resultados recientes registrados.";
  return results
    .map((r) => `- vs ${r.opponent}: ${r.result === "win" ? "GANÓ" : r.result === "loss" ? "PERDIÓ" : "EMPATÓ"} ${r.goalsFor}-${r.goalsAgainst} (${r.date})`)
    .join("\n");
}

function formatNews(headlines: QualitativeMatchContext["homeRecentNews"]): string {
  if (!headlines || headlines.length === 0) return "Sin titulares recientes registrados.";
  return headlines.map((h) => `- "${h.title}" (${h.publishedAt.slice(0, 10)})`).join("\n");
}

/**
 * Builds the LLM prompt from verified stored facts only. Explicitly instructs
 * the model to reason solely from the supplied facts, per the
 * llm-qualitative-analysis spec's "no free-form model knowledge" requirement.
 * The prompt and requested output are in Spanish (the app's default/primary
 * audience language) so the reasoning shown in the dashboard is directly
 * readable without a translation step.
 */
export function buildQualitativeAnalysisPrompt(context: QualitativeMatchContext): string {
  return `Estás ayudando a analizar el resultado de un partido de fútbol. Basá tu análisis ÚNICAMENTE en los datos listados abajo. No uses ningún otro conocimiento que puedas tener sobre estos equipos, jugadores o su historia — si un dato no está listado acá, tratalo como desconocido.

Partido: ${context.homeTeamName} (local) vs ${context.awayTeamName} (visitante)
${context.venue ? `Estadio: ${context.venue}` : ""}
${context.referee ? `Árbitro: ${context.referee}` : ""}
${context.weatherCondition || context.temperatureCelsius !== undefined ? `Clima: ${context.weatherCondition ?? "no reportado"}${context.temperatureCelsius !== undefined ? `, ${context.temperatureCelsius}°C` : ""}` : ""}

## ${context.homeTeamName} - bajas / lesionados
${formatAbsences(context.homeKeyAbsences)}

## ${context.awayTeamName} - bajas / lesionados
${formatAbsences(context.awayKeyAbsences)}

## ${context.homeTeamName} - últimos 5 resultados
${formatRecentResults(context.homeRecentResults)}

## ${context.awayTeamName} - últimos 5 resultados
${formatRecentResults(context.awayRecentResults)}

## Rotación de alineación
- ${context.homeTeamName}: ${context.homeLineupRotationNote ?? "Sin señal de rotación reportada."}
- ${context.awayTeamName}: ${context.awayLineupRotationNote ?? "Sin señal de rotación reportada."}

## ${context.homeTeamName} - titulares recientes
${formatNews(context.homeRecentNews)}

## ${context.awayTeamName} - titulares recientes
${formatNews(context.awayRecentNews)}

Los titulares son resultados crudos de búsqueda de noticias y pueden incluir rumores de pases, opiniones o contenido no relacionado con este partido específico — tratalos como señal de baja confianza, y solo considerá un titular si afecta plausiblemente a este partido (ej: lesión, sanción, conflicto interno, estado anímico), nunca especulación de pases por sí sola.
${
  context.externalModelEstimate
    ? `\n## Referencia externa (solo para contraste, no la copies)\nUn modelo externo (${context.externalModelEstimate.source}) estima: local ${(context.externalModelEstimate.home * 100).toFixed(0)}% / empate ${(context.externalModelEstimate.draw * 100).toFixed(0)}% / visitante ${(context.externalModelEstimate.away * 100).toFixed(0)}%. Usalo solo como punto de referencia para calibrar si tu propia estimación es razonable, no lo copies ni lo trates como un dato verificado.`
    : ""
}

Basándote ÚNICAMENTE en los datos de arriba, devolvé tu propia distribución de probabilidad para el resultado (victoria local / empate / victoria visitante), y un resumen de razonamiento en ESPAÑOL, breve pero específico, que mencione explícitamente qué datos concretos de los listados arriba influyeron en tu estimación (por ejemplo: "la ausencia de X debilita el ataque local" o "Y viene de 3 victorias seguidas por margen mínimo, lo que sugiere fragilidad pese a ganar"). No uses frases genéricas sin referencia a un dato concreto.`;
}
