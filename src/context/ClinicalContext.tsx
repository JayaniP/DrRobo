import { useState, useCallback, createContext, useContext, ReactNode } from 'react';
import { toast } from 'sonner';
import type { DiagnosisResult, ICDCode } from "@/types";

/* ================================
   Types
================================ */

export interface TreatmentProtocol {
  name: string;
  steps: string[];
}

export interface Suggestion {
  id: string;
  type:
    | "diagnosis"
    | "icd"
    | "prescription"
    | "treatment"
    | "followup"
    | "warning"; // ✅ ADD THIS
  title: string;
  content: string;
  confidence: number;
  status: "pending" | "approved" | "rejected" | "modified";
}

/* ================================
   State
================================ */

interface ClinicalState {
  isAnalyzing: boolean;
  transcribedText: string;
  clinicalNotes: string;
  icdCodes: ICDCode[];
  suggestions: Suggestion[];
  diagnosisResult: DiagnosisResult | null;
  currentPatient: {
    name: string;
    age: number;
    gender: string;
    history?: string[];
  } | null;
}

interface ClinicalContextType extends ClinicalState {
  setTranscribedText: (text: string) => void;
  setClinicalNotes: (notes: string) => void;
  setCurrentPatient: (patient: ClinicalState['currentPatient']) => void;
  setAgentResult: (result: {
    diagnosisResult: DiagnosisResult;
    icdCodes?: ICDCode[];
    suggestions?: Suggestion[];
  }) => void;

  setAnalyzing: (value: boolean) => void; // ✅ ADD THIS

  approveSuggestion: (id: string) => void;
  rejectSuggestion: (id: string) => void;
  modifySuggestion: (id: string, newContent: string) => void;
  clearAll: () => void;
}

const ClinicalContext = createContext<ClinicalContextType | null>(null);

/* ================================
   Provider
================================ */

  export function ClinicalProvider({ children }: { children: ReactNode }) {

    // ✅ 1. State FIRST
    const [state, setState] = useState<ClinicalState>({
      isAnalyzing: false,
      transcribedText: '',
      clinicalNotes: '',
      icdCodes: [],
      suggestions: [],
      diagnosisResult: null,
      currentPatient: null,
    });

    // ✅ 2. THEN callbacks that use setState
    const setAnalyzing = useCallback((value: boolean) => {
      setState(prev => ({ ...prev, isAnalyzing: value }));
    }, []);

    const setTranscribedText = useCallback((text: string) => {
      setState(prev => ({ ...prev, transcribedText: text }));
    }, []);

    const setClinicalNotes = useCallback((notes: string) => {
      setState(prev => ({ ...prev, clinicalNotes: notes }));
    }, []);

    const setCurrentPatient = useCallback(
      (patient: ClinicalState['currentPatient']) => {
        setState(prev => ({ ...prev, currentPatient: patient }));
      },
      []
    );

   const setAgentResult = useCallback((result: {
      diagnosisResult: DiagnosisResult;
      icdCodes?: ICDCode[];
      suggestions?: Suggestion[];
    }) => {
      setState(prev => ({
        ...prev,
        diagnosisResult: result.diagnosisResult,
        // CHANGE: Default to [] instead of prev.icdCodes to ensure a clean UI
        icdCodes: result.icdCodes || [], 
        suggestions: result.suggestions || [],
        isAnalyzing: false,
      }));

      toast.success('Dr Robo analysis ready for review');
    }, []);
  /* ================================
     Doctor Actions
================================ */

  const approveSuggestion = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      suggestions: prev.suggestions.map(s =>
        s.id === id ? { ...s, status: 'approved' } : s
      ),
    }));
    toast.success('Suggestion approved');
  }, []);

  const rejectSuggestion = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      suggestions: prev.suggestions.filter(s => s.id !== id),
    }));
    toast.info('Suggestion rejected');
  }, []);

  const modifySuggestion = useCallback((id: string, newContent: string) => {
    setState(prev => ({
      ...prev,
      suggestions: prev.suggestions.map(s =>
        s.id === id
          ? { ...s, content: newContent, status: 'modified' }
          : s
      ),
    }));
    toast.success('Suggestion modified');
  }, []);

  const clearAll = useCallback(() => {
    setState({
      isAnalyzing: false,
      transcribedText: '',
      clinicalNotes: '',
      icdCodes: [],
      suggestions: [],
      diagnosisResult: null,
      currentPatient: null,
    });
  }, []);

  return (
    <ClinicalContext.Provider
      value={{
        ...state,
        setTranscribedText,
        setClinicalNotes,
        setCurrentPatient,
        setAgentResult,
        setAnalyzing, 
        approveSuggestion,
        rejectSuggestion,
        modifySuggestion,
        clearAll,
      }}
    >
      {children}
    </ClinicalContext.Provider>
  );
}

/* ================================
   Hook
================================ */

export function useClinical() {
  const context = useContext(ClinicalContext);
  if (!context) {
    throw new Error('useClinical must be used within ClinicalProvider');
  }
  return context;
}
