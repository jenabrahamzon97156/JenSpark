"use client";

// components/dashboard/RestTimer.tsx
//
// Deliberately inline per-exercise rather than a single global modal:
// in a real session you're often supersetting or moving between exercises,
// and a full-screen timer would block you from seeing the next set's targets.

import { useEffect, useRef, useState } from "react";

const RADIUS = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function RestTimer({
  durationSeconds,
  onComplete,
}: {
  durationSeconds: number;
  onComplete: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onComplete();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progress = secondsLeft / durationSeconds;
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  const finish = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    onComplete();
  };

  const addTime = (delta: number) => setSecondsLeft((s) => Math.max(0, s + delta));

  return (
    <div className="flex items-center gap-3 rounded-lg bg-[#FFFFFF] border border-[#E5E7EB] px-3 py-2">
      <svg width="60" height="60" viewBox="0 0 60 60" className="shrink-0">
        <circle
          cx="30"
          cy="30"
          r={RADIUS}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="4"
        />
        <circle
          cx="30"
          cy="30"
          r={RADIUS}
          fill="none"
          stroke="#4C6EF5"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          transform="rotate(-90 30 30)"
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
        <text
          x="30"
          y="34"
          textAnchor="middle"
          className="font-mono"
          fontSize="13"
          fill="#1D2027"
        >
          {mins}:{secs.toString().padStart(2, "0")}
        </text>
      </svg>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-[#6B7280]">Resting before next set</span>
        <div className="flex gap-2">
          <button
            onClick={() => addTime(15)}
            className="text-xs px-2 py-1 rounded border border-[#E5E7EB] text-[#1D2027] hover:bg-[#F1F2F4]"
          >
            +15s
          </button>
          <button
            onClick={finish}
            className="text-xs px-2 py-1 rounded border border-[#E5E7EB] text-[#1D2027] hover:bg-[#F1F2F4]"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
