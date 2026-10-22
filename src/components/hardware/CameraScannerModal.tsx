import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  X,
  AlertCircle,
  Scan,
  ArrowRight,
  RefreshCw,
  Zap,
  ZapOff,
  Upload,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react';
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  // Initialize ZXing Reader with all standard retail formats
  const getReader = useCallback(() => {
    if (!readerRef.current) {
      const hints = new Map();
      const formats = [
        BarcodeFormat.CODE_128,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_39,
        BarcodeFormat.QR_CODE,
        BarcodeFormat.ITF,
        BarcodeFormat.DATA_MATRIX,
      ];
      hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
      hints.set(DecodeHintType.TRY_HARDER, true);
      readerRef.current = new BrowserMultiFormatReader(hints, 300);
    }
    return readerRef.current;
  }, []);

  // Stop camera and reset
  const stopScanner = useCallback(() => {
    if (readerRef.current) {
      try {
        readerRef.current.reset();
      } catch (err) {
        console.warn('Error resetting barcode reader:', err);
      }
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setTorchOn(false);
    setTorchAvailable(false);
  }, []);

  const handleBarcodeDetected = useCallback(
    (code: string) => {
      const clean = code.trim();
      if (!clean) return;

      setLastScanned(clean);
      playBarcodeBeep();

      // Short delay for visual feedback before submitting and closing
      setTimeout(() => {
        onScan(clean);
        onClose();
      }, 350);
    },
    [onScan, onClose]
  );

  // Start continuous optical video scanning
  const startScanner = useCallback(
    async (deviceId?: string) => {
      setCameraError(null);
      const reader = getReader();

      try {
        // Enumerate video devices
        let devices: MediaDeviceInfo[] = [];
        try {
          devices = await reader.listVideoInputDevices();
          setVideoDevices(devices);
        } catch {
          // In some browsers devices are only listable after getUserMedia
        }

        // Auto-select preferred device (prioritize back/environment camera)
        let chosenDeviceId = deviceId;
        if (!chosenDeviceId && devices.length > 0) {
          const backCamera = devices.find(
            (d) =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('rear') ||
              d.label.toLowerCase().includes('environment')
          );
          chosenDeviceId = backCamera ? backCamera.deviceId : devices[devices.length - 1].deviceId;
        }
        setSelectedDeviceId(chosenDeviceId);

        if (!videoRef.current) return;

        // Decode continuously from video device
        await reader.decodeFromVideoDevice(
          chosenDeviceId || null,
          videoRef.current,
          (result, error) => {
            if (result) {
              const text = result.getText();
              if (text) {
                stopScanner();
                handleBarcodeDetected(text);
              }
            }
          }
        );

        setCameraActive(true);

        // Check torch capabilities
        setTimeout(() => {
          if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
              const capabilities = (videoTrack as any).getCapabilities?.();
              if (capabilities && capabilities.torch) {
                setTorchAvailable(true);
              }
            }
          }
        }, 600);
      } catch (err: any) {
        console.warn('Camera reader failed to start:', err);
        setCameraActive(false);

        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraError(
            'Camera permission was blocked. Please click the camera/padlock icon in your browser address bar and grant camera access, or upload a photo of the barcode below.'
          );
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setCameraError(
            'No active camera hardware was detected on this device. You can type the barcode manually or upload a photo below.'
          );
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setCameraError(
            'Camera is currently in use by another application or tab. Please close other camera apps and retry.'
          );
        } else {
          setCameraError(
            'Unable to start live camera video. You can upload a photo of the barcode or type the numbers directly below.'
          );
        }
      }
    },
    [getReader, stopScanner, handleBarcodeDetected]
  );

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    if (!videoRef.current || !videoRef.current.srcObject) return;
    try {
      const stream = videoRef.current.srcObject as MediaStream;
      const track = stream.getVideoTracks()[0];
      if (track) {
        const nextState = !torchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setTorchOn(nextState);
      }
    } catch (e) {
      console.warn('Torch toggle failed:', e);
    }
  };

  // Switch camera (front / back)
  const handleSwitchCamera = () => {
    if (videoDevices.length < 2) return;
    const currentIndex = videoDevices.findIndex((d) => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % videoDevices.length;
    const nextDeviceId = videoDevices[nextIndex].deviceId;
    stopScanner();
    setTimeout(() => {
      startScanner(nextDeviceId);
    }, 200);
  };

  // Image Upload & Camera Shutter Barcode Decoder with Canvas Preprocessing
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setCameraError(null);

    try {
      const reader = getReader();
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();

      img.onload = async () => {
        let detectedText: string | null = null;

        // Attempt 1: Direct decoding
        try {
          const result = await reader.decodeFromImageElement(img);
          if (result && result.getText()) {
            detectedText = result.getText();
          }
        } catch {
          // Attempt 2: High-contrast binarized canvas fallback
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const d = imgData.data;
              for (let i = 0; i < d.length; i += 4) {
                const avg = (d[i] + d[i + 1] + d[i + 2]) / 3;
                const val = avg > 125 ? 255 : 0;
                d[i] = val;
                d[i + 1] = val;
                d[i + 2] = val;
              }
              ctx.putImageData(imgData, 0, 0);

              const highContrastImg = new Image();
              await new Promise<void>((resolve) => {
                highContrastImg.onload = async () => {
                  try {
                    const fallbackResult = await reader.decodeFromImageElement(highContrastImg);
                    if (fallbackResult && fallbackResult.getText()) {
                      detectedText = fallbackResult.getText();
                    }
                  } catch {
                    // ignore
                  }
                  resolve();
                };
                highContrastImg.onerror = () => resolve();
                highContrastImg.src = canvas.toDataURL();
              });
            }
          } catch {
            // fallback canvas failed
          }
        }

        URL.revokeObjectURL(objectUrl);
        setIsProcessingFile(false);

        if (detectedText) {
          handleBarcodeDetected(detectedText);
        } else {
          setCameraError(
            'Barcode could not be recognized. Please take a closer, well-lit photo of the barcode or enter the digits below.'
          );
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        setIsProcessingFile(false);
        setCameraError('Failed to load photo. Please try capturing again.');
      };

      img.src = objectUrl;
    } catch {
      setIsProcessingFile(false);
      setCameraError('Error processing photo. Please try again.');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Lifecycle
  useEffect(() => {
    if (isOpen) {
      setLastScanned(null);
      setManualCode('');
      setCameraError(null);
      // Small timeout to allow modal animation to mount DOM elements
      const timer = setTimeout(() => {
        startScanner();
      }, 150);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen, startScanner, stopScanner]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualCode.trim();
    if (clean) {
      handleBarcodeDetected(clean);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <span>Optical Barcode Camera Scanner</span>
                {cameraActive && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                )}
              </h3>
              <p className="text-xs text-slate-500">
                Continuous auto-decode (EAN-13, Code 128, UPC, Code 39, QR)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {videoDevices.length > 1 && (
              <button
                type="button"
                onClick={handleSwitchCamera}
                title="Switch Camera (Front / Back)"
                className="p-2 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            {torchAvailable && (
              <button
                type="button"
                onClick={toggleTorch}
                title={torchOn ? 'Turn Off Flash' : 'Turn On Flash'}
                className={`p-2 rounded-lg transition-colors cursor-pointer ${
                  torchOn
                    ? 'text-amber-500 bg-amber-50'
                    : 'text-slate-500 hover:text-amber-600 hover:bg-amber-50'
                }`}
              >
                {torchOn ? <Zap className="w-4 h-4 fill-amber-500" /> : <ZapOff className="w-4 h-4" />}
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewfinder Area */}
        <div className="p-5 space-y-4">
          <div className="relative aspect-video bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border-2 border-slate-900 shadow-inner">
            <video
              ref={videoRef}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                cameraActive ? 'opacity-100' : 'opacity-0'
              }`}
              autoPlay
              playsInline
              muted
            />

            {!cameraActive && (
              <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center text-slate-400 space-y-2.5">
                {cameraError ? (
                  <>
                    <AlertCircle className="w-8 h-8 text-rose-500" />
                    <p className="text-xs text-rose-300 max-w-sm leading-relaxed">{cameraError}</p>
                    <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                      <label
                        htmlFor="camera-barcode-snap"
                        className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Snap with Device Camera</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => startScanner(selectedDeviceId)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retry Live Stream</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                    <p className="text-xs text-slate-300 font-medium">Accessing optical camera feed...</p>
                  </>
                )}
              </div>
            )}

            {/* Target Reticle Overlay with Active Laser Line */}
            {cameraActive && (
              <div className="absolute inset-6 sm:inset-10 border-2 border-orange-500/60 rounded-xl pointer-events-none flex flex-col justify-between p-2 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                {/* Glowing Laser Scan Bar */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-orange-400 to-transparent shadow-[0_0_10px_#f97316] animate-pulse" />
                <div className="text-center text-[10px] uppercase tracking-wider font-bold text-white/90 bg-black/60 py-1 px-2 rounded-full self-center backdrop-blur-xs">
                  Align Barcode Inside Box
                </div>
              </div>
            )}

            {/* Scanned Success Confirmation Flash */}
            {lastScanned && (
              <div className="absolute inset-0 bg-emerald-600/90 flex flex-col items-center justify-center text-white space-y-2 animate-in fade-in duration-100 z-10">
                <CheckCircle2 className="w-12 h-12 text-white animate-bounce" />
                <div className="font-mono text-sm font-bold tracking-wider">
                  SCANNED: {lastScanned}
                </div>
                <div className="text-xs text-emerald-100 font-medium">Processing scanned barcode...</div>
              </div>
            )}
          </div>

          {/* Quick Camera Device Selector if multiple available */}
          {videoDevices.length > 1 && (
            <div className="flex items-center justify-between text-xs text-slate-600 px-1">
              <span className="font-medium">Active Camera:</span>
              <select
                value={selectedDeviceId}
                onChange={(e) => {
                  const devId = e.target.value;
                  setSelectedDeviceId(devId);
                  stopScanner();
                  setTimeout(() => startScanner(devId), 200);
                }}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium max-w-[240px] truncate"
              >
                {videoDevices.map((d, idx) => (
                  <option key={d.deviceId || idx} value={d.deviceId}>
                    {d.label || `Camera ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Dedicated Camera Shutter & Photo Upload Actions */}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
              id="camera-barcode-snap"
            />
            <label
              htmlFor="camera-barcode-snap"
              className="flex-1 py-2.5 px-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-colors"
            >
              <Camera className="w-4 h-4" />
              <span>{isProcessingFile ? 'Decoding Photo...' : 'Snap with Device Camera'}</span>
            </label>

            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              id="camera-barcode-upload"
            />
            <label
              htmlFor="camera-barcode-upload"
              className="py-2.5 px-3.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
            >
              <Upload className="w-4 h-4 text-slate-500" />
              <span>Upload Photo</span>
            </label>
          </div>

          {/* Fallback 2: Manual Barcode / SKU Entry */}
          <form onSubmit={handleManualSubmit} className="space-y-1">
            <div className="text-[11px] font-semibold text-slate-600 px-1">
              Or type numeric barcode / item SKU:
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Scan className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Enter barcode number (e.g. 890123400001)..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-hidden focus:bg-white focus:border-orange-500 font-medium"
                />
              </div>
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <span>Add Item</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500">
            Powered by high-precision optical barcode decoder
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
