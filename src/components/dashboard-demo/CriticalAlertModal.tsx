import { AlertTriangle, X, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CriticalAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResolve: () => void;
  query?: string;
  aiClaimed?: string;
  actualData?: string;
  source?: string;
  recommendation?: string;
}

export function CriticalAlertModal({
  isOpen,
  onClose,
  onResolve,
  query = "How much is Llumos?",
  aiClaimed = "$99/mo",
  actualData = "$29/mo",
  source = "ChatGPT-4o",
  recommendation = "Update pricing schema on /pricing page.",
}: CriticalAlertModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-[#0f1419] border border-red-500/50 rounded-xl shadow-2xl shadow-red-500/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <h2 className="text-lg font-semibold text-white">Hallucination Detected</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Query Section */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              The Query
            </span>
            <p className="text-white">
              User asked: <span className="font-medium">"{query}"</span>
            </p>
          </div>

          {/* Comparison Section */}
          <div className="grid grid-cols-2 gap-4">
            {/* AI Claimed */}
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <span className="text-xs font-medium text-red-400 uppercase tracking-wider">
                AI Claimed
              </span>
              <p className="mt-2 text-2xl font-bold text-red-400 line-through decoration-2">
                {aiClaimed}
              </p>
            </div>

            {/* Actual Data */}
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <span className="text-xs font-medium text-green-400 uppercase tracking-wider">
                Actual Data
              </span>
              <p className="mt-2 text-2xl font-bold text-green-400">
                {actualData}
              </p>
            </div>
          </div>

          {/* Source Section */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Source:
            </span>
            <Badge variant="outline" className="font-mono text-xs bg-white/5 border-white/10">
              {source}
            </Badge>
          </div>

          {/* Recommendation */}
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">
                  Recommended Action
                </span>
                <p className="mt-1 text-sm text-white/90">
                  {recommendation}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 bg-white/[0.02]">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="border-white/20 text-white/70 hover:text-white hover:bg-white/10"
          >
            Dismiss
          </Button>
          <Button 
            onClick={onResolve}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            Mark Resolved
          </Button>
        </div>
      </div>
    </div>
  );
}
