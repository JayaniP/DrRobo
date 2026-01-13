// src/utils/normalizeAgentToDiagnosis.ts

import type { AgentResult, DiagnosisResult } from "@/types";

/**
 * Converts RAW Bedrock Agent output
 * into STRICT, UI-safe DiagnosisResult
 */
export function normalizeAgentToDiagnosis(
  agent: AgentResult
): DiagnosisResult {
  return {
    diagnosis: {
      primary: agent.diagnosis?.primary
        ? {
            condition: agent.diagnosis.primary.condition,
            confidence: agent.diagnosis.primary.confidence,
            rationale: agent.diagnosis.primary.rationale,
          }
        : undefined,

      symptoms: {
        primary: agent.diagnosis?.symptoms?.primary ?? [],
        secondary: agent.diagnosis?.symptoms?.secondary ?? [],
      },
    },

    icd_codes: agent.icd_codes ?? [],

    treatment_plan: {
      immediate: agent.treatment_plan?.immediate ?? [],
      ongoing: agent.treatment_plan?.ongoing ?? [],
      lifestyle: agent.treatment_plan?.lifestyle ?? [],
    },

    follow_ups: agent.follow_ups ?? [],

    warnings: agent.safety?.red_flags ?? [],
  };
}
