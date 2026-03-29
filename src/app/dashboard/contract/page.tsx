"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";

interface FieldSchema {
  id: string;
  type: "signature" | "date" | "text" | "initials" | "checkbox";
  label: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
  assignee: "contractor" | "admin";
  fontSize?: number;
}

interface ContractData {
  id: string;
  status: string;
  pdfUrl: string;
  needsContractorSignature: boolean;
  templateType: string;
  fieldSchema: FieldSchema[];
}

export default function ContractPage() {
  const [contract, setContract] = useState<ContractData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);

  // Legacy template state
  const [signatureMethod, setSignatureMethod] = useState<"typed" | "draw">("typed");
  const [signatureText, setSignatureText] = useState("");
  const legacyCanvasRef = useRef<HTMLCanvasElement>(null);
  const legacyDrawingRef = useRef<Record<string, boolean>>({});

  // Custom template state
  const [fieldValues, setFieldValues] = useState<Record<string, string | boolean>>({});
  const fieldCanvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});
  const fieldDrawingRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/teacher/contract")
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "No contract found. Your admin will send this when ready." : "Failed to load contract.");
        return res.json();
      })
      .then((data: ContractData) => {
        setContract(data);
        const defaults: Record<string, string | boolean> = {};
        for (const field of data.fieldSchema) {
          if (field.type === "checkbox") defaults[field.id] = false;
          else if (field.type === "date") defaults[field.id] = new Date().toISOString().split("T")[0];
          else if (field.type !== "signature" && field.type !== "initials") defaults[field.id] = "";
        }
        setFieldValues(defaults);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Set up legacy canvas drawing
  useEffect(() => {
    const canvas = legacyCanvasRef.current;
    if (!canvas || signatureMethod !== "draw") return;
    return initCanvas(canvas, legacyDrawingRef, "legacy");
  }, [signatureMethod, contract]);

  const setupFieldCanvas = useCallback((canvas: HTMLCanvasElement | null, fieldId: string) => {
    fieldCanvasRefs.current[fieldId] = canvas;
    if (!canvas) return;
    initCanvas(canvas, fieldDrawingRef, fieldId);
  }, []);

  const clearFieldCanvas = (fieldId: string) => {
    const canvas = fieldCanvasRefs.current[fieldId];
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const updateField = (id: string, value: string | boolean) => {
    setFieldValues((prev) => {
      const updated = { ...prev, [id]: value };
      if (contract) {
        const changedField = contract.fieldSchema.find((f) => f.id === id);
        if (changedField) {
          for (const f of contract.fieldSchema) {
            if (f.id !== id && f.label === changedField.label && f.type === changedField.type) {
              updated[f.id] = value;
            }
          }
        }
      }
      return updated;
    });
  };

  const isLegacy = !contract?.fieldSchema.length;

  const canSubmit = (): boolean => {
    if (!contract) return false;
    if (isLegacy) {
      return signatureMethod === "typed" ? !!signatureText.trim() : true;
    }
    for (const field of contract.fieldSchema) {
      if (!field.required) continue;
      if (field.type === "signature" || field.type === "initials") {
        const canvas = fieldCanvasRefs.current[field.id];
        if (!canvas) return false;
        const ctx = canvas.getContext("2d");
        if (!ctx) return false;
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        if (!img.data.some((v, i) => i % 4 === 3 && v > 0)) return false;
      } else if (field.type === "checkbox") {
        if (!fieldValues[field.id]) return false;
      } else {
        const val = fieldValues[field.id];
        if (!val || (typeof val === "string" && !val.trim())) return false;
      }
    }
    return true;
  };

  const handleSign = async () => {
    if (!contract) return;

    let payload: Record<string, unknown>;

    if (isLegacy) {
      payload = { signatureMethod };
      if (signatureMethod === "typed") {
        if (!signatureText.trim()) return;
        payload.signatureText = signatureText.trim();
      } else {
        const canvas = legacyCanvasRef.current;
        if (!canvas) return;
        payload.signatureBase64 = canvas.toDataURL("image/png");
      }
    } else {
      // Custom template: collect all field data
      const signatures: Record<string, { signatureBase64: string }> = {};
      let primarySigBase64: string | null = null;

      for (const field of contract.fieldSchema) {
        if (field.type === "signature" || field.type === "initials") {
          const canvas = fieldCanvasRefs.current[field.id];
          if (canvas) {
            const data = canvas.toDataURL("image/png");
            signatures[field.id] = { signatureBase64: data };
            if (!primarySigBase64 && field.type === "signature") {
              primarySigBase64 = data;
            }
          }
        }
      }

      const nonSigValues: Record<string, string | boolean> = {};
      for (const field of contract.fieldSchema) {
        if (field.type !== "signature" && field.type !== "initials") {
          nonSigValues[field.id] = fieldValues[field.id];
        }
      }

      payload = {
        signatureMethod: "draw",
        signatureBase64: primarySigBase64,
        fieldValues: nonSigValues,
        signatures,
      };
    }

    setSigning(true);
    setError(null);
    try {
      const res = await fetch("/api/teacher/contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to sign contract");
      }
      setSigned(true);
      setContract((prev) => prev ? { ...prev, needsContractorSignature: false, status: "signed" } : prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign contract");
    } finally {
      setSigning(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-stemania-teal-600 hover:underline dark:text-stemania-teal-400"
        >
          &larr; Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Teaching Contract
        </h1>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-stemania-teal-500 border-t-transparent" />
        </div>
      )}

      {error && !contract && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-950">
          <p className="text-red-700 dark:text-red-300">{error}</p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block text-sm font-medium text-stemania-teal-600 hover:underline dark:text-stemania-teal-400"
          >
            Return to Dashboard
          </Link>
        </div>
      )}

      {contract && (
        <>
          {signed && (
            <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950">
              <p className="font-medium text-emerald-700 dark:text-emerald-300">
                Contract signed successfully! Your admin will countersign to complete the process.
              </p>
            </div>
          )}

          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <iframe
              src={contract.pdfUrl}
              title="Teaching Contract"
              className="h-[70vh] w-full"
            />
          </div>

          {contract.needsContractorSignature && !signed && (
            <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
                {isLegacy ? "Sign Your Contract" : "Complete & Sign Your Contract"}
              </h2>

              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                  {error}
                </div>
              )}

              {/* Custom template fields */}
              {!isLegacy && (
                <div className="mb-6 space-y-4">
                  {contract.fieldSchema.map((field) => (
                    <ContractField
                      key={field.id}
                      field={field}
                      value={fieldValues[field.id]}
                      onChange={(val) => updateField(field.id, val)}
                      onCanvasRef={(canvas) => setupFieldCanvas(canvas, field.id)}
                      onClear={() => clearFieldCanvas(field.id)}
                    />
                  ))}
                </div>
              )}

              {/* Legacy template: typed/drawn toggle */}
              {isLegacy && (
                <>
                  <div className="mb-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSignatureMethod("typed")}
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        signatureMethod === "typed"
                          ? "bg-stemania-teal-500 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                    >
                      Type Signature
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignatureMethod("draw")}
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        signatureMethod === "draw"
                          ? "bg-stemania-teal-500 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                    >
                      Draw Signature
                    </button>
                  </div>

                  {signatureMethod === "typed" ? (
                    <div className="mb-4">
                      <label htmlFor="signature-text" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Type your full legal name
                      </label>
                      <input
                        id="signature-text"
                        type="text"
                        value={signatureText}
                        onChange={(e) => setSignatureText(e.target.value)}
                        placeholder="Your full legal name"
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 font-serif text-lg italic text-gray-900 focus:border-stemania-teal-500 focus:outline-none focus:ring-1 focus:ring-stemania-teal-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  ) : (
                    <div className="mb-4">
                      <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Draw your signature below
                      </p>
                      <div className="relative">
                        <canvas
                          ref={legacyCanvasRef}
                          className="h-32 w-full cursor-crosshair rounded-lg border border-gray-300 bg-white dark:border-gray-600"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const canvas = legacyCanvasRef.current;
                            if (!canvas) return;
                            const ctx = canvas.getContext("2d");
                            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
                          }}
                          className="absolute right-2 top-2 rounded bg-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              <button
                type="button"
                onClick={handleSign}
                disabled={signing || !canSubmit()}
                className="rounded-lg bg-stemania-teal-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stemania-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {signing ? "Signing..." : "Sign Contract"}
              </button>
            </div>
          )}

          {!contract.needsContractorSignature && !signed && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                You have already signed this contract. Waiting for admin countersignature.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ContractField({
  field,
  value,
  onChange,
  onCanvasRef,
  onClear,
}: {
  field: FieldSchema;
  value: string | boolean | undefined;
  onChange: (val: string | boolean) => void;
  onCanvasRef: (canvas: HTMLCanvasElement | null) => void;
  onClear: () => void;
}) {
  if (field.type === "signature" || field.type === "initials") {
    return (
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {field.label} {field.required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <canvas
            ref={onCanvasRef}
            className={`w-full cursor-crosshair rounded-lg border border-gray-300 bg-white dark:border-gray-600 ${
              field.type === "initials" ? "h-20" : "h-32"
            }`}
          />
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2 top-2 rounded bg-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300"
          >
            Clear
          </button>
        </div>
      </div>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-stemania-teal-500 focus:ring-stemania-teal-500"
        />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {field.label} {field.required && <span className="text-red-500">*</span>}
        </span>
      </label>
    );
  }

  if (field.type === "date") {
    return (
      <div>
        <label htmlFor={`field-${field.id}`} className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {field.label} {field.required && <span className="text-red-500">*</span>}
        </label>
        <input
          id={`field-${field.id}`}
          type="date"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-stemania-teal-500 focus:outline-none focus:ring-1 focus:ring-stemania-teal-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
      </div>
    );
  }

  return (
    <div>
      <label htmlFor={`field-${field.id}`} className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {field.label} {field.required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={`field-${field.id}`}
        type="text"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.label}
        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-stemania-teal-500 focus:outline-none focus:ring-1 focus:ring-stemania-teal-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
      />
    </div>
  );
}

function initCanvas(
  canvas: HTMLCanvasElement,
  drawingRef: React.RefObject<Record<string, boolean>>,
  key: string
): () => void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};

  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";

  const getPos = (e: MouseEvent | TouchEvent) => {
    const r = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - r.left, y: e.touches[0].clientY - r.top };
    }
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onStart = (e: MouseEvent | TouchEvent) => {
    if (drawingRef.current) drawingRef.current[key] = true;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const onMove = (e: MouseEvent | TouchEvent) => {
    if (!drawingRef.current?.[key]) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const onEnd = () => {
    if (drawingRef.current) drawingRef.current[key] = false;
  };

  canvas.addEventListener("mousedown", onStart);
  canvas.addEventListener("mousemove", onMove);
  canvas.addEventListener("mouseup", onEnd);
  canvas.addEventListener("mouseleave", onEnd);
  canvas.addEventListener("touchstart", onStart, { passive: false });
  canvas.addEventListener("touchmove", onMove, { passive: false });
  canvas.addEventListener("touchend", onEnd);

  return () => {
    canvas.removeEventListener("mousedown", onStart);
    canvas.removeEventListener("mousemove", onMove);
    canvas.removeEventListener("mouseup", onEnd);
    canvas.removeEventListener("mouseleave", onEnd);
    canvas.removeEventListener("touchstart", onStart);
    canvas.removeEventListener("touchmove", onMove);
    canvas.removeEventListener("touchend", onEnd);
  };
}
