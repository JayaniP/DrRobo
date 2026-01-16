import { useEffect, useState } from "react";
import { 
  Bot, 
  Sparkles, 
  FileText, 
  Pill, 
  CalendarCheck, 
  Code, 
  Check, 
  X, 
  ChevronDown,
  Loader2,
  Edit3,
  AlertTriangle,
  Stethoscope,
  Brain
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClinical, Suggestion } from "@/context/ClinicalContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";


const DrRoboAssistant = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [editingSuggestion, setEditingSuggestion] = useState<Suggestion | null>(null);
  const [editContent, setEditContent] = useState("");
  
  const { 
    isAnalyzing, 
    suggestions, 
    approveSuggestion, 
    rejectSuggestion, 
    modifySuggestion,
    diagnosisResult
  } = useClinical();

  useEffect(() => {
    console.log("Current Suggestions in DrRobo:", suggestions);
    console.log("Diagnosis Result in DrRobo:", diagnosisResult);
  }, [suggestions, diagnosisResult]);

  const getIcon = (type: string) => {
    switch (type) {
      case "icd": return <Code className="w-4 h-4" />;
      case "diagnosis": return <Stethoscope className="w-4 h-4" />;
      case "prescription": return <Pill className="w-4 h-4" />;
      case "treatment": return <Sparkles className="w-4 h-4" />;
      case "followup": return <CalendarCheck className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "icd": return "bg-primary/10 text-primary border-primary/20";
      case "diagnosis": return "bg-accent/10 text-accent border-accent/20";
      case "prescription": return "bg-destructive/10 text-destructive border-destructive/20";
      case "treatment": return "bg-vital-good/10 text-vital-good border-vital-good/20";
      case "followup": return "bg-vital-warning/10 text-vital-warning border-vital-warning/20";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved": return "bg-vital-good/20 text-vital-good";
      case "rejected": return "bg-destructive/20 text-destructive";
      case "modified": return "bg-accent/20 text-accent";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return "text-vital-good";
    if (confidence >= 75) return "text-vital-warning";
    return "text-destructive";
  };

  const handleModify = (suggestion: Suggestion) => {
    setEditingSuggestion(suggestion);
    setEditContent(suggestion.content);
  };

  const handleSaveModification = () => {
    if (editingSuggestion) {
      modifySuggestion(editingSuggestion.id, editContent);
      setEditingSuggestion(null);
      setEditContent("");
    }
  };

  const pendingSuggestions = suggestions.filter(s => s.status === 'pending');
  const processedSuggestions = suggestions.filter(s => s.status !== 'pending');
  
  const buildFinalConsultationText = () => {
        if (!suggestions.length) return "No clinical data available.";

        const approved = suggestions.filter(
          s => s.status === "approved" || s.status === "modified"
        );

        const byType = (type: string) =>
          approved
            .filter(s => s.type === type)
            .map(s => `- ${s.content}`)
            .join("\n") || "N/A";

        return `
      Diagnosis:
      ${byType("diagnosis")}

      ICD-10 Codes:
      ${byType("icd")}

      Treatment Plan:
      ${byType("treatment")}

      Prescriptions:
      ${byType("prescription")}

      Follow Up:
      ${byType("followup")}
      `;
      };


  const handlePrint = () => {
    const content = buildFinalConsultationText();

    const win = window.open("", "_blank");
    if (!win) return;

    win.document.write(`
      <html>
        <head>
          <title>Consultation Note</title>
          <style>
            body { font-family: Arial; padding: 24px; }
            pre { white-space: pre-wrap; }
          </style>
        </head>
        <body>
          <h2>Consultation Note</h2>
          <pre>${content}</pre>
        </body>
      </html>
    `);

    win.document.close();
    win.print();
  };

  const handleDownload = () => {
    const content = buildFinalConsultationText();

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "consultation-note.txt";
    a.click();

    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="medical-card-elevated animate-fade-in h-full flex flex-col">
        {/* Header */}
        <div 
          className="flex items-center justify-between pb-4 border-b border-border cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent via-primary to-accent flex items-center justify-center relative shadow-lg">
              <Brain className="w-6 h-6 text-accent-foreground" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-vital-good rounded-full border-2 border-card animate-pulse" />
            </div>
            <div>
              <h3 className="font-display font-bold text-foreground text-lg">Dr. Robo AI</h3>
              <p className="text-xs text-muted-foreground">
                AWS Bedrock + Comprehend Medical
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isAnalyzing && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin text-accent" />
                <span className="text-xs font-medium text-accent">Analyzing...</span>
              </div>
            )}
            <div className="flex items-center gap-1 px-2 py-1 bg-secondary rounded-md">
              <span className="text-xs text-muted-foreground">{pendingSuggestions.length} pending</span>
            </div>
            <ChevronDown 
              className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
            />
          </div>
        </div>

        {/* Suggestions List */}
        {isExpanded && (
          <div className="pt-4 space-y-3 animate-slide-in flex-1 overflow-y-auto">
            {suggestions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center mb-4">
                  <Bot className="w-8 h-8 text-accent" />
                </div>
                <p className="text-foreground font-medium mb-2">
                  Ready for Clinical Analysis
                </p>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Record a consultation or type clinical notes, then click "Analyze" to generate AI-powered suggestions based on NICE guidelines.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">ICD-10 Codes</span>
                  <span className="px-2 py-1 bg-accent/10 text-accent text-xs rounded-full">Diagnosis</span>
                  <span className="px-2 py-1 bg-destructive/10 text-destructive text-xs rounded-full">Prescriptions</span>
                  <span className="px-2 py-1 bg-vital-good/10 text-vital-good text-xs rounded-full">Treatment Plans</span>
                </div>
              </div>
            ) : (
              <>
                {/* Pending Suggestions */}
                {pendingSuggestions.map((suggestion) => (
                  <div 
                    key={suggestion.id}
                    className="p-4 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/50 transition-all animate-slide-in group"
                  >
                    {/* Suggestion Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`p-2 rounded-lg border ${getTypeColor(suggestion.type)}`}>
                          {getIcon(suggestion.type)}
                        </span>
                        <div>
                          <h4 className="text-sm font-semibold text-foreground">{suggestion.title}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">
                              Confidence: 
                            </span>
                            <span className={`text-xs font-bold ${getConfidenceColor(suggestion.confidence)}`}>
                              {suggestion.confidence}%
                            </span>
                            <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${
                                  suggestion.confidence >= 90 ? 'bg-vital-good' : 
                                  suggestion.confidence >= 75 ? 'bg-vital-warning' : 'bg-destructive'
                                }`}
                                style={{ width: `${suggestion.confidence}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Suggestion Content */}
                    <p className="text-sm text-foreground mb-3 pl-12 leading-relaxed">
                      {suggestion.content}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pl-12">
                      <Button
                        size="sm"
                        className="h-8 px-4 bg-vital-good hover:bg-vital-good/90 text-white shadow-sm"
                        onClick={() => approveSuggestion(suggestion.id)}
                      >
                        <Check className="w-3.5 h-3.5 mr-1.5" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-4 border-destructive/30 text-destructive hover:bg-destructive/10"
                        onClick={() => rejectSuggestion(suggestion.id)}
                      >
                        <X className="w-3.5 h-3.5 mr-1.5" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-4 text-muted-foreground hover:text-accent"
                        onClick={() => handleModify(suggestion)}
                      >
                        <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                        Modify
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Processed Suggestions */}
                {processedSuggestions.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <h5 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                      Processed Suggestions
                    </h5>
                    {processedSuggestions.map((suggestion) => (
                      <div 
                        key={suggestion.id}
                        className={`p-3 rounded-lg border mb-2 ${
                          suggestion.status === 'approved' ? 'border-vital-good/30 bg-vital-good/5' :
                          suggestion.status === 'modified' ? 'border-accent/30 bg-accent/5' :
                          'border-border bg-secondary/20'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`p-1 rounded ${getTypeColor(suggestion.type)}`}>
                              {getIcon(suggestion.type)}
                            </span>
                            <span className="text-sm text-foreground line-clamp-1">{suggestion.content}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(suggestion.status)}`}>
                            {suggestion.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

               {/* Warnings */}
                {/* 🚨 Check for safety.red_flags instead of warnings */}
                  {Array.isArray(diagnosisResult?.safety?.red_flags) && diagnosisResult.safety.red_flags.length > 0 && (
                    <div className="mt-4 p-3 rounded-lg border border-vital-warning/30 bg-vital-warning/5">
                      <div className="flex items-center gap-2 text-vital-warning mb-2">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm font-medium uppercase tracking-wider">Clinical Red Flags</span>
                      </div>
                      <ul className="text-xs text-muted-foreground space-y-1 pl-6">
                        {diagnosisResult.safety.red_flags.map((warning, index) => (
                          <li key={index} className="list-disc leading-relaxed">
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 mt-auto border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Powered by AWS Bedrock + Comprehend Medical</span>
            <span>NICE Guidelines</span>
            <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handlePrint}>
              Print
            </Button>
            <Button size="sm" variant="outline" onClick={handleDownload}>
              Download
            </Button>
          </div>
          </div>
        </div>
      </div>

      {/* Modify Dialog */}
      <Dialog open={!!editingSuggestion} onOpenChange={() => setEditingSuggestion(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-accent" />
              Modify Suggestion
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-2 mb-3">
              <span className={`p-1.5 rounded-lg border ${getTypeColor(editingSuggestion?.type || 'icd')}`}>
                {getIcon(editingSuggestion?.type || 'icd')}
              </span>
              <span className="text-sm font-medium">{editingSuggestion?.title}</span>
            </div>
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[120px]"
              placeholder="Modify the suggestion content..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSuggestion(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveModification} className="bg-accent hover:bg-accent/90">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DrRoboAssistant;
