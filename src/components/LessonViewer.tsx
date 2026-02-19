"use client";

import { useCallback, useEffect, useRef } from "react";

interface LessonMeta {
  title: string;
  curriculumTitle?: string | null;
  duration?: number | null;
}

interface LessonViewerProps {
  lessonId: string;
  renderedHtml: string;
  lessonMeta: LessonMeta;
}

function logBlockedAction(lessonId: string, action: string) {
  fetch(`/api/lessons/${lessonId}/log-action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  }).catch(() => {});
}

export default function LessonViewer({ lessonId, renderedHtml, lessonMeta }: LessonViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      logBlockedAction(lessonId, "copy_attempt");
    },
    [lessonId]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && (e.key === "c" || e.key === "p" || e.key === "s" || e.key === "a" || e.key === "u")) {
        e.preventDefault();
        if (e.key === "p") logBlockedAction(lessonId, "print_attempt");
        else logBlockedAction(lessonId, "copy_attempt");
      }
    },
    [lessonId]
  );

  const handleBeforePrint = useCallback(
    (e: Event) => {
      e.preventDefault();
      logBlockedAction(lessonId, "print_attempt");
    },
    [lessonId]
  );

  useEffect(() => {
    window.addEventListener("beforeprint", handleBeforePrint);
    return () => window.removeEventListener("beforeprint", handleBeforePrint);
  }, [handleBeforePrint]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          {lessonMeta.title}
        </h1>
        {lessonMeta.curriculumTitle && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {lessonMeta.curriculumTitle}
          </p>
        )}
        {lessonMeta.duration != null && (
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Estimated duration: {lessonMeta.duration} min
          </p>
        )}
      </header>

      <div
        ref={containerRef}
        className="lesson-viewer-content mx-auto max-w-3xl px-6 py-8"
        style={{
          userSelect: "none",
          WebkitUserSelect: "none",
          MozUserSelect: "none",
          msUserSelect: "none",
        }}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        suppressContentEditableWarning
      >
        <div
          className="prose prose-neutral max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
          style={{
            userSelect: "none",
            WebkitUserSelect: "none",
          }}
        />
      </div>
    </div>
  );
}
