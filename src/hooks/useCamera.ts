// ============================================================================
// useCamera — wraps the real MediaDevices.getUserMedia API.
//
// Exposes a <video> ref to attach, a status enum the UI can render around,
// and a captureFrame() that draws the live video frame to a canvas (real
// pixels, not a placeholder). If the camera is unavailable (no API, no
// device, permission denied, insecure context), the hook surfaces a clear
// reason so the UI can fall back to "Upload image instead" per spec §32.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';

export type CameraStatus = 'idle' | 'requesting' | 'streaming' | 'unavailable' | 'denied';

export interface CameraApi {
  status: CameraStatus;
  errorMessage: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  start: () => Promise<void>;
  stop: () => void;
  captureFrame: () => HTMLCanvasElement | null;
}

export function useCamera(): CameraApi {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus('idle');
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unavailable');
      setErrorMessage('Camera API not available in this browser.');
      return;
    }
    setStatus('requesting');
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {
          /* autoplay can reject before user gesture settles; ignore */
        });
      }
      setStatus('streaming');
    } catch (err) {
      const name = err instanceof DOMException ? err.name : 'UnknownError';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setStatus('denied');
        setErrorMessage('Camera permission was denied.');
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        setStatus('unavailable');
        setErrorMessage('No suitable camera device was found.');
      } else {
        setStatus('unavailable');
        setErrorMessage('Camera could not be started.');
      }
    }
  }, []);

  const captureFrame = useCallback((): HTMLCanvasElement | null => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return null;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas;
  }, []);

  useEffect(() => stop, [stop]);

  return { status, errorMessage, videoRef, start, stop, captureFrame };
}
