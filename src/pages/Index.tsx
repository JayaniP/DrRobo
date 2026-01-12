import Sidebar from "@/components/Sidebar";
import ConversationChat from "@/components/ConversationChat";
import DrRoboAssistant from "@/components/DrRoboAssistant";
import { ClinicalProvider } from "@/context/ClinicalContext";

const Index = () => {
  return (
    <ClinicalProvider>
      <div className="flex min-h-screen bg-background">
        {/* Sidebar Navigation */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          {/* Header */}
          <header className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-2xl font-bold text-foreground">
                  Intelligent Assist Clinical Dashboard
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  AI-powered diagnostic support • NICE Guidelines • Digital Twin Platform
                </p>
              </div>
            </div>
          </header>

          {/* Dashboard Grid */}
          <div className="grid grid-cols-12 gap-6">
            {/* Left Column - Conversation Chat */}
            <div className="col-span-12 lg:col-span-6">
              <ConversationChat />
            </div>

            {/* Right Column - Dr. Robo Assistant */}
            <div className="col-span-12 lg:col-span-6">
              <DrRoboAssistant />
            </div>
          </div>

          {/* Footer Info */}
          <footer className="mt-8 pt-6 border-t border-border">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span className="font-semibold text-foreground">Dr. Robo IA Platform</span>
                <span>•</span>
                <span>Powered by AWS Bedrock + Comprehend Medical</span>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </ClinicalProvider>
  );
};

export default Index;
