import { z } from "zod";

/**
 * JSON schema enforced via the Gemini Interactions API's `response_format`,
 * constraining the model's output shape at generation time. (The older
 * generateContent `responseSchema`/`responseMimeType` config is deprecated
 * for new API keys as of the Interactions API migration.)
 */
export const qualitativeAnalysisJsonSchema = {
  type: "object",
  properties: {
    homeWinProbability: { type: "number" },
    drawProbability: { type: "number" },
    awayWinProbability: { type: "number" },
    reasoning: {
      type: "string",
      description: "In Spanish: specific explanation naming which concrete supplied facts drove this distribution, not generic phrasing.",
    },
  },
  required: ["homeWinProbability", "drawProbability", "awayWinProbability", "reasoning"],
};

/** Server-side re-validation of the parsed response: schema conformance is not enough on its own, since a schema-valid response can still be numerically invalid (e.g. probabilities not summing to 1). */
export const QualitativeAnalysisResultSchema = z
  .object({
    homeWinProbability: z.number().min(0).max(1),
    drawProbability: z.number().min(0).max(1),
    awayWinProbability: z.number().min(0).max(1),
    reasoning: z.string().min(1),
  })
  .refine(
    (value) => {
      const sum = value.homeWinProbability + value.drawProbability + value.awayWinProbability;
      return Math.abs(sum - 1) < 0.01;
    },
    { message: "Probabilities must sum to ~1" }
  );

export type QualitativeAnalysisResult = z.infer<typeof QualitativeAnalysisResultSchema>;
