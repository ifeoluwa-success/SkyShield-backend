import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface StressHUDProps {
  timeRemaining: number | null;
  phaseTimeLimit: number;
  isEscalated: boolean;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export const StressHUD: React.FC<StressHUDProps> = ({ timeRemaining, phaseTimeLimit, isEscalated }) => {
  const stress = useMemo(() => {
    if (timeRemaining == null || phaseTimeLimit <= 0) return 0;
    return clamp01(1 - timeRemaining / phaseTimeLimit);
  }, [timeRemaining, phaseTimeLimit]);

  const [flash, setFlash] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const heartbeatTimerRef = useRef<number | null>(null);

  const clearHeartbeatTimer = () => {
    if (heartbeatTimerRef.current) {
      window.clearTimeout(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  };

  const ensureAudioContext = useCallback(() => {
    if (audioCtxRef.current) return audioCtxRef.current;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    audioCtxRef.current = new Ctx();
    return audioCtxRef.current;
  }, []);

  const playHeartbeat = useCallback(
    (gainValue: number) => {
      const ctx = ensureAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') void ctx.resume();

      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(gainValue, now + 0.01);
      gain.gain.linearRampToValueAtTime(0, now + 0.25);
      gain.connect(ctx.destination);

      const beep = (start: number, duration: number, freq: number) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        osc.connect(gain);
        osc.start(start);
        osc.stop(start + duration);
      };

      beep(now, 0.06, 120);
      beep(now + 0.16, 0.06, 100);
    },
    [ensureAudioContext],
  );

  const intervalMs = useMemo(() => {
    if (stress < 0.5) return null;
    if (stress < 0.7) return 4000;
    if (stress < 0.9) return 2000;
    return 1000;
  }, [stress]);

  useEffect(() => {
    if (!isEscalated) return;
    const start = window.requestAnimationFrame(() => setFlash(true));
    const t = window.setTimeout(() => setFlash(false), 1000);
    return () => {
      window.cancelAnimationFrame(start);
      window.clearTimeout(t);
    };
  }, [isEscalated]);

  useEffect(() => {
    if (!audioUnlocked) return;
    if (intervalMs == null) {
      clearHeartbeatTimer();
      return;
    }

    const schedule = () => {
      const vol = clamp01(stress) * 0.3;
      playHeartbeat(vol);
      heartbeatTimerRef.current = window.setTimeout(schedule, intervalMs);
    };

    clearHeartbeatTimer();
    heartbeatTimerRef.current = window.setTimeout(schedule, 0);
    return () => clearHeartbeatTimer();
  }, [audioUnlocked, intervalMs, playHeartbeat, stress]);

  useEffect(() => {
    const unlock = () => {
      setAudioUnlocked(true);
      const ctx = ensureAudioContext();
      if (ctx && ctx.state === 'suspended') void ctx.resume();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };

    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      clearHeartbeatTimer();
      if (audioCtxRef.current) {
        try {
          void audioCtxRef.current.close();
        } catch {
          // ignore
        }
        audioCtxRef.current = null;
      }
    };
  }, [ensureAudioContext]);

  const level = stress;
  const showVignette = level >= 0.4;
  const pulseSlow = level >= 0.6 && level < 0.8;
  const pulseFast = level >= 0.8;
  const shake = level >= 0.8;

  const opacity = level < 0.4 ? 0 : level < 0.6 ? 0.18 : level < 0.8 ? 0.3 : 0.45;

  return (
    <div className="fixed inset-0 z-30 pointer-events-none">
      <div
        className={[
          'absolute inset-0',
          showVignette ? '' : 'opacity-0',
          pulseSlow ? 'animate-[stressPulseSlow_2.2s_ease-in-out_infinite]' : '',
          pulseFast ? 'animate-[stressPulseFast_1.1s_ease-in-out_infinite]' : '',
          shake ? 'animate-[stressShake_0.35s_ease-in-out_infinite]' : '',
        ].join(' ')}
        style={{
          boxShadow: `inset 0 0 0 9999px rgba(239, 68, 68, ${opacity})`,
          maskImage: 'radial-gradient(circle at center, transparent 55%, black 85%)',
          WebkitMaskImage: 'radial-gradient(circle at center, transparent 55%, black 85%)',
        }}
      />

      {flash && (
        <div
          className="absolute inset-0 animate-[stressFlash_1s_ease-out]"
          style={{ boxShadow: 'inset 0 0 0 3px #ef4444' }}
        />
      )}

      <style>{`
        @keyframes stressPulseSlow {
          0%, 100% { opacity: 0.85; }
          50% { opacity: 1; }
        }
        @keyframes stressPulseFast {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        @keyframes stressShake {
          0% { transform: translate(0,0); }
          25% { transform: translate(1px,-1px); }
          50% { transform: translate(-1px,1px); }
          75% { transform: translate(1px,1px); }
          100% { transform: translate(0,0); }
        }
        @keyframes stressFlash {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

