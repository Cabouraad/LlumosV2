import { useState } from "react";
import { DashboardSidebar } from "@/components/dashboard-demo/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard-demo/DashboardHeader";
import { MetricsCards } from "@/components/dashboard-demo/MetricsCards";
import { VisibilityChart } from "@/components/dashboard-demo/VisibilityChart";
import { RecentResponsesTable } from "@/components/dashboard-demo/RecentResponsesTable";
import { CriticalAlertModal } from "@/components/dashboard-demo/CriticalAlertModal";
import { TechnicalGuideSlideOver } from "@/components/dashboard-demo/TechnicalGuideSlideOver";

export default function DashboardDemo() {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const handleResolve = () => {
    setIsAlertOpen(false);
    setIsGuideOpen(true);
  };

  return (
    <div className="min-h-screen bg-background flex dark">
      <DashboardSidebar />
      
      <main className="flex-1 flex flex-col">
        <DashboardHeader />
        
        <div className="flex-1 p-6 space-y-6 overflow-auto">
          <MetricsCards onAlertClick={() => setIsAlertOpen(true)} />
          <VisibilityChart />
          <RecentResponsesTable />
        </div>
      </main>

      <CriticalAlertModal
        isOpen={isAlertOpen}
        onClose={() => setIsAlertOpen(false)}
        onResolve={handleResolve}
      />

      <TechnicalGuideSlideOver
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
}
