export const STAT_FACTOR_LABELS: Record<string, { es: string; en: string }> = {
  homeExpectedGoals: { es: "Goles esperados (local)", en: "Expected goals (home)" },
  awayExpectedGoals: { es: "Goles esperados (visitante)", en: "Expected goals (away)" },
  homeAttackStrength: { es: "Fuerza de ataque (local)", en: "Attack strength (home)" },
  awayAttackStrength: { es: "Fuerza de ataque (visitante)", en: "Attack strength (away)" },
  homeDefenseStrength: { es: "Fuerza de defensa (local)", en: "Defense strength (home)" },
  awayDefenseStrength: { es: "Fuerza de defensa (visitante)", en: "Defense strength (away)" },
  homeFormMultiplier: { es: "Multiplicador de forma (local)", en: "Form multiplier (home)" },
  awayFormMultiplier: { es: "Multiplicador de forma (visitante)", en: "Form multiplier (away)" },
  homeAbsenceImpact: { es: "Impacto de bajas (local)", en: "Absence impact (home)" },
  awayAbsenceImpact: { es: "Impacto de bajas (visitante)", en: "Absence impact (away)" },
  homeDataQuality: { es: "Calidad de datos (local)", en: "Data quality (home)" },
  awayDataQuality: { es: "Calidad de datos (visitante)", en: "Data quality (away)" },
};

export function translateFactorKey(key: string, lang: "es" | "en"): string {
  return STAT_FACTOR_LABELS[key]?.[lang] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}
