import { ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardHeader() {
  return (
    <header className="flex items-center justify-between p-6 border-b border-border">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Home</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span className="text-foreground font-medium">Dashboard</span>
      </div>
      
      <Button variant="outline" className="gap-2">
        <Calendar className="h-4 w-4" />
        Last 30 Days
        <ChevronRight className="h-4 w-4" />
      </Button>
    </header>
  );
}
