import type { AgentResult } from "@/types";
import type { Suggestion } from "@/context/ClinicalContext";

export function mapAgentResultToSuggestions(
  result: AgentResult
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  /* =========================
     1. Primary Diagnosis & Rationale
  ========================= */
  if (result.diagnosis?.primary) {
    suggestions.push({
      id: crypto.randomUUID(),
      type: "diagnosis",
      title: "Primary Diagnosis",
      content: `${result.diagnosis.primary.condition}\nRationale: ${result.diagnosis.primary.rationale}`,
      confidence: Math.round(result.diagnosis.primary.confidence * 100),
      status: "pending",
    });
  }

  /* =========================
     2. Symptoms Summary
  ========================= */
  if (result.diagnosis?.symptoms) {
    const s = result.diagnosis.symptoms;
    suggestions.push({
      id: crypto.randomUUID(),
      type: "diagnosis",
      title: "Symptoms Detected",
      content: [
        `Primary: ${s.primary?.length ? s.primary.join(", ") : "None"}`,
        `Secondary: ${s.secondary?.length ? s.secondary.join(", ") : "None"}`,
      ].join("\n"),
      confidence: 85,
      status: "pending",
    });
  }

  /* =========================
     3. 🚨 RED FLAGS
  ========================= */
  if (result.safety?.red_flags?.length) {
    suggestions.push({
      id: crypto.randomUUID(),
      type: "warning",
      title: "CRITICAL: Red Flags",
      content: result.safety.red_flags.map(w => `⚠️ ${w}`).join("\n"),
      confidence: 100,
      status: "pending",
    });
  }

  /* =========================
     4. ICD-10 Codes
  ========================= */
  result.icd_codes?.forEach(icd => {
    suggestions.push({
      id: crypto.randomUUID(),
      type: "icd",
      title: "ICD-10 Classification",
      content: `${icd.code} — ${icd.description}`,
      confidence: Math.round(icd.confidence * 100),
      status: "pending",
    });
  });

  /* =========================
     5. Contraindications
  ========================= */
  if (result.safety?.contraindications_found?.length) {
    suggestions.push({
      id: crypto.randomUUID(),
      type: "warning",
      title: "Personalization Alert",
      content: result.safety.contraindications_found
        .map(c => `❌ Avoid: ${c}`)
        .join("\n"),
      confidence: 100,
      status: "pending",
    });
  }

  /* =========================
     6. Medications
  ========================= */
  const medicationLines = [
    ...(result.treatment_plan?.immediate ?? []),
    ...(result.treatment_plan?.ongoing ?? []),
  ].filter(line =>
    /mg|tablet|capsule|oral|iv|dose|amoxicillin|paracetamol/i.test(line)
  );

  if (medicationLines.length) {
    suggestions.push({
      id: crypto.randomUUID(),
      type: "prescription",
      title: "Prescription Suggestions",
      content: [...new Set(medicationLines)].map(m => `• ${m}`).join("\n"),
      confidence: 95,
      status: "pending",
    });
  }

  /* =========================
     7. Lifestyle Advice
  ========================= */
  if (result.treatment_plan?.lifestyle?.length) {
    suggestions.push({
      id: crypto.randomUUID(),
      type: "treatment",
      title: "Lifestyle Advice",
      content: result.treatment_plan.lifestyle.map(i => `• ${i}`).join("\n"),
      confidence: 80,
      status: "pending",
    });
  }

  /* =========================
     8. Follow-Up
  ========================= */
  if (result.follow_ups?.length) {
    suggestions.push({
      id: crypto.randomUUID(),
      type: "followup",
      title: "Follow-Up Plan",
      content: result.follow_ups
        .map(f => `• ${f.action} (${f.timeframe})`)
        .join("\n"),
      confidence: 90,
      status: "pending",
    });
  }

  /* =========================
     9. 🔚 RAW TEXT FALLBACK (LAST ONLY)
  ========================= */
  if (suggestions.length === 0 && result.raw_text) {
    suggestions.push({
      id: crypto.randomUUID(),
      type: "diagnosis",
      title: "Clinical Analysis Summary",
      content: result.raw_text,
      confidence: 70,
      status: "pending",
    });
  }

  return suggestions;
}
