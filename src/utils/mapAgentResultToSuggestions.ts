import type { AgentResult, FollowUp } from "@/types";
import type { Suggestion } from "@/context/ClinicalContext";

/**
 * THE GLOBAL NORMALIZER (Deep Cleaning Engine)
 * Replaces 'any' with 'unknown' to satisfy ESLint.
 * Strips <tags>, [citations], and filters out "None/NA" hallucinations.
 */
function globalClean(val: unknown): string[] {
  if (!val) return [];
  
  const arrayVal = Array.isArray(val) ? val : [val];

  return arrayVal
    .map(item => 
      String(item)
        .replace(/<[^>]*>/g, '') // Remove XML tags
        .replace(/\[\d+\]/g, '') // Remove [1] citations
        .replace(/\s+/g, ' ')    // Clean extra spaces
        .trim()
    )
    .filter((item): item is string => 
      item !== "" && 
      !/^(none|n\/a|null|undefined|no acute symptoms|nothing detected)$/i.test(item)
    );
}

export function mapAgentResultToSuggestions(rawInput: unknown): Suggestion[] {
  let result: AgentResult;

  // 1. SAFE EXTRACTION: Handle strings or objects from Bedrock
  try {
    if (typeof rawInput === 'string') {
      const jsonMatch = rawInput.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawInput);
    } else if (rawInput !== null && typeof rawInput === 'object') {
      result = rawInput as AgentResult;
    } else {
      return [];
    }
  } catch (e) {
    console.error("Mapping Error:", e);
    return [];
  }

  const suggestions: Suggestion[] = [];

  /* ===================================================
     1. PRIMARY DIAGNOSIS
  =================================================== */
  const primary = result.diagnosis?.primary;
  if (primary?.condition) {
    const cleanCondition = primary.condition.replace(/<[^>]*>/g, '').trim();
    const cleanRationale = primary.rationale?.replace(/<[^>]*>/g, '').trim() || "Analyzed from clinical transcript.";

    suggestions.push({
      id: crypto.randomUUID(),
      type: "diagnosis",
      title: "Primary Diagnosis",
      content: `${cleanCondition}\n\nRationale: ${cleanRationale}`,
      confidence: Math.round((primary.confidence || 0.85) * 100),
      status: "pending",
    });
  }

  /* ===================================================
     2. CLINICAL RED FLAGS (High Priority)
  =================================================== */
  const redFlags = globalClean(result.safety?.red_flags);
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
     3. SYMPTOMS DETECTED (Detailed breakdown)
  =================================================== */
  const primarySymp = globalClean(result.diagnosis?.symptoms?.primary);
  const secondarySymp = globalClean(result.diagnosis?.symptoms?.secondary);
  
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
     4. ICD-10 CLASSIFICATION
  =================================================== */
  result.icd_codes?.forEach((icd) => {
    const cleanCode = icd.code?.replace(/<[^>]*>/g, '').trim();
    const cleanDesc = icd.description?.replace(/<[^>]*>/g, '').trim();
    
    if (cleanCode && cleanDesc) {
      suggestions.push({
        id: crypto.randomUUID(),
        type: "icd",
        title: "ICD-10 Code",
        content: `${cleanCode} — ${cleanDesc}`,
        confidence: Math.round((icd.confidence || 0.9) * 100),
        status: "pending",
      });
    }
  });

  /* ===================================================
     5. MANAGEMENT & TREATMENT (Prescriptions/Immediate)
  =================================================== */
  const immediate = globalClean(result.treatment_plan?.immediate);
  const ongoing = globalClean(result.treatment_plan?.ongoing);
  
  const allTreatments = [...new Set([...immediate, ...ongoing])];

  if (allTreatments.length > 0) {
    // Separate medications from general actions if they contain dosage words
    const meds = allTreatments.filter(t => /mg|tablet|capsule|iv|oral|daily|take|dose/i.test(t));
    const nonMeds = allTreatments.filter(t => !/mg|tablet|capsule|iv|oral|daily|take|dose/i.test(t));

    if (meds.length > 0) {
      suggestions.push({
        id: crypto.randomUUID(),
        type: "prescription",
        title: "Prescription Suggestions",
        content: meds.map(m => `• ${m}`).join("\n"),
        confidence: 95,
        status: "pending",
      });
    }

    if (nonMeds.length > 0) {
      suggestions.push({
        id: crypto.randomUUID(),
        type: "treatment",
        title: "Immediate Management",
        content: nonMeds.map(t => `• ${t}`).join("\n"),
        confidence: 90,
        status: "pending",
      });
    }
  }

  /* ===================================================
     6. LIFESTYLE ADVICE
  =================================================== */
  const lifestyle = globalClean(result.treatment_plan?.lifestyle);
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
     7. FOLLOW-UP PLAN
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