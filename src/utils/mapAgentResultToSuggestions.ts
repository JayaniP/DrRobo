import type { AgentResult, FollowUp } from "@/types";
import type { Suggestion } from "@/context/ClinicalContext";

/**
 * THE GLOBAL NORMALIZER (Deep Cleaning Engine)
 * This function handles the "Unexpected any" error by using 'unknown'.
 */
function globalNormalize(val: unknown): string[] {
  if (!val) return [];
  
  // Convert unknown input to an array safely
  const arrayVal = Array.isArray(val) ? val : [val];

  return arrayVal
    .map(item => 
      String(item)
        .replace(/<[^>]*>/g, '') // DEEP CLEAN: Removes Bedrock XML tags
        .replace(/\s+/g, ' ')    // DEEP CLEAN: Fixes spacing
        .trim()
    )
    .filter(item => 
      item !== "" && 
      // DEEP CLEAN: Filters out "None", "N/A", and "Undefined" hallucinations
      !/^(none|n\/a|null|undefined|no acute symptoms|nothing detected)$/i.test(item)
    );
}

export function mapAgentResultToSuggestions(
  result: AgentResult
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  /* ===================================================
     1. Primary Diagnosis
  =================================================== */
  if (result.diagnosis?.primary?.condition) {
    const p = result.diagnosis.primary;
    const cleanCondition = p.condition.replace(/<[^>]*>/g, '').trim();
    const cleanRationale = p.rationale?.replace(/<[^>]*>/g, '').trim() || "Analysis complete.";

    suggestions.push({
      id: crypto.randomUUID(),
      type: "diagnosis",
      title: "Primary Diagnosis",
      content: `${cleanCondition}\n\nRationale: ${cleanRationale}`,
      confidence: Math.round((p.confidence || 0.85) * 100),
      status: "pending",
    });
  }

  /* ===================================================
     2. Red Flags (High Priority)
  =================================================== */
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

  /* ===================================================
     3. Symptoms (Deep Cleaned to prevent "None" cards)
  =================================================== */
  const primarySymp = globalNormalize(result.diagnosis?.symptoms?.primary);
  const secondarySymp = globalNormalize(result.diagnosis?.symptoms?.secondary);
  
  if (primarySymp.length > 0 || secondarySymp.length > 0) {
    const lines: string[] = [];
    if (primarySymp.length > 0) lines.push(`Primary: ${primarySymp.join(", ")}`);
    if (secondarySymp.length > 0) lines.push(`Secondary: ${secondarySymp.join(", ")}`);

    suggestions.push({
      id: crypto.randomUUID(),
      type: "diagnosis",
      title: "Symptoms Detected",
      content: lines.join("\n"),
      confidence: 85,
      status: "pending",
    });
  }

  /* ===================================================
     4. ICD-10 Engine Output
  =================================================== */
  result.icd_codes?.forEach((icd) => {
    const cleanCode = icd.code?.replace(/<[^>]*>/g, '').trim();
    const cleanDesc = icd.description?.replace(/<[^>]*>/g, '').trim();
    
    if (cleanCode && cleanDesc) {
      suggestions.push({
        id: crypto.randomUUID(),
        type: "icd",
        title: "ICD-10 Classification",
        content: `${cleanCode} — ${cleanDesc}`,
        confidence: Math.round((icd.confidence || 0.9) * 100),
        status: "pending",
      });
    }
  });

  /* ===================================================
     5. Medication & Lifestyle (Merged Logic)
  =================================================== */
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

  /* ===================================================
     6. Follow-Up Plan
  =================================================== */
  if (result.follow_ups && result.follow_ups.length > 0) {
    const validFollowUps = result.follow_ups
      .map((f: FollowUp) => {
        const action = f.action?.replace(/<[^>]*>/g, '').trim();
        const time = f.timeframe?.replace(/<[^>]*>/g, '').trim();
        return action ? `• ${action} (${time || 'as needed'})` : null;
      })
      .filter((item): item is string => item !== null);

    if (validFollowUps.length > 0) {
      suggestions.push({
        id: crypto.randomUUID(),
        type: "followup",
        title: "Follow-Up Plan",
        content: validFollowUps.join("\n"),
        confidence: 90,
        status: "pending",
      });
    }
  }

  return suggestions;
}