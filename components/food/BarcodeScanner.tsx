"use client";

// components/food/BarcodeScanner.tsx
//
// Opens the device camera and watches for a product barcode (UPC/EAN — the
// formats printed on packaged foods). Restricted to those formats rather
// than all of html5-qrcode's supported types (which also includes QR codes)
// so it locks onto a barcode faster and doesn't get distracted by other
// codes that might be in frame.
//
// Deliberately simple: one camera request, no retry-with-different-
// constraints logic. An earlier version tried a fast/low-res request first
// and silently retried with a plain request if that failed — calling
// start() twice on the same scanner instance turned out to be unreliable
// (it could fail silently, with the camera never appearing and no error
// shown). One request, wrapped defensively, is more predictable.

import { useEffect, useRef, useState } from "react";

const SCANNER_ELEMENT_ID = "barcode-scanner-viewport";
const START_TIMEOUT_MS = 8000;

// html5-qrcode's stop() can throw SYNCHRONOUSLY (not just reject a promise)
// when called on a scanner that never actually reached a running state.
// A synchronous throw inside a React effect cleanup crashes the whole app
// (Next.js's generic "Application error" page), so every stop/clear call
// here is wrapped defensively regardless of whether it throws sync or async.
function safeStopAndClear(scanner: any) {
  const clear = () => {
    try {
      scanner.clear();
    } catch {
      // Nothing to clear if it never rendered a viewport.
    }
  };
  try {
    const maybePromise = scanner.stop();
    if (maybePromise && typeof maybePromise.then === "function") {
      maybePromise.then(clear).catch(clear);
    } else {
      clear();
    }
  } catch {
    clear();
  }
}

export default function BarcodeScanner({
  onDetected,
  onCancel,
}: {
  onDetected: (code: string) => void;
  onCancel: () => void;
}) {
  const [status, setStatus] = useState<"starting" | "ready" | "error">("starting");
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);
  const stoppedRef = useRef(false);

  useEffect(() => {
    stoppedRef.current = false;
    let cancelled = false;
    let settled = false;

    const timeoutId = setTimeout(() => {
      if (settled || cancelled) return;
      settled = true;
      setStatus("error");
      setError("The camera is taking too long to start. Close this and try again — you may need to grant camera access in Settings.");
    }, START_TIMEOUT_MS);

    import("html5-qrcode")
      .then(({ Html5Qrcode, Html5QrcodeSupportedFormats }) => {
        if (cancelled) return;

        let scanner: any;
        try {
          scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, {
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.CODE_128,
            ],
            verbose: false,
          });
        } catch {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutId);
          setStatus("error");
          setError("Couldn't set up the scanner. Try closing and reopening this panel.");
          return;
        }
        scannerRef.current = scanner;

        try {
          scanner
            .start(
              { facingMode: "environment" } as any,
              { fps: 10, qrbox: { width: 260, height: 130 }, disableFlip: true },
              (decodedText: string) => {
                if (stoppedRef.current) return;
                stoppedRef.current = true;
                safeStopAndClear(scanner);
                onDetected(decodedText);
              },
              () => {
                // Fires continuously while no code is in frame — not an error.
              }
            )
            .then(() => {
              if (cancelled || settled) return;
              settled = true;
              clearTimeout(timeoutId);
              setStatus("ready");
            })
            .catch((err: unknown) => {
              if (cancelled || settled) return;
              settled = true;
              clearTimeout(timeoutId);
              setStatus("error");
              setError(
                err instanceof Error && /permission|NotAllowed/i.test(err.message)
                  ? "Camera access was denied. Enable camera permission for this site in Settings, then try again."
                  : "Couldn't start the camera. Make sure no other app is using it, then try again."
              );
            });
        } catch {
          if (cancelled || settled) return;
          settled = true;
          clearTimeout(timeoutId);
          setStatus("error");
          setError("Couldn't start the camera. Make sure no other app is using it, then try again.");
        }
      })
      .catch(() => {
        if (cancelled || settled) return;
        settled = true;
        clearTimeout(timeoutId);
        setStatus("error");
        setError("Couldn't load the barcode scanner. Check your connection and try again.");
      });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      if (scannerRef.current && !stoppedRef.current) {
        stoppedRef.current = true;
        safeStopAndClear(scannerRef.current);
      }
    };
  }, [onDetected]);

  return (
    <div className="rounded-lg border border-[#0D9488] bg-[#0D9488]/5 p-3">
      {status === "error" ? (
        <div>
          <p className="text-sm text-[#DC2626] mb-2">{error}</p>
          <button onClick={onCancel} className="text-xs px-3 py-1.5 rounded-full border border-[#E5E7EB] text-[#6B7280]">
            Close
          </button>
        </div>
      ) : (
        <div>
          {status === "starting" && <p className="text-xs text-[#6B7280] mb-2">Starting camera...</p>}
          <div id={SCANNER_ELEMENT_ID} className="rounded-md overflow-hidden bg-black min-h-[160px]" />
          <p className="text-xs text-[#6B7280] mt-2 mb-2">
            Point the camera at the barcode on the package. It scans automatically.
          </p>
          <button onClick={onCancel} className="w-full text-xs py-2 rounded-md border border-[#E5E7EB] text-[#6B7280]">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
