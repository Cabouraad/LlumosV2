import { DashboardSidebar } from "@/components/dashboard-demo/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard-demo/DashboardHeader";
import { MetricsCards } from "@/components/dashboard-demo/MetricsCards";
import { VisibilityChart } from "@/components/dashboard-demo/VisibilityChart";
import { RecentResponsesTable } from "@/components/dashboard-demo/RecentResponsesTable";

export default function DashboardDemo() {
  return (
    <div className="min-h-screen bg-background flex dark">
      <DashboardSidebar />
      
      <main className="flex-1 flex flex-col">
        <DashboardHeader />
        
        <div className="flex-1 p-6 space-y-6 overflow-auto">
          <MetricsCards />
          <VisibilityChart />
          <RecentResponsesTable />
        </div>
      </main>
    </div>
  );
}
