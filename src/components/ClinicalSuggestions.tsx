import { useClinical } from "@/context/ClinicalContext";
import { Check, X, Edit } from "lucide-react";

export default function ClinicalSuggestions() {
  const {
    suggestions,
    approveSuggestion,
    rejectSuggestion,
    modifySuggestion
  } = useClinical();

  if (!suggestions.length) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm">AI Suggestions</h3>

      {suggestions.map((s) => (
        <div
          key={s.id}
          className="p-3 rounded-lg border bg-secondary/30"
        >
          <div className="flex justify-between">
            <div>
              <p className="font-medium text-sm">{s.title}</p>
              <p className="text-xs text-muted-foreground">{s.content}</p>
              <p className="text-[10px] text-muted-foreground">
                Confidence: {s.confidence}%
              </p>
            </div>

            <div className="flex gap-2">
              <button onClick={() => approveSuggestion(s.id)}>
                <Check className="w-4 h-4 text-green-600" />
              </button>
              <button onClick={() => rejectSuggestion(s.id)}>
                <X className="w-4 h-4 text-red-600" />
              </button>
              <button
                onClick={() =>
                  modifySuggestion(
                    s.id,
                    prompt("Edit suggestion", s.content) || s.content
                  )
                }
              >
                <Edit className="w-4 h-4 text-blue-600" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
