import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, AlertCircle, Sparkles, Scan, ArrowRight } from 'lucide-react';
import { playBarcodeBeep } from '../../utils/soundHelper';

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');

  // Start / Stop Camera Stream
  useEffect(() => {
    if (!isOpen) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setCameraActive(false);
      setCameraError(null);
      setManualCode('');
      return;
    }

    const startCamera = async () => {
      try {
        setCameraError(null);
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera device access is not supported in this browser environment.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setCameraActive(true);
      } catch (err: any) {
        console.warn('Camera access unavailable:', err);
        setCameraError(
          err.name === 'NotAllowedError'
            ? 'Camera permission was denied. You can still test scanning using the sample barcodes below or manual entry.'
            : 'Camera stream could not be started in this preview sandbox. Use quick-scan samples or manual entry below.'
        );
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen]);

  // Live BarcodeDetector API detection loop
  useEffect(() => {
    if (!isOpen || !cameraActive) return;

    let isScanning = true;
    let detector: any = null;

    if ('BarcodeDetector' in window) {
      try {
        detector = new (window as any).BarcodeDetector({
          formats: ['code_128', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_39', 'qr_code'],
        });
      } catch (e) {
        detector = null;
      }
    }

    const detectFrame = async () => {
      if (!isScanning || !videoRef.current) return;

      if (detector && videoRef.current.readyState >= 2) {
        try {
          const results = await detector.detect(videoRef.current);
          if (results && results.length > 0 && isScanning) {
            const raw = results[0].rawValue;
            if (raw) {
              playBarcodeBeep();
              onScan(raw);
              onClose();
              return;
            }
          }
        } catch {
          // ignore single frame detection glitches
        }
      }

      if (isScanning) {
        requestAnimationFrame(detectFrame);
      }
    };

    const timer = setTimeout(() => {
      detectFrame();
    }, 400);

    return () => {
      isScanning = false;
      clearTimeout(timer);
    };
  }, [isOpen, cameraActive, onScan, onClose]);

  const handleSimulatedScan = (barcode: string) => {
    playBarcodeBeep();
    onScan(barcode);
    onClose();
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualCode.trim();
    if (clean) {
      handleSimulatedScan(clean);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-base">Camera Barcode Scanner</h3>
              <p className="text-xs text-slate-500">Live Optical &amp; Continuous Barcode Reader</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder Area */}
        <div className="p-6 space-y-4">
          <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800">
            {cameraActive ? (
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
            ) : (
              <div className="p-6 text-center text-slate-400 max-w-xs space-y-2">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                <p className="text-xs">{cameraError || 'Initializing camera stream...'}</p>
              </div>
            )}

            {/* Target Reticle Overlay */}
            <div className="absolute inset-8 border-2 border-dashed border-orange-500/70 rounded-lg pointer-events-none flex flex-col justify-between p-2">
              <div className="w-full h-0.5 bg-orange-500 shadow-[0_0_8px_#f97316] animate-pulse" />
              <div className="text-center text-[10px] uppercase tracking-wider font-semibold text-white/80 bg-black/50 py-0.5 rounded backdrop-blur-xs">
                Center barcode in frame
              </div>
            </div>
          </div>

          {/* Manual Input Fallback */}
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Scan className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Or paste / type numeric barcode (e.g. 890123400001)..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono outline-none focus:bg-white focus:border-orange-500"
              />
            </div>
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Add</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Quick Simulation Shortcuts for Demo / Testing */}
          <div>
            <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-orange-600" />
              <span>Tap to Test Instant Barcode Scan</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <button
                type="button"
                onClick={() => handleSimulatedScan('890123400001')}
                className="p-2.5 bg-slate-50 hover:bg-orange-50 hover:border-orange-200 border border-slate-200 rounded-lg text-left transition-colors cursor-pointer"
              >
                <div className="font-semibold text-slate-900 truncate">10cm Sparklers</div>
                <div className="text-[11px] text-slate-500">890123400001</div>
              </button>

              <button
                type="button"
                onClick={() => handleSimulatedScan('890123400004')}
                className="p-2.5 bg-slate-50 hover:bg-orange-50 hover:border-orange-200 border border-slate-200 rounded-lg text-left transition-colors cursor-pointer"
              >
                <div className="font-semibold text-slate-900 truncate">Ashoka Deluxe Anar</div>
                <div className="text-[11px] text-slate-500">890123400004</div>
              </button>

              <button
                type="button"
                onClick={() => handleSimulatedScan('890123400006')}
                className="p-2.5 bg-slate-50 hover:bg-orange-50 hover:border-orange-200 border border-slate-200 rounded-lg text-left transition-colors cursor-pointer"
              >
                <div className="font-semibold text-slate-900 truncate">Ground Chakra</div>
                <div className="text-[11px] text-slate-500">890123400006</div>
              </button>

              <button
                type="button"
                onClick={() => handleSimulatedScan('890123400010')}
                className="p-2.5 bg-slate-50 hover:bg-orange-50 hover:border-orange-200 border border-slate-200 rounded-lg text-left transition-colors cursor-pointer"
              >
                <div className="font-semibold text-slate-900 truncate">30-Shot Aerial Cake</div>
                <div className="text-[11px] text-slate-500">890123400010</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">Instant detection with audio beep confirmation</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
