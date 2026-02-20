"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface SlideData {
  slideNumber: number;
  url: string;
  expiresIn: number;
}

interface WatermarkData {
  teacherName: string;
  employeeNumber: number;
  hash: string;
}

interface PresentationViewerProps {
  lessonId: string;
  lessonTitle: string;
  curriculumTitle: string | null;
  initialSlides: SlideData[];
  watermark: WatermarkData;
  totalSlides: number;
}

export default function PresentationViewer({
  lessonId,
  lessonTitle,
  curriculumTitle,
  initialSlides,
  watermark,
  totalSlides,
}: PresentationViewerProps) {
  const [slides, setSlides] = useState<SlideData[]>(initialSlides);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Navigation ──────────────────────────────────────────────────────
  const goToSlide = useCallback(
    (index: number) => {
      setCurrentSlide(Math.max(0, Math.min(index, slides.length - 1)));
    },
    [slides.length]
  );
  const goToPrev = useCallback(
    () => goToSlide(currentSlide - 1),
    [currentSlide, goToSlide]
  );
  const goToNext = useCallback(
    () => goToSlide(currentSlide + 1),
    [currentSlide, goToSlide]
  );

  // ── Security: log blocked actions ───────────────────────────────────
  const logAction = useCallback(
    (action: string) => {
      fetch(`/api/lessons/${lessonId}/log-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      }).catch(() => {});
    },
    [lessonId]
  );

  // ── Keyboard shortcuts + protection ─────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === "c") {
        e.preventDefault();
        logAction("copy_attempt");
      }
      if (ctrl && e.key === "s") {
        e.preventDefault();
        logAction("download_attempt");
      }
      if (ctrl && e.key === "p") {
        e.preventDefault();
        logAction("print_attempt");
      }
      if (ctrl && e.shiftKey && e.key === "S") {
        e.preventDefault();
        logAction("download_attempt");
      }
      if (e.key === "PrintScreen") {
        e.preventDefault();
        logAction("screenshot_attempt");
      }
      if (ctrl && e.shiftKey && e.key === "I") e.preventDefault();
      if (e.key === "F12") e.preventDefault();

      if (e.key === "ArrowLeft") goToPrev();
      if (e.key === "ArrowRight") goToNext();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [goToPrev, goToNext, logAction]);

  // ── Block printing ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => logAction("print_attempt");
    window.addEventListener("beforeprint", handler);
    return () => window.removeEventListener("beforeprint", handler);
  }, [logAction]);

  // ── Fullscreen ──────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(async () => {
    if (!viewerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await viewerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {}
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // ── Auto-refresh signed URLs ────────────────────────────────────────
  const refreshUrls = useCallback(async () => {
    try {
      const res = await fetch(`/api/lessons/${lessonId}/slides/refresh`, {
        method: "POST",
      });
      if (res.status === 403) {
        window.location.href = "/lessons?error=access_revoked";
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.slides)) {
        setSlides(data.slides);
      }
    } catch {}
  }, [lessonId]);

  useEffect(() => {
    const expiresIn = initialSlides[0]?.expiresIn ?? 300;
    const intervalMs = Math.max((expiresIn - 30) * 1000, 60_000);
    refreshTimerRef.current = setInterval(refreshUrls, intervalMs);
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [refreshUrls, initialSlides]);

  // ── Render ──────────────────────────────────────────────────────────
  const slide = slides[currentSlide];

  return (
    <div
      ref={viewerRef}
      role="region"
      aria-label={`Presentation viewer: ${lessonTitle}`}
      className={`relative flex flex-col ${
        isFullscreen
          ? "h-screen bg-[#0f172a]"
          : "rounded-xl border border-gray-700 bg-[#0f172a]"
      }`}
      style={{
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        logAction("copy_attempt");
      }}
    >
      {/* Print blocker */}
      <style>{`@media print { body { display: none !important; } }`}</style>

      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            {lessonTitle}
          </p>
          {curriculumTitle && (
            <p className="truncate text-xs text-gray-400">
              {curriculumTitle}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={toggleFullscreen}
          className="ml-4 rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? (
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
              />
            </svg>
          ) : (
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
              />
            </svg>
          )}
        </button>
      </div>

      {/* ── Slide area ──────────────────────────────────────────── */}
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-4"
        style={{ minHeight: isFullscreen ? 0 : "50vh" }}
      >
        {slide && (
          <>
            {/* The image wrapper has pointer events so it can catch navigation clicks;
                the <img> itself has pointer-events:none to block right-click → Save Image */}
            <img
              src={slide.url}
              alt={`Slide ${slide.slideNumber}`}
              className={`w-full object-contain ${
                isFullscreen ? "max-h-[calc(100vh-10rem)]" : "max-h-[70vh]"
              }`}
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              onContextMenu={(e) => e.preventDefault()}
              style={
                {
                  pointerEvents: "none",
                  WebkitUserDrag: "none",
                  userSelect: "none",
                } as React.CSSProperties
              }
              loading="eager"
            />

            {/* Watermark overlay — repeating diagonal grid */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
                overflow: "hidden",
                zIndex: 10,
              }}
            >
              <div
                style={{
                  transform: "rotate(-30deg)",
                  opacity: 0.05,
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "#fff",
                  whiteSpace: "nowrap",
                  display: "flex",
                  flexDirection: "column",
                  gap: "60px",
                }}
              >
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} style={{ display: "flex", gap: "80px" }}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <span key={j}>
                        {watermark.teacherName} · #{watermark.employeeNumber}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {!slide && (
          <p className="text-sm text-gray-500">No slides available.</p>
        )}
      </div>

      {/* ── Bottom navigation bar ───────────────────────────────── */}
      <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
        <button
          type="button"
          onClick={goToPrev}
          disabled={currentSlide === 0}
          aria-label="Previous slide"
          className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          ← Previous
        </button>

        <span className="text-sm text-gray-300" aria-live="polite" aria-atomic="true">
          Slide <span className="font-semibold text-white">{currentSlide + 1}</span> of {totalSlides}
        </span>

        <button
          type="button"
          onClick={goToNext}
          disabled={currentSlide === slides.length - 1}
          aria-label="Next slide"
          className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          Next →
        </button>
      </div>

      {/* ── Thumbnail strip ─────────────────────────────────────── */}
      <div className="flex gap-1.5 overflow-x-auto border-t border-white/10 px-4 py-2">
        {slides.map((s, i) => (
          <button
            key={s.slideNumber}
            type="button"
            onClick={() => goToSlide(i)}
            aria-label={`Go to slide ${s.slideNumber}`}
            aria-current={i === currentSlide ? "true" : undefined}
            className={`flex-shrink-0 overflow-hidden rounded-md border-2 transition-all ${
              i === currentSlide
                ? "border-[var(--stemania-teal)] shadow-md shadow-[var(--stemania-teal)]/20"
                : "border-transparent opacity-70 hover:border-white/30 hover:opacity-100"
            }`}
          >
            <img
              src={s.url}
              alt={`Slide ${s.slideNumber}`}
              className="h-14 w-20 object-contain bg-gray-800"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
              style={{ pointerEvents: "none" } as React.CSSProperties}
              loading="lazy"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
