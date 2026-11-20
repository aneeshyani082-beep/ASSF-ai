import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight } from 'lucide-react';

interface EnteringSplashProps {
  isVisible: boolean;
  onComplete: () => void;
}

export const EnteringSplash: React.FC<EnteringSplashProps> = ({
  isVisible,
  onComplete,
}) => {
  useEffect(() => {
    if (!isVisible) return;
    const timer = setTimeout(() => {
      onComplete();
    }, 2400);
    return () => clearTimeout(timer);
  }, [isVisible, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="assf-entering-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } }}
          className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-between px-6 py-10 select-none"
          role="dialog"
          aria-label="ASSF Welcome Screen"
        >
          {/* Top spacer for vertical optical centering */}
          <div className="h-6" />

          {/* Center Entering Logo & Welcome Back Greeting */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center text-center space-y-6"
          >
            {/* Precision Silicon ASSF Emblem */}
            <div className="relative flex items-center justify-center">
              <svg
                width="96"
                height="96"
                viewBox="0 0 96 96"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                className="drop-shadow-[0_0_24px_rgba(34,211,238,0.22)]"
              >
                {/* Outer Silicon Die Frame */}
                <rect
                  x="14"
                  y="14"
                  width="68"
                  height="68"
                  rx="16"
                  fill="#020617"
                  stroke="#22d3ee"
                  strokeOpacity="0.65"
                  strokeWidth="2"
                />
                {/* Inner Core Frame */}
                <rect
                  x="23"
                  y="23"
                  width="50"
                  height="50"
                  rx="10"
                  fill="#082f49"
                  fillOpacity="0.45"
                  stroke="#38bdf8"
                  strokeOpacity="0.35"
                  strokeWidth="1.2"
                />
                {/* Silicon Pin Leads (Top, Bottom, Left, Right) */}
                <path
                  d="M34 6V14M48 6V14M62 6V14M34 82V90M48 82V90M62 82V90M6 34H14M6 48H14M6 62H14M82 34H90M82 48H90M82 62H90"
                  stroke="#22d3ee"
                  strokeOpacity="0.55"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                {/* Stylized ASSF Core Monogram */}
                <text
                  x="48"
                  y="54"
                  textAnchor="middle"
                  fill="#f8fafc"
                  fontFamily="JetBrains Mono, ui-monospace, monospace"
                  fontWeight="700"
                  fontSize="16"
                  letterSpacing="1.5"
                >
                  ASSF
                </text>
              </svg>
            </div>

            <div className="space-y-2">
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
                ASSF
              </h1>
              <p className="text-lg sm:text-xl font-medium text-cyan-300 tracking-wide">
                Welcome back
              </p>
            </div>

            <button
              type="button"
              onClick={onComplete}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-300 hover:text-cyan-300 transition-colors"
            >
              <span>Enter Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </motion.div>

          {/* Down attribution as requested */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="text-center space-y-1.5 font-mono"
          >
            <div className="text-xs sm:text-sm text-slate-300 tracking-wide">
              Created by ASSF Technology and Enterprise
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
