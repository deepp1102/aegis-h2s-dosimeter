// ============================================================================
// QRScanStep (spec §1)
//
// Reads the physical wristband's QR identity for Safety Officer verification. Reuses
// the existing useCamera hook (no second camera implementation) and the
// existing wristband data model via resolveWristbandFromQr. On repeated
// failure it shows a clear retry state and offers the existing
// manual/fallback workflow rather than silently assigning a wristband.
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { motion } from 'framer-motion';
import { QrCode, X, AlertTriangle, KeyRound, RotateCcw } from 'lucide-react';
import { useCamera } from '../../hooks/useCamera';
import { Button } from '../common/Button';
import { storageService } from '../../services/storage';
import { resolveWristbandFromQr, type WristbandResolution } from '../../services/wristbandIdentity';

interface QRScanStepProps {
  onVerified: (resolution: WristbandResolution) => void;
  onCancel: () => void;
  /** Safety Officer fallback when the printed QR cannot be read. */
  onUseManualFallback: () => void;
}

const SCAN_INTERVAL_MS = 280;

export function QRScanStep({ onVerified, onCancel, onUseManualFallback }: QRScanStepProps) {
  const { status, errorMessage, videoRef, start, stop } = useCamera();
  const [scanState, setScanState] = useState<'scanning' | 'resolving' | 'failed'>('scanning');
  const [failMessage, setFailMessage] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    start();
    return () => {
      cancelledRef.current = true;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status !== 'streaming' || scanState !== 'scanning') return;
    let raf: number;
    let lastTick = 0;

    const tick = (time: number) => {
      if (cancelledRef.current) return;
      if (time - lastTick >= SCAN_INTERVAL_MS) {
        lastTick = time;
        const video = videoRef.current;
        if (video && video.readyState >= 2 && video.videoWidth > 0) {
          const canvas = canvasRef.current ?? document.createElement('canvas');
          canvasRef.current = canvas;
          // Downscale for speed — QR decoding doesn't need full resolution.
          const scale = Math.min(1, 480 / video.videoWidth);
          canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
          canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const result = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'attemptBoth',
            });
            if (result?.data) {
              handleDecoded(result.data);
              return;
            }
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, scanState]);

  const handleDecoded = async (raw: string) => {
    setScanState('resolving');
    try {
      const resolution = await resolveWristbandFromQr(raw, storageService);
      if (cancelledRef.current) return;
      if (resolution.ok) {
        stop();
        onVerified(resolution);
      } else {
        setFailMessage(resolution.message);
        setAttempts((n) => n + 1);
        setScanState('failed');
      }
    } catch {
      if (cancelledRef.current) return;
      setFailMessage('Could not verify this wristband. Please try again.');
      setAttempts((n) => n + 1);
      setScanState('failed');
    }
  };

  const retry = () => {
    setFailMessage(null);
    setScanState('scanning');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 flex flex-col bg-ink-950"
    >
      <div className="flex items-center justify-between px-4 py-3 safe-top">
        <button onClick={onCancel} className="rounded-full bg-white/10 p-2 text-white">
          <X size={20} />
        </button>
        <p className="text-sm font-semibold text-white/90">Scan Wristband QR</p>
        <div className="w-9" />
      </div>

      <div className="relative flex-1 overflow-hidden">
        {status === 'streaming' && (
          <video ref={videoRef} className="h-full w-full object-cover" playsInline muted autoPlay />
        )}

        {(status === 'unavailable' || status === 'denied') && (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center text-white">
            <AlertTriangle size={32} className="text-accent-400" />
            <p className="font-semibold">{status === 'denied' ? 'Camera permission denied.' : 'Camera unavailable.'}</p>
            <p className="text-sm text-ink-300">{errorMessage ?? 'Use the manual fallback instead.'}</p>
            <Button variant="primary" icon={<KeyRound size={16} />} onClick={onUseManualFallback}>
              Enter wristband ID manually
            </Button>
          </div>
        )}

        {status === 'requesting' && (
          <div className="flex h-full items-center justify-center text-white/70 text-sm">
            Requesting camera access…
          </div>
        )}

        {status === 'streaming' && scanState === 'scanning' && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 px-8">
            <div className="relative flex h-48 w-48 items-center justify-center rounded-2xl border-2 border-dashed border-accent-400/80">
              <QrCode size={40} className="text-accent-300/70" />
            </div>
            <p className="text-center text-xs text-white/70">
              Hold the wristband QR code inside the frame.
            </p>
          </div>
        )}

        {status === 'streaming' && scanState === 'resolving' && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
            <p className="text-sm font-semibold text-white">Verifying wristband…</p>
          </div>
        )}

        {scanState === 'failed' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 px-8 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20 text-red-300">
              <AlertTriangle size={26} />
            </span>
            <p className="text-sm font-semibold text-white">{failMessage ?? 'QR could not be verified.'}</p>
            <p className="text-xs text-white/60">Attempt {attempts}. A failed scan does not consume the wristband.</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="primary" size="md" icon={<RotateCcw size={15} />} onClick={retry}>
                Retry scan
              </Button>
              <Button variant="secondary" size="md" icon={<KeyRound size={15} />} onClick={onUseManualFallback}>
                Enter ID manually
              </Button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
