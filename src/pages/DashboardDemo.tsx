import { useState } from "react";
import { DashboardSidebar } from "@/components/dashboard-demo/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard-demo/DashboardHeader";
import { MetricsCards } from "@/components/dashboard-demo/MetricsCards";
import { VisibilityChart } from "@/components/dashboard-demo/VisibilityChart";
import { RecentResponsesTable } from "@/components/dashboard-demo/RecentResponsesTable";
import { CriticalAlertModal } from "@/components/dashboard-demo/CriticalAlertModal";
import { TechnicalGuideSlideOver } from "@/components/dashboard-demo/TechnicalGuideSlideOver";
import { Badge } from "@/components/ui/badge";

export default function DashboardDemo() {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const handleResolve = () => {
    setIsAlertOpen(false);
    setIsGuideOpen(true);
  };

  const handleHallucinationClick = () => {
    setIsAlertOpen(true);
  };

  return (
    <div className="min-h-screen bg-background flex dark">
      <DashboardSidebar />
      
      <main className="flex-1 flex flex-col">
        <DashboardHeader />
        
        {/* Demo Mode Banner */}
        <div className="mx-6 mt-4 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge className="bg-violet-500 text-white">Demo Mode</Badge>
            <span className="text-sm text-violet-200">
              Viewing sample data for "Llumos" brand analysis
            </span>
          </div>
        </div>
        
        <div className="flex-1 p-6 space-y-6 overflow-auto">
          <MetricsCards onAlertClick={() => setIsAlertOpen(true)} />
          <VisibilityChart />
          <RecentResponsesTable onHallucinationClick={handleHallucinationClick} />
        </div>
      </main>

      <CriticalAlertModal
        isOpen={isAlertOpen}
        onClose={() => setIsAlertOpen(false)}
        onResolve={handleResolve}
        query="Llumos pricing cost"
        aiClaimed="$99/mo"
        actualData="$29/mo"
        source="Claude 3.5 Sonnet"
        recommendation="Update pricing schema on /pricing page with correct JSON-LD markup."
      />

      <TechnicalGuideSlideOver
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
}
