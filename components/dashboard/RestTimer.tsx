"use client";

// components/dashboard/RestTimer.tsx
//
// Deliberately inline per-exercise rather than a single global modal:
// in a real session you're often supersetting or moving between exercises,
// and a full-screen timer would block you from seeing the next set's targets.

import { useEffect, useRef, useState } from "react";

const RADIUS = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Short two-tone ding via the Web Audio API — no audio file to host, and it
// works offline. Vibration only actually does anything on Android Chrome;
// iOS Safari doesn't implement the Vibration API at all, so on iPhone this
// call is silently a no-op and the sound is what actually gets noticed.
function playCompletionAlert() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [880, 1175].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.001, now + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.3, now + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.18 + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.18);
      osc.stop(now + i * 0.18 + 0.3);
    });
  } catch {
    // Audio can fail to init in some contexts (e.g. autoplay policy edge
    // cases) — the visual "0:00" state still communicates completion.
  }

  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate?.([200, 100, 200]);
  }
}

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
          playCompletionAlert();
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
          stroke="#0D9488"
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
            onClick={() => addTime(-15)}
            className="text-xs px-2 py-1 rounded border border-[#E5E7EB] text-[#1D2027] hover:bg-[#F1F2F4]"
          >
            -15s
          </button>
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
