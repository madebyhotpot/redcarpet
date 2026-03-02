"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Webcam from "react-webcam";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";
import BrandingHeader from "@/components/BrandingHeader";

type PageState = "camera" | "accept-reject" | "select-effect";

interface Effect {
  id: string;
  name: string;
  preview_image_url: string;
}

export default function NewShotPage() {
  const router = useRouter();
  const webcamRef = useRef<Webcam>(null);

  const [pageState, setPageState] = useState<PageState>("camera");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [effects, setEffects] = useState<Effect[]>([]);
  const [selectedEffectIndex, setSelectedEffectIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: "center",
    skipSnaps: false,
  });

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () =>
      setSelectedEffectIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  useEffect(() => {
    fetch("/api/effects")
      .then((r) => r.json())
      .then((data) => setEffects(data.effects ?? []))
      .catch(console.error);
  }, []);

  const handleCapture = useCallback(() => {
    const screenshot = webcamRef.current?.getScreenshot();
    if (screenshot) {
      setCapturedImage(screenshot);
      setPageState("accept-reject");
    }
  }, []);

  const handleRetry = () => {
    setCapturedImage(null);
    setPageState("camera");
  };

  const handleAccept = () => {
    setPageState("select-effect");
  };

  const handleChooseEffect = async () => {
    if (!capturedImage || isSubmitting) return;
    const effect = effects[selectedEffectIndex];
    if (!effect) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(capturedImage);
      const blob = await res.blob();
      const formData = new FormData();
      formData.append("file", blob, "selfie.jpg");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const { image_url } = await uploadRes.json();

      const shotRes = await fetch("/api/shots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url, effect_id: effect.id }),
      });
      const { id } = await shotRes.json();

      router.push(`/shot/${id}`);
    } catch (err) {
      console.error("Submission error:", err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <BrandingHeader />

      <div className="flex-1 flex flex-col pb-6">
        <LayoutGroup>
          {/* ── CAMERA / ACCEPT-REJECT STATE ── */}
          {/* mode="popLayout" pops the exiting element out of the layout flow
              immediately, preventing the "shifts down then animates" jank.
              The photo (layoutId) then animates smoothly to the thumbnail
              position in select-effect while the controls fade away. */}
          <AnimatePresence mode="popLayout">
            {(pageState === "camera" || pageState === "accept-reject") && (
              <motion.div
                key="camera-container"
                className="relative mx-[25px] mt-[18px]"
                style={{ aspectRatio: "9/16" }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
              >
                {/* layoutId is on the photo-only element — controls are outside
                    so they don't travel with the photo during the layout animation */}
                <motion.div
                  layoutId="photo"
                  className="absolute inset-0 rounded-[8px] overflow-hidden bg-black"
                >
                  {pageState === "camera" ? (
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{ facingMode }}
                      className="w-full h-full object-cover"
                      mirrored={facingMode === "user"}
                    />
                  ) : (
                    <img
                      src={capturedImage!}
                      alt="Captured"
                      className="w-full h-full object-cover"
                    />
                  )}
                </motion.div>

                {/* Controls bar — outside layoutId so buttons fade with the
                    container rather than shrinking into the thumbnail */}
                <div className="absolute bottom-0 left-0 right-0 h-[79px] bg-black/25 z-10">
                  {pageState === "camera" ? (
                    <>
                      {/* Capture button — large solid white circle, centered */}
                      <button
                        onClick={handleCapture}
                        aria-label="Capture photo"
                        className="absolute w-[50px] h-[50px] rounded-full bg-white shadow-lg"
                        style={{
                          left: "50%",
                          top: "50%",
                          transform: "translate(-50%, -50%)",
                        }}
                      />
                      {/* Switch camera button — icon only, no background */}
                      <button
                        onClick={() =>
                          setFacingMode((m) =>
                            m === "user" ? "environment" : "user",
                          )
                        }
                        aria-label="Switch camera"
                        className="absolute flex items-center justify-center"
                        style={{
                          left: "70%",
                          top: "50%",
                          transform: "translate(-50%, -50%)",
                        }}
                      >
                        <svg
                          className="w-6 h-6 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                          />
                        </svg>
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Retry — white circle, vertically centered */}
                      <button
                        onClick={handleRetry}
                        aria-label="Retry"
                        className="absolute w-[50px] h-[50px] rounded-full bg-white shadow flex items-center justify-center"
                        style={{
                          left: "35%",
                          top: "50%",
                          transform: "translate(-50%, -50%)",
                        }}
                      >
                        <svg
                          className="w-5 h-5 text-black"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 10h10a8 8 0 018 8v2M3 10l4-4m-4 4l4 4"
                          />
                        </svg>
                      </button>
                      {/* Accept — white circle, vertically centered */}
                      <button
                        onClick={handleAccept}
                        aria-label="Accept"
                        className="absolute w-[50px] h-[50px] rounded-full bg-white shadow-lg flex items-center justify-center"
                        style={{
                          left: "65%",
                          top: "50%",
                          transform: "translate(-50%, -50%)",
                        }}
                      >
                        <svg
                          className="w-5 h-5 text-black"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── SELECT EFFECT STATE ── */}
          <AnimatePresence>
            {pageState === "select-effect" && (
              <motion.div key="select-effect" className="flex flex-col">
                {/* Accepted photo thumbnail — layoutId matches the camera photo,
                    Framer Motion animates it from the large position to here */}
                <div className="flex justify-center mt-[18px]">
                  <motion.div
                    layoutId="photo"
                    className="relative rounded-[8px] overflow-hidden shadow-lg"
                    style={{ width: "27%", aspectRatio: "9/16" }}
                  >
                    <img
                      src={capturedImage!}
                      alt="Your photo"
                      className="w-full h-full object-cover"
                    />
                    {/* Checkmark badge */}
                    <div className="absolute bottom-1 right-1 w-[14px] h-[14px] rounded-full bg-white flex items-center justify-center shadow">
                      <svg
                        className="w-[9px] h-[9px] text-black"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  </motion.div>
                </div>

                {/* Effects carousel — slides up from below */}
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                >
                  <div className="overflow-hidden mt-[19px]" ref={emblaRef}>
                    <div className="flex gap-[8px]">
                      {effects.map((effect, i) => (
                        <div
                          key={effect.id}
                          className="relative flex-none"
                          style={{ width: "65%" }}
                        >
                          <motion.div
                            className="relative rounded-[8px] overflow-hidden"
                            animate={{
                              scale: i === selectedEffectIndex ? 1 : 0.93,
                              opacity: i === selectedEffectIndex ? 1 : 0.5,
                            }}
                            transition={{ duration: 0.2 }}
                            style={{ aspectRatio: "1/1" }}
                          >
                            <img
                              src={effect.preview_image_url}
                              alt={effect.name}
                              className="w-full h-full object-cover"
                            />

                            {i === selectedEffectIndex && (
                              <div className="absolute inset-0 flex items-end justify-center pb-[15px]">
                                <button
                                  onClick={handleChooseEffect}
                                  disabled={isSubmitting}
                                  className="bg-white text-black text-[12px] font-medium rounded-[90px] disabled:opacity-60"
                                  style={{ padding: "10px 22px" }}
                                >
                                  {isSubmitting
                                    ? "Submitting…"
                                    : "Choose Effect →"}
                                </button>
                              </div>
                            )}
                          </motion.div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </LayoutGroup>
      </div>
    </div>
  );
}
