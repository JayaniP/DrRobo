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
     2. 🚨 RED FLAGS (Updated to match Agent Schema)
  ========================= */
    let redFlags: string[] = [];

    if (result.safety?.red_flags) {
      redFlags = result.safety.red_flags;
    } else if ('warnings' in result && Array.isArray((result as { warnings: string[] }).warnings)) {
      // We explicitly cast to a specific shape instead of 'any'
      redFlags = (result as { warnings: string[] }).warnings;
    }

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
     3. Symptoms Summary (Primary & Secondary)
  ========================= */
  if (result.diagnosis?.symptoms) {
    const s = result.diagnosis.symptoms;
    suggestions.push({
      id: crypto.randomUUID(),
      type: "diagnosis",
      title: "Symptoms Detected",
      content: [
        `Primary: ${s.primary?.join(", ") || "None"}`,
        `Secondary: ${s.secondary?.join(", ") || "None"}`,
      ].join("\n"),
      confidence: 85,
      status: "pending",
    });
  }

  /* =========================
     4. ICD-10 Engine Output
  ========================= */
  result.icd_codes?.forEach((icd) => {
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
     5. Medication & Contraindications
  ========================= */
  // Add Safety Alerts from Digital Twin history (e.g., ACE-inhibitor allergy)
  if (result.safety?.contraindications_found?.length) {
    suggestions.push({
      id: crypto.randomUUID(),
      type: "warning",
      title: "Personalization Alert (Digital Twin)",
      content: result.safety.contraindications_found.map(c => `❌ Avoid: ${c}`).join("\n"),
      confidence: 100,
      status: "pending",
    });
  }

  const medicationLines = result.treatment_plan?.ongoing?.concat(result.treatment_plan?.immediate || [])
    .filter((line) => /mg|tablet|capsule|oral|iv|amoxicillin|paracetamol|dose/i.test(line)) ?? [];

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
  if (result.treatment_plan?.lifestyle?.length) {
    suggestions.push({
      id: crypto.randomUUID(),
      type: "treatment",
      title: "Lifestyle Advice",
      content: result.treatment_plan.lifestyle.map((item) => `• ${item}`).join("\n"),
      confidence: 80,
      status: "pending",
    });
  }

  if (result.follow_ups?.length) {
    suggestions.push({
      id: crypto.randomUUID(),
      type: "followup",
      title: "Follow-Up Plan",
      content: result.follow_ups.map((f) => `• ${f.action} (${f.timeframe})`).join("\n"),
      confidence: 90,
      status: "pending",
    });
  }

  return suggestions;
}