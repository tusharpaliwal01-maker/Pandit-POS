import { useEffect, useRef, useState, useCallback } from 'react';

export interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => void;
  minChars?: number;
  maxDelayMs?: number; // Max delay between characters in an automated wedge scan (default 60ms)
  debounceMs?: number; // Rapid scan duplicate prevention window (default 400ms)
  enabled?: boolean;
}

export interface ScannerDiagnostic {
  lastBarcode: string;
  timestamp: string;
  charCount: number;
  durationMs: number;
  isProbableHardwareGun: boolean;
}

/**
 * Sanitizes raw scanner string by removing ASCII control characters,
 * carriage returns, newlines, and standard ISO/IEC 15424 Aim ID preambles (e.g. ]C1, ]e0).
 */
export function sanitizeBarcode(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/[\r\n\t\x00-\x1F\x7F-\x9F]/g, '') // Strip control codes, CR, LF
    .replace(/^\][A-Za-z0-9]{2}/, '') // Strip Aim ID preamble if enabled on scanner
    .trim();
}

export function useBarcodeScanner({
  onScan,
  minChars = 3,
  maxDelayMs = 60,
  debounceMs = 400, // 350ms - 400ms rapid-scan duplicate prevention window
  enabled = true,
}: UseBarcodeScannerOptions) {
  const [lastDiagnostic, setLastDiagnostic] = useState<ScannerDiagnostic | null>(null);
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const scanStartTimeRef = useRef<number>(0);
  const lastEnterTimeRef = useRef<number>(0);
  const lastScanCodeRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      const target = e.target as HTMLElement | null;
      const isInput =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT';
      const isBarcodeSpecificInput =
        target?.getAttribute('data-barcode-input') === 'true' || target?.id === 'pos-barcode-input';

      // Ignore regular typing in quantity boxes, notes, forms without intercepting
      if (isInput && !isBarcodeSpecificInput) {
        return;
      }

      const now = Date.now();
      const timeSinceLastKey = now - lastKeyTimeRef.current;
      const isEnterKey = e.key === 'Enter' || e.key === 'Done' || e.keyCode === 13 || e.keyCode === 10;

      // 1. Hardware Gun Trailing Enter / Carriage-Return (CR + LF) Suppression
      // Most thermal guns transmit Carriage Return (\r) followed immediately by Line Feed (\n).
      // Both dispatch as 'Enter' in modern browsers within 5-150ms.
      // If buffer is already empty and another Enter arrives within 350ms, swallow it!
      if (isEnterKey) {
        const timeSinceLastEnter = now - lastEnterTimeRef.current;
        lastEnterTimeRef.current = now;

        if (timeSinceLastEnter < 350 && bufferRef.current.trim().length === 0) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return;
        }

        // 2. Process scan payload
        const rawBuffer = bufferRef.current;
        bufferRef.current = '';
        const cleanBarcode = sanitizeBarcode(rawBuffer);
        const duration = now - scanStartTimeRef.current;

        if (cleanBarcode.length >= minChars) {
          // Always prevent default & stop event from cascading to input elements
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          // Synchronously clear focused barcode input to avoid residual text/double-fire
          if (target && 'value' in target) {
            (target as HTMLInputElement).value = '';
          }

          // 3. Debounce & Rapid-Scan Duplicate Prevention Window (350ms - 400ms)
          // Suppresses hardware trigger bounce and rapid double-firing
          const timeSinceLastScan = now - lastScanTimeRef.current;
          const isDuplicate =
            timeSinceLastScan < debounceMs &&
            lastScanCodeRef.current.toLowerCase() === cleanBarcode.toLowerCase();

          if (isDuplicate) {
            // Duplicate rapid scan suppressed
            return;
          }

          lastScanTimeRef.current = now;
          lastScanCodeRef.current = cleanBarcode;

          const diagnostic: ScannerDiagnostic = {
            lastBarcode: cleanBarcode,
            timestamp: new Date().toLocaleTimeString(),
            charCount: cleanBarcode.length,
            durationMs: duration,
            isProbableHardwareGun: duration < cleanBarcode.length * maxDelayMs,
          };
          setLastDiagnostic(diagnostic);

          onScan(cleanBarcode);
        }

        return;
      }

      // 4. Sanitize incoming key stream & handle character timing
      // Reset buffer if delay between keystrokes is too long (human typing timeout)
      if (bufferRef.current.length === 0) {
        scanStartTimeRef.current = now;
      } else if (timeSinceLastKey > maxDelayMs * 3) {
        bufferRef.current = '';
        scanStartTimeRef.current = now;
      }

      lastKeyTimeRef.current = now;

      // Accumulate only printable ASCII characters (reject control characters, CR, LF, Tab)
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (!/[\r\n\t\x00-\x1F\x7F-\x9F]/.test(e.key)) {
          bufferRef.current += e.key;
        }
      }
    },
    [enabled, minChars, maxDelayMs, debounceMs, onScan]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [handleKeyDown]);

  const clearDiagnostic = useCallback(() => {
    setLastDiagnostic(null);
  }, []);

  return {
    lastDiagnostic,
    clearDiagnostic,
  };
}
