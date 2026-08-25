"use client";

// components/food/BarcodeScanner.tsx
//
// Opens the device camera and watches for a product barcode (UPC/EAN — the
// formats printed on packaged foods). Restricted to those formats rather
// than all of html5-qrcode's supported types (which also includes QR codes)
// so it locks onto a barcode faster and doesn't get distracted by other
// codes that might be in frame.

import { useEffect, useRef, useState } from "react";

const SCANNER_ELEMENT_ID = "barcode-scanner-viewport";

export default function BarcodeScanner({
  onDetected,
  onCancel,
}: {
  onDetected: (code: string) => void;
  onCancel: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);
  const stoppedRef = useRef(false);

  useEffect(() => {
    stoppedRef.current = false;
    let cancelled = false;

    import("html5-qrcode").then(({ Html5Qrcode, Html5QrcodeSupportedFormats }) => {
      if (cancelled) return;
      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
        ],
        verbose: false,
      });
      scannerRef.current = scanner;

      scanner
        .start(
          {
            facingMode: "environment",
            // Capping resolution is the single biggest speed lever here:
            // the JS decoder has to process every pixel of every frame, and
            // phone cameras default to a much higher resolution than a
            // barcode scan needs. 640x480 is plenty to read a barcode from
            // a few inches away and cuts the per-frame decode cost a lot.
            width: { ideal: 640 },
            height: { ideal: 480 },
          } as any,
          {
            fps: 15,
            qrbox: { width: 260, height: 120 },
            disableFlip: true,
          },
          (decodedText: string) => {
            if (stoppedRef.current) return;
            stoppedRef.current = true;
            scanner
              .stop()
              .then(() => scanner.clear())
              .catch(() => {});
            onDetected(decodedText);
          },
          () => {
            // Fires continuously while no code is in frame — not an error.
          }
        )
        .catch((err: unknown) => {
          setError(
            err instanceof Error && /permission|NotAllowed/i.test(err.message)
              ? "Camera access was denied. Enable camera permission for this site in Settings, then try again."
              : "Couldn't start the camera. Make sure no other app is using it, then try again."
          );
        });
    });

    return () => {
      cancelled = true;
      if (scannerRef.current && !stoppedRef.current) {
        stoppedRef.current = true;
        scannerRef.current
          .stop()
          .then(() => scannerRef.current.clear())
          .catch(() => {});
      }
    };
  }, [onDetected]);

  return (
    <div className="rounded-lg border border-[#0D9488] bg-[#0D9488]/5 p-3">
      {error ? (
        <div>
          <p className="text-sm text-[#DC2626] mb-2">{error}</p>
          <button onClick={onCancel} className="text-xs px-3 py-1.5 rounded-full border border-[#E5E7EB] text-[#6B7280]">
            Close
          </button>
        </div>
      ) : (
        <div>
          <div id={SCANNER_ELEMENT_ID} className="rounded-md overflow-hidden bg-black" />
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
