import type { AgentResult, FollowUp } from "@/types";
import type { Suggestion } from "@/context/ClinicalContext";

/**
 * THE GLOBAL NORMALIZER
 * Handles everything: strips XML tags, converts single strings to arrays,
 * and removes "None/NA" hallucinations from the AI.
 */
function globalNormalize(val: string | string[] | undefined | null): string[] {
  if (!val) return [];
  
  // Convert to array if it's a single string
  const arrayVal = Array.isArray(val) ? val : [val];

  return arrayVal
    .map(item => 
      String(item)
        .replace(/<[^>]*>/g, '') // Strip XML tags like <codeId>
        .replace(/\s+/g, ' ')    // Clean extra whitespace
        .trim()
    )
    .filter(item => 
      item !== "" && 
      item.toLowerCase() !== "none" && 
      item.toLowerCase() !== "n/a" &&
      item.toLowerCase() !== "null"
    );
}

export function mapAgentResultToSuggestions(
  result: AgentResult
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  /* =========================
     1. Primary Diagnosis
  ========================= */
  if (result.diagnosis?.primary?.condition) {
    const p = result.diagnosis.primary;
    // Clean the text even in objects
    const cleanCondition = p.condition.replace(/<[^>]*>/g, '').trim();
    const cleanRationale = p.rationale.replace(/<[^>]*>/g, '').trim();

    suggestions.push({
      id: crypto.randomUUID(),
      type: "diagnosis",
      title: "Primary Diagnosis",
      content: `${cleanCondition}\nRationale: ${cleanRationale}`,
      confidence: Math.round((p.confidence || 0.85) * 100),
      status: "pending",
    });
  }

  /* =========================
     2. Red Flags (High Priority)
  ========================= */
  const redFlags = globalNormalize(result.safety?.red_flags);
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
     3. Symptoms Detected
  ========================= */
  const primarySymp = globalNormalize(result.diagnosis?.symptoms?.primary);
  const secondarySymp = globalNormalize(result.diagnosis?.symptoms?.secondary);
  
  if (primarySymp.length > 0 || secondarySymp.length > 0) {
    suggestions.push({
      id: crypto.randomUUID(),
      type: "diagnosis",
      title: "Symptoms Detected",
      content: [
        `Primary: ${primarySymp.join(", ") || "Analysis ongoing"}`,
        `Secondary: ${secondarySymp.join(", ") || "None"}`,
      ].join("\n"),
      confidence: 85,
      status: "pending",
    });
  }

  /* =========================
     4. ICD-10 Engine Output
  ========================= */
  result.icd_codes?.forEach((icd) => {
    if (icd.code) {
      suggestions.push({
        id: crypto.randomUUID(),
        type: "icd",
        title: "ICD-10 Classification",
        content: `${icd.code.replace(/<[^>]*>/g, '')} — ${icd.description.replace(/<[^>]*>/g, '')}`,
        confidence: Math.round((icd.confidence || 0.9) * 100),
        status: "pending",
      });
    }
  });

  /* =========================
     5. Medication & Prescriptions
  ========================= */
  const ongoing = globalNormalize(result.treatment_plan?.ongoing);
  const immediate = globalNormalize(result.treatment_plan?.immediate);
  
  const medicationLines = [...ongoing, ...immediate]
    .filter((line) => /mg|tablet|capsule|oral|iv|amoxicillin|paracetamol|dose|daily|take/i.test(line));

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
     6. Lifestyle Advice
  ========================= */
  const lifestyle = globalNormalize(result.treatment_plan?.lifestyle);
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

  /* =========================
     7. Follow-Up Plan
  ========================= */
  if (result.follow_ups && result.follow_ups.length > 0) {
    suggestions.push({
      id: crypto.randomUUID(),
      type: "followup",
      title: "Follow-Up Plan",
      content: result.follow_ups
        .map((f: FollowUp) => {
          const action = f.action.replace(/<[^>]*>/g, '').trim();
          const time = f.timeframe.replace(/<[^>]*>/g, '').trim();
          return `• ${action} (${time})`;
        })
        .join("\n"),
      confidence: 90,
      status: "pending",
    });
  }

  return suggestions;
}