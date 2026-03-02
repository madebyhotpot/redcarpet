'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import BrandingHeader from '@/components/BrandingHeader';

interface Shot {
  id: string;
  image_url: string;
  effect_id: string;
  result_url: string | null;
  result_type: 'image' | 'video' | null;
}

interface Effect {
  id: string;
  name: string;
  preview_image_url: string;
}

export default function ShotPage({ params }: { params: Promise<{ id: string }> }) {
  const [shotId, setShotId] = useState<string | null>(null);
  const [shot, setShot] = useState<Shot | null>(null);
  const [effect, setEffect] = useState<Effect | null>(null);
  const [isReady, setIsReady] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    params.then((p) => setShotId(p.id));
  }, [params]);

  useEffect(() => {
    if (!shot?.effect_id) return;
    fetch('/api/effects')
      .then((r) => r.json())
      .then((data: { effects: Effect[] }) => {
        const found = data.effects?.find((e) => e.id === shot.effect_id);
        if (found) setEffect(found);
      })
      .catch(console.error);
  }, [shot?.effect_id]);

  useEffect(() => {
    if (!shotId) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/shots/${shotId}`);
        if (!res.ok) return;
        const data: Shot = await res.json();
        setShot(data);
        if (data.result_url) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setIsReady(true);
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
    };

    poll();
    intervalRef.current = setInterval(poll, 3000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [shotId]);

  const handleShare = async () => {
    if (!shot?.result_url) return;
    try {
      await navigator.share({
        url: shot.result_url,
        title: 'My Augmented Red Carpet Shot',
      });
    } catch {
      // Share cancelled or unavailable — silently ignore
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <BrandingHeader />

      <div className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">

          {/* ── PENDING STATE ── */}
          {!isReady && (
            <motion.div
              key="pending"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center"
            >
              {/* Thumbnails — photo (portrait, narrow) + effect (square, larger) */}
              <div className="flex items-end gap-[15px] justify-center mt-[18px]">

                {/* User photo — portrait */}
                <div className="relative rounded-[8px] overflow-hidden shadow-lg flex-none"
                  style={{ width: '27%', aspectRatio: '9/16' }}>
                  {shot?.image_url ? (
                    <img src={shot.image_url} alt="Your photo" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-white/10 animate-pulse" />
                  )}
                  <CheckBadge />
                </div>

                {/* Effect — square, larger */}
                <div className="relative rounded-[8px] overflow-hidden shadow-lg flex-none"
                  style={{ width: '47%', aspectRatio: '1/1' }}>
                  {effect ? (
                    <img src={effect.preview_image_url} alt={effect.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-white/10 animate-pulse" />
                  )}
                  <CheckBadge />
                </div>

              </div>

              {/* Generating text — 18px regular */}
              <p className="text-white text-[18px] font-normal mt-[32px]">
                Generating...
              </p>
            </motion.div>
          )}

          {/* ── DISPLAY STATE ── */}
          {isReady && shot && (
            <motion.div
              key="display"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="relative rounded-[8px] overflow-hidden shadow-2xl mx-[24px] mt-[18px]"
              style={{ aspectRatio: '9/16' }}
            >
              {shot.result_type === 'video' ? (
                <video
                  src={shot.result_url!}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={shot.result_url!}
                  alt="Your augmented shot"
                  className="w-full h-full object-cover"
                />
              )}

              {/* Share button — pinned inside media at bottom */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-[15px]">
                <button
                  onClick={handleShare}
                  className="bg-white text-black text-[12px] font-medium rounded-[90px]"
                  style={{ padding: '10px 22px' }}
                >
                  Share →
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

function CheckBadge() {
  return (
    <div className="absolute bottom-1 right-1 w-[14px] h-[14px] rounded-full bg-white flex items-center justify-center shadow">
      <svg className="w-[9px] h-[9px] text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  );
}
