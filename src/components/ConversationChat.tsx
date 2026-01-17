import { useState, useRef, useEffect } from "react";
import { 
  MessageCircle, 
  Send, 
  Mic, 
  MicOff, 
  User,
  Stethoscope,
  Loader2,
  FileText,
  Pause,
  Square,
  Play,
  Zap,
  Plus
} from "lucide-react";
import { useClinical } from "@/context/ClinicalContext";
import { toast } from "sonner";
import type {
  AgentResult
} from "@/types";

import { mapAgentResultToSuggestions } from "@/utils/mapAgentResultToSuggestions";


const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Declare SpeechRecognition types for TypeScript
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInterface extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

interface Message {
  id: string;
  role: "CLINICIAN" | "PATIENT";
  content: string;
  timestamp: Date;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInterface;
    webkitSpeechRecognition?: new () => SpeechRecognitionInterface;
  }
}

const ConversationChat = () => {
  const [isConversationActive, setIsConversationActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [notesText, setNotesText] = useState("");
  const [currentRole, setCurrentRole] = useState<'CLINICIAN' | 'PATIENT'>('PATIENT');
  const [isListening, setIsListening] = useState(false);
  const [isVoiceToText, setIsVoiceToText] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInterface | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const userStoppedRef = useRef(false);
  const isConversationActiveRef = useRef(isConversationActive);
  const isVoiceToTextRef = useRef(isVoiceToText);
  const isPausedRef = useRef(isPaused);
  const currentRoleRef = useRef(currentRole);
    
  const {
    currentPatient,
    setAgentResult,
    clearAll,
    setAnalyzing,
    isAnalyzing, 
  } = useClinical();


  // Calculate word count
  const wordCount = notesText.trim()
    ? notesText.trim().split(/\s+/).length
    : 0;

  useEffect(() => {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    toast.error("Speech recognition not supported");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = "en-US";

  recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      const transcript = last[0].transcript.trim();

      if (!last.isFinal) return;

      // 🟢 VOICE TO TEXT → NOTES
      if (
        isVoiceToTextRef.current &&
        !isConversationActiveRef.current
      ) {
        setNotesText(prev => prev + " " + transcript);
        return;
      }

      // 🟢 REAL-TIME CONVERSATION
      if (
        isConversationActiveRef.current &&
        !isPausedRef.current
      ) {
        addMessage(
          currentRoleRef.current,
          transcript
        );
      }
    };

    recognition.onerror = (e) => {
      console.error("Speech error:", e);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, []);


  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
        isConversationActiveRef.current = isConversationActive;
      }, [isConversationActive]);

  useEffect(() => {
        isVoiceToTextRef.current = isVoiceToText;
      }, [isVoiceToText]);

  useEffect(() => {
        isPausedRef.current = isPaused;
      }, [isPaused]);

  useEffect(() => {
        currentRoleRef.current = currentRole;
      }, [currentRole]);


  const addMessage = (
    role: 'CLINICIAN' | 'PATIENT',
    content: string
  ) => {
    if (!content.trim()) return;

    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role,
        content: content.trim(),
        timestamp: new Date()
      }
    ]);
  };

  const handleStartConversation = async () => {
    setIsConversationActive(true);
    setIsVoiceToText(false);
    setIsPaused(false);

    if (!isListening) {
      await toggleListening();
    }

    toast.success("Real-time conversation started");
  };

  const handleVoiceToText = async () => {
    setIsConversationActive(false);
    setIsVoiceToText(true);
    setIsPaused(false);

    if (!recognitionRef.current) {
      toast.error("Speech recognition not supported in this browser");
      return;
    }

    if (!isListening) {
      await toggleListening();
      toast.info("Voice to text active. Speak to add notes...");
    }
  };

  const handlePauseConversation = () => {
    setIsPaused(true);
    toast.info("Conversation paused");
  };

  const handleResumeConversation = () => {
    setIsPaused(false);
    toast.info("Conversation resumed");
  };

  const handleStopConversation = () => {
    if (isListening) {
      toggleListening();
    }

    setIsConversationActive(false);
    setIsVoiceToText(false);
    setIsPaused(false);

    toast.info("Conversation stopped");
  };

  const handleSendMessage = () => {
      if (!inputText.trim()) return;
      addMessage(currentRole, inputText);
      setInputText("");
    };
   
  const toggleListening = async () => {
      if (!recognitionRef.current) {
        toast.error("Speech recognition not supported");
        return;
      }

      // ---------- USER STOPS ----------
      if (isListening) {
          userStoppedRef.current = true;

          recognitionRef.current.stop();
          mediaRecorderRef.current?.stop();

          mediaRecorderRef.current?.stream
            ?.getTracks()
            .forEach(track => track.stop());

          setIsListening(false);
          return;
        }

      // ---------- USER STARTS ----------
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        recorder.onstop = async () => {
          if (!userStoppedRef.current) {
            console.warn("Recorder stopped automatically — ignoring");
            return;
          }

          userStoppedRef.current = false;

          if (audioChunksRef.current.length === 0) return;

          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });

          audioChunksRef.current = [];

          try {
            toast.info("Uploading audio to AWS HealthScribe...");

            const formData = new FormData();
            formData.append("file", audioBlob, `consult-${Date.now()}.webm`);

            const res = await fetch(`${API_BASE}/healthscribe/upload`, {
              method: "POST",
              body: formData,
            });

            const data = await res.json();
            toast.success(`HealthScribe Job Started: ${data.jobName}`);
          } catch {
            toast.error("Failed to upload audio to S3");
          }
        };

        recorder.start();

        // 🔐 START RECOGNITION ONLY ONCE
        recognitionRef.current.start();

        setIsListening(true);
      } catch {
        toast.error("Microphone access denied");
      }
    };
 
 const waitForHealthScribe = async (jobName: string) => {
    const MAX_ATTEMPTS = 60; // 5 minutes
    let attempts = 0;

    while (attempts < MAX_ATTEMPTS) {
      const res = await fetch(`${API_BASE}/healthscribe/status/${jobName}`);

      if (!res.ok) {
        throw new Error("Failed to fetch HealthScribe status");
      }

      const data = await res.json();

      if (data.status === "completed") return data.clinicalNotes;
      if (data.status === "failed") throw new Error("HealthScribe job failed");

      attempts++;
      await new Promise(r => setTimeout(r, 5000));
    }

    throw new Error("HealthScribe timed out");
  };


  const handleAnalyze = async () => {
    try {
      setIsProcessing(true);
      setAnalyzing(true);

      // 1. Determine which transcript to use
      const transcript = notesText.trim() || 
        messages.map(m => `${m.role}: ${m.content}`).join("\n");

      if (!transcript.trim()) {
        toast.error("No clinical data available for analysis.");
        return;
      }

      // 2. Call the Bedrock Agent
      const res = await fetch(`${API_BASE}/healthscribe/agent/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          patient: currentPatient ?? {},
        }),
      });

      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }

      // 3. Get the RAW AGENT OUTPUT (The JSON you saw in terminal)
      const agentResult: AgentResult = await res.json();
      console.log("Bedrock Agent Result Received:", agentResult);

      // 4. CRITICAL STEP: Use the Mapper and update the Context
      // This is what makes the cards appear in the DrRoboAssistant window
      const mappedSuggestions = mapAgentResultToSuggestions(agentResult);
      
      setAgentResult({
        diagnosisResult: agentResult, // Saves the raw data for safety checks
        icdCodes: agentResult.icd_codes ?? [], // Populates the ICD-10 list
        suggestions: mappedSuggestions, // <--- THIS TRIGGERS THE UI CARDS
      });

      toast.success("Clinical analysis complete.");

    } catch (err) {
      console.error("Analyze failed:", err);
      toast.error("Analysis failed. Please check the backend connection.");
    } finally {
      setIsProcessing(false);
      setAnalyzing(false);
    }
  };


  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Consultation Notes Panel (default view)
  if (!isConversationActive) {
    return (
      <div className="medical-card-elevated flex flex-col h-full animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-md">
              <Plus className="w-6 h-6 text-accent-foreground" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg text-foreground">Consultation Notes</h3>
              <p className="text-sm text-muted-foreground">AWS Transcribe Medical</p>
            </div>
          </div>
        </div>

        {/* Notes Text Area */}
        <div className="flex-1 py-6">
          <div className="bg-secondary/30 rounded-xl p-4 h-full min-h-[200px]">
            <textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Start recording or type consultation notes...

Click 'Voice to text' or 'Real-Time Conversation' to begin recording.
AWS Transcribe Medical will convert speech to clinical text.

Or type your notes directly here."
              className="w-full h-full bg-transparent text-foreground placeholder:text-muted-foreground resize-none focus:outline-none text-sm leading-relaxed"
            />
          </div>
        </div>
        {/* Divider */}
        <div className="border-t border-border" />

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 pb-2">
          {/* Left group - Recording options */}
          <div className="flex items-center gap-3">
            {/* Real-Time Conversation */}
            <button
              onClick={handleStartConversation}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-14 h-14 rounded-xl bg-secondary/80 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                <MessageCircle className="w-6 h-6 text-accent" />
              </div>
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors text-center leading-tight">
                Real-Time<br />Conversation
              </span>
            </button>

            {/* Voice to Text */}
            <button
              onClick={handleVoiceToText}
              className="flex flex-col items-center gap-2 group"
            >
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${
                isListening && isVoiceToText 
                  ? 'bg-accent text-accent-foreground animate-pulse' 
                  : 'bg-secondary/80 group-hover:bg-accent/20'
              }`}>
                <Mic className={`w-6 h-6 ${isListening && isVoiceToText ? 'text-accent-foreground' : 'text-accent'}`} />
              </div>
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors text-center leading-tight">
                Voice<br />to text
              </span>
            </button>
          </div>

          {/* Right group - Controls */}
          <div className="flex items-center gap-3">
            {/* Pause */}
            <button
              onClick={handlePauseConversation}
              disabled={!isListening}
              className="flex flex-col items-center gap-2 group"
            >
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${
                isListening 
                  ? 'bg-secondary/80 group-hover:bg-accent/20' 
                  : 'bg-secondary/40 cursor-not-allowed'
              }`}>
                <Pause className={`w-6 h-6 ${isListening ? 'text-accent' : 'text-muted-foreground'}`} />
              </div>
              <span className={`text-xs transition-colors text-center ${
                isListening ? 'text-muted-foreground group-hover:text-foreground' : 'text-muted-foreground/50'
              }`}>
                Pause
              </span>
            </button>

            {/* Stop */}
            <button
              onClick={handleStopConversation}
              disabled={!isListening}
              className="flex flex-col items-center gap-2 group"
            >
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${
                isListening 
                  ? 'bg-secondary/80 group-hover:bg-destructive/20' 
                  : 'bg-secondary/40 cursor-not-allowed'
              }`}>
                <Square className={`w-6 h-6 ${isListening ? 'text-foreground' : 'text-muted-foreground'}`} />
              </div>
              <span className={`text-xs transition-colors text-center ${
                isListening ? 'text-muted-foreground group-hover:text-foreground' : 'text-muted-foreground/50'
              }`}>
                Stop
              </span>
            </button>

            {/* Analyze */}
            <button
              onClick={handleAnalyze}
              disabled={(!notesText.trim() && messages.length === 0) || isProcessing || isAnalyzing}
              className="flex flex-col items-center gap-2 group"
            >
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${
                (notesText.trim() || messages.length > 0) && !isProcessing
                  ? 'bg-secondary/80 group-hover:bg-primary/20' 
                  : 'bg-secondary/40 cursor-not-allowed'
              }`}>
                {isProcessing || isAnalyzing ? (
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                ) : (
                  <Zap className={`w-6 h-6 ${(notesText.trim() || messages.length > 0) ? 'text-primary' : 'text-muted-foreground'}`} />
                )}
              </div>
              <span className={`text-xs transition-colors text-center ${
                (notesText.trim() || messages.length > 0) ? 'text-muted-foreground group-hover:text-foreground' : 'text-muted-foreground/50'
              }`}>
                Analyze
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active conversation chat interface
  return (
    <div className="medical-card-elevated flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-md">
            <MessageCircle className="w-6 h-6 text-accent-foreground" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-lg text-foreground">Conversation</h3>
            <p className="text-sm text-muted-foreground">AWS HealthScribe</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isPaused ? (
            <span className="px-3 py-1.5 bg-yellow-500/20 text-yellow-600 text-xs rounded-full font-medium">
              Paused
            </span>
          ) : (
            <span className="px-3 py-1.5 bg-green-500/20 text-green-600 text-xs rounded-full font-medium animate-pulse">
              Live
            </span>
          )}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-2 py-3 border-b border-border">
        {isPaused ? (
          <button
            onClick={handleResumeConversation}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 text-green-600 rounded-full text-xs font-medium hover:bg-green-500/30 transition-all"
          >
            <Play className="w-3 h-3" />
            Resume
          </button>
        ) : (
          <button
            onClick={handlePauseConversation}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/20 text-yellow-600 rounded-full text-xs font-medium hover:bg-yellow-500/30 transition-all"
          >
            <Pause className="w-3 h-3" />
            Pause
          </button>
        )}
        <button
          onClick={handleStopConversation}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive/20 text-destructive rounded-full text-xs font-medium hover:bg-destructive/30 transition-all"
        >
          <Square className="w-3 h-3" />
          Stop
        </button>
        <button
          onClick={handleAnalyze}
          disabled={messages.length === 0 || isProcessing || isAnalyzing}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            messages.length > 0 && !isProcessing
              ? 'bg-accent/20 text-accent hover:bg-accent/30'
              : 'bg-secondary text-muted-foreground cursor-not-allowed'
          }`}
        >
          {isProcessing || isAnalyzing ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <FileText className="w-3 h-3" />
          )}
          Analyze
        </button>
      </div>

      {/* Role Selector */}
      <div className="flex items-center gap-2 py-3 border-b border-border">
        <span className="text-xs text-muted-foreground">Speaking as:</span>
        <div className="flex gap-1">
          <button
            onClick={() => setCurrentRole('CLINICIAN')}
            disabled={isPaused}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              currentRole === 'CLINICIAN' 
                ? 'bg-accent text-accent-foreground' 
                : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
            } ${isPaused ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Stethoscope className="w-3 h-3" />
            Doctor
          </button>
          <button
            onClick={() => setCurrentRole('PATIENT')}
            disabled={isPaused}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              currentRole === 'PATIENT' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
            } ${isPaused ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <User className="w-3 h-3" />
            Patient
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 min-h-[300px] max-h-[400px]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-accent/50" />
            </div>
            <p className="text-sm text-muted-foreground">
              Start a conversation between doctor and patient
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Select your role and type or speak your message
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-2 ${
                message.role === 'CLINICIAN' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                message.role === 'CLINICIAN' 
                  ? 'bg-gradient-to-br from-accent to-primary' 
                  : 'bg-secondary'
              }`}>
                {message.role === 'CLINICIAN' ? (
                  <Stethoscope className="w-4 h-4 text-accent-foreground" />
                ) : (
                  <User className="w-4 h-4 text-muted-foreground" />
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                  message.role === 'CLINICIAN'
                    ? 'bg-accent/20 text-foreground rounded-tr-md'
                    : 'bg-secondary text-foreground rounded-tl-md'
                }`}
              >
                <p className="text-sm leading-relaxed">{message.content}</p>
                <span className="text-[10px] text-muted-foreground/70 mt-1 block">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {!isPaused && (
        <div className="pt-4 border-t border-border space-y-3">
          {/* Listening Indicator */}
          {isListening && (
            <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 rounded-lg border border-destructive/20 animate-pulse">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
              </span>
              <span className="text-xs text-destructive">
                Listening as {currentRole === 'CLINICIAN' ? 'Doctor' : 'Patient'}...
              </span>
            </div>
          )}

          {/* Input Row */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleListening}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                isListening 
                  ? 'bg-destructive text-destructive-foreground animate-pulse' 
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
              }`}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Type as ${currentRole === 'CLINICIAN' ? 'Doctor' : 'Patient'}...`}
              className="flex-1 px-4 py-2.5 bg-secondary rounded-full text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
            
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim()}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                inputText.trim() 
                  ? 'bg-accent text-accent-foreground hover:bg-accent/90' 
                  : 'bg-secondary text-muted-foreground'
              }`}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Paused State Message */}
      {isPaused && (
        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
            <Pause className="w-4 h-4" />
            <span className="text-sm">Conversation paused. Click Resume to continue.</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationChat;