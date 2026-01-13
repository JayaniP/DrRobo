import type { AgentResult, FollowUp } from "@/types";
import type { Suggestion } from "@/context/ClinicalContext";

/**
 * 1. Define the helper ABOVE the main function.
 * This satisfies ts(2304) and removes the need for 'any'.
 */
function ensureArray(val: string | string[] | undefined | null): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return [val];
}

export function mapAgentResultToSuggestions(
  result: AgentResult
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  /* =========================
     1. Primary Diagnosis
  ========================= */
  if (result.diagnosis?.primary) {
    const p = result.diagnosis.primary;
    suggestions.push({
      id: crypto.randomUUID(),
      type: "diagnosis",
      title: "Primary Diagnosis",
      content: `${p.condition}\nRationale: ${p.rationale}`,
      confidence: Math.round((p.confidence || 0.85) * 100),
      status: "pending",
    });
  }

  /* =========================
     2. Red Flags (Uses ensureArray)
  ========================= */
  const redFlags = ensureArray(result.safety?.red_flags);
  if (redFlags.length > 0) {
    suggestions.push({
      id: crypto.randomUUID(),
      type: "warning",
      title: "CRITICAL: Red Flags",
      content: redFlags.map((w) => `⚠️ ${w}`).join("\n"),
      confidence: 100,
      status: "pending",
    });
  }

  /* =========================
     3. Symptoms (Uses ensureArray)
  ========================= */
  if (result.diagnosis?.symptoms) {
    const s = result.diagnosis.symptoms;
    const primary = ensureArray(s.primary);
    const secondary = ensureArray(s.secondary);
    suggestions.push({
      id: crypto.randomUUID(),
      type: "diagnosis",
      title: "Symptoms Detected",
      content: [
        `Primary: ${primary.join(", ") || "None"}`,
        `Secondary: ${secondary.join(", ") || "None"}`,
      ].join("\n"),
      confidence: 85,
      status: "pending",
    });
  }

  /* =========================
     4. ICD-10 Output
  ========================= */
  result.icd_codes?.forEach((icd) => {
    suggestions.push({
      id: crypto.randomUUID(),
      type: "icd",
      title: "ICD-10 Classification",
      content: `${icd.code} — ${icd.description}`,
      confidence: Math.round((icd.confidence || 0.9) * 100),
      status: "pending",
    });
  });

  /* =========================
     5. Medication Logic
  ========================= */
  const ongoing = ensureArray(result.treatment_plan?.ongoing);
  const immediate = ensureArray(result.treatment_plan?.immediate);
  const medicationLines = ongoing.concat(immediate)
    .filter((line) => /mg|tablet|capsule|oral|iv|amoxicillin|paracetamol|dose|daily/i.test(line));

  if (medicationLines.length > 0) {
    suggestions.push({
      id: crypto.randomUUID(),
      type: "prescription",
      title: "Prescription Suggestions",
      content: Array.from(new Set(medicationLines)).map((m) => `• ${m}`).join("\n"),
      confidence: 95,
      status: "pending",
    });
  }

  /* =========================
     6. Lifestyle & Follow-Up
  ========================= */
  const lifestyle = ensureArray(result.treatment_plan?.lifestyle);
  if (lifestyle.length > 0) {
    suggestions.push({
      id: crypto.randomUUID(),
      type: "treatment",
      title: "Lifestyle Advice",
      content: lifestyle.map((item) => `• ${item}`).join("\n"),
      confidence: 80,
      status: "pending",
    });
  }

  // Type-safe mapping for the FollowUp objects from types.ts
  if (result.follow_ups?.length) {
    suggestions.push({
      id: crypto.randomUUID(),
      type: "followup",
      title: "Follow-Up Plan",
      content: result.follow_ups
        .map((f: FollowUp) => `• ${f.action} (${f.timeframe})`)
        .join("\n"),
      confidence: 90,
      status: "pending",
    });
  }

  return suggestions;
}