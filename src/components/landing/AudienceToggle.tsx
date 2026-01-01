import { motion } from "framer-motion";

export type AudienceType = "marketing" | "agency";

interface AudienceToggleProps {
  audience: AudienceType;
  onChange: (audience: AudienceType) => void;
}

export function AudienceToggle({ audience, onChange }: AudienceToggleProps) {
  return (
    <div className="inline-flex items-center p-1 rounded-full bg-white/5 border border-white/10">
      <button
        onClick={() => onChange("marketing")}
        className={`relative px-4 py-2 text-sm font-medium rounded-full transition-colors ${
          audience === "marketing" ? "text-white" : "text-muted-foreground hover:text-foreground/80"
        }`}
      >
        {audience === "marketing" && (
          <motion.div
            layoutId="audience-toggle-bg"
            className="absolute inset-0 bg-gradient-to-r from-violet-600 to-blue-600 rounded-full"
            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
          />
        )}
        <span className="relative z-10">For Marketing Teams</span>
      </button>
      <button
        onClick={() => onChange("agency")}
        className={`relative px-4 py-2 text-sm font-medium rounded-full transition-colors ${
          audience === "agency" ? "text-white" : "text-muted-foreground hover:text-foreground/80"
        }`}
      >
        {audience === "agency" && (
          <motion.div
            layoutId="audience-toggle-bg"
            className="absolute inset-0 bg-gradient-to-r from-violet-600 to-blue-600 rounded-full"
            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
          />
        )}
        <span className="relative z-10">For Agencies & Consultants</span>
      </button>
    </div>
  );
}
