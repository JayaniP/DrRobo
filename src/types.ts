/* =====================================================
   ICD Code
===================================================== */
export interface ICDCode {
  code: string;
  description: string;
  confidence: number;
}

/* =====================================================
   Diagnosis & Symptoms
==================================================== */
export interface DiagnosisPrimary {
  condition: string;
  confidence: number;
  rationale: string;
}

export interface Symptoms {
  primary: string[];    
  secondary?: string[];
}

export interface Diagnosis {
  primary?: DiagnosisPrimary;
  symptoms?: Symptoms; 
}

/* =====================================================
   Safety & Red Flags (CRITICAL FOR CLINICAL USE)
===================================================== */
export interface Safety {
  red_flags: string[];
  contraindications_found?: string[];
}

/* =====================================================
   Treatment & Follow-up
===================================================== */
export interface TreatmentPlan {
  immediate?: string[];
  ongoing?: string[];
  lifestyle?: string[];
}

export interface FollowUp {
  timeframe: string;
  action: string;
}

/* =====================================================
   RAW BEDROCK AGENT OUTPUT (The Strict "Input" Contract)
===================================================== */
export interface AgentResult {
  diagnosis: {
    primary: {
      condition: string;
      confidence: number;
      rationale: string;
    };
    symptoms: {
      primary: string[];
      secondary: string[];
    };
  };
  icd_codes: Array<{
    code: string;
    description: string;
    confidence: number;
  }>;
  safety: {
    red_flags: string[];
    contraindications_found: string[];
  };
  treatment_plan: {
    immediate: string[];
    ongoing: string[];
    lifestyle: string[];
  };
  follow_ups: Array<{
    timeframe: string;
    action: string;
  }>;
}

/* =====================================================
   NORMALIZED FRONTEND RESULT (The Flexible "UI" State)
===================================================== */
export interface DiagnosisResult {
  diagnosis?: {
    primary?: {
      condition: string;
      confidence: number;
      rationale: string;
    };
    symptoms?: {
      primary: string[];
      secondary: string[];
    };
  };
  icd_codes?: Array<{
    code: string;
    description: string;
    confidence: number;
  }>;
  safety?: {
    red_flags: string[];
    contraindications_found?: string[];
  };
  treatment_plan?: {
    immediate?: string[];
    ongoing?: string[];
    lifestyle?: string[];
  };
  follow_ups?: Array<{
    timeframe: string;
    action: string;
  }>;
  
  // UI Specific fields
  isValidated?: boolean;
  warnings?: string[]; 
}