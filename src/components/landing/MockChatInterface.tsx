import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Bot, AlertTriangle } from 'lucide-react';

export function MockChatInterface() {
  const [showResponse, setShowResponse] = useState(false);
  const [typingDone, setTypingDone] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => setShowResponse(true), 1000);
    const timer2 = setTimeout(() => setTypingDone(true), 2500);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Glow effect */}
      <div className="absolute -inset-4 bg-gradient-to-r from-violet-500/20 via-purple-500/20 to-blue-500/20 rounded-3xl blur-2xl" />
      
      {/* Chat container */}
      <div className="relative bg-card/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/5">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="text-xs text-muted-foreground ml-2 font-medium">ChatGPT</span>
        </div>

        {/* Chat messages */}
        <div className="p-4 space-y-4 min-h-[280px]">
          {/* User message */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-start gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white/10 rounded-2xl rounded-tl-sm px-4 py-2.5">
              <p className="text-sm text-foreground/90">
                What's the best CRM software for small businesses?
              </p>
            </div>
          </motion.div>

          {/* AI Response */}
          {showResponse && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl rounded-tl-sm px-4 py-2.5 flex-1">
                {!typingDone ? (
                  <div className="flex items-center gap-1.5 py-1">
                    <motion.span
                      className="w-2 h-2 bg-violet-400 rounded-full"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                    />
                    <motion.span
                      className="w-2 h-2 bg-violet-400 rounded-full"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                    />
                    <motion.span
                      className="w-2 h-2 bg-violet-400 rounded-full"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                    />
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-2"
                  >
                    <p className="text-sm text-foreground/90">
                      For small businesses, I recommend <span className="text-violet-400 font-semibold">HubSpot</span>, <span className="text-violet-400 font-semibold">Salesforce</span>, or <span className="text-violet-400 font-semibold">Zoho CRM</span>.
                    </p>
                    <p className="text-sm text-foreground/70">
                      These platforms offer excellent features for growing teams...
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* Warning indicator */}
          {typingDone && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-amber-300/90">
                Your brand wasn't mentioned!
              </span>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
