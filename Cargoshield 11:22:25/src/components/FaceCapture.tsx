import { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';

interface FaceCaptureProps {
  onCapture: (imageData: string) => void;
  onCancel: () => void;
}

export default function FaceCapture({ onCapture, onCancel }: FaceCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('✅ FaceCapture: Component mounted, starting camera...');
    startCamera();

    return () => {
      console.log('✅ FaceCapture: Component unmounting, cleaning up...');
      stopCamera();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      console.log('✅ FaceCapture: Requesting camera permission...');
      setError(null);
      setLoading(true);
      setCameraReady(false);

      // Request camera with basic constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      console.log('✅ FaceCapture: Camera permission granted, stream obtained');
      streamRef.current = stream;

      // Set video source immediately
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        console.log('✅ FaceCapture: Video source set, waiting for metadata...');

        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          console.log('✅ FaceCapture: Video metadata loaded, starting playback...');
          if (videoRef.current) {
            videoRef.current.play()
              .then(() => {
                console.log('✅ FaceCapture: Video playing successfully!');
                setLoading(false);
                setCameraReady(true);
                if (timeoutRef.current) {
                  clearTimeout(timeoutRef.current);
                }
              })
              .catch((playErr) => {
                console.error('❌ FaceCapture: Play error:', playErr);
                setLoading(false);
                setCameraReady(true); // Still set ready, might autoplay
              });
          }
        };

        // Fallback timeout - camera should be ready within 2 seconds
        timeoutRef.current = setTimeout(() => {
          if (loading) {
            console.log('⚠️ FaceCapture: Timeout reached, forcing camera ready state');
            setLoading(false);
            setCameraReady(true);
          }
        }, 2000);
      }
    } catch (err: any) {
      console.error('❌ FaceCapture: Camera error:', err);
      setLoading(false);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera access denied. Please allow camera access and try again.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else if (err.name === 'NotReadableError') {
        setError('Camera is already in use by another application.');
      } else {
        setError(err.message || 'Could not access camera. Please try again.');
      }
    }
  };

  const stopCamera = () => {
    console.log('✅ FaceCapture: Stopping camera...');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log('✅ FaceCapture: Camera track stopped');
      });
      streamRef.current = null;
    }
    setCameraReady(false);
  };

  const capturePhoto = () => {
    console.log('✅ FaceCapture: Capturing photo...');
    if (!videoRef.current || !canvasRef.current) {
      console.error('❌ FaceCapture: Video or canvas ref missing');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    console.log(`✅ FaceCapture: Canvas size: ${canvas.width}x${canvas.height}`);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('❌ FaceCapture: Could not get canvas context');
      return;
    }

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64 image
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    console.log(`✅ FaceCapture: Photo captured, size: ${imageData.length} bytes`);

    setCapturedImage(imageData);
    stopCamera();
  };

  const retakePhoto = () => {
    console.log('✅ FaceCapture: Retaking photo...');
    setCapturedImage(null);
    setLoading(true);
    startCamera();
  };

  const handleUsePhoto = () => {
    console.log('✅ FaceCapture: Using captured photo');
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  const handleSkipForDemo = () => {
    console.log('✅ FaceCapture: Skipping camera for demo mode');
    // Create a simple placeholder image
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#3b82f6';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Demo Mode', canvas.width / 2, canvas.height / 2);
      const imageData = canvas.toDataURL('image/jpeg', 0.9);
      onCapture(imageData);
    }
  };

  // Error state with clear instructions
  if (error) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Camera Access Issue</h3>
          <p className="text-gray-400 mb-6">{error}</p>

          {error.includes('denied') && (
            <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4 mb-6 text-left">
              <p className="text-blue-400 font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                How to enable camera access:
              </p>
              <ol className="text-gray-400 text-sm space-y-1 ml-7 list-decimal">
                <li>Click the camera icon in your browser's address bar</li>
                <li>Select "Allow" for camera access</li>
                <li>Click the "Retry Camera" button below</li>
              </ol>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                console.log('✅ FaceCapture: Retry button clicked');
                setError(null);
                setLoading(true);
                startCamera();
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Retry Camera
            </button>
            <button
              onClick={handleSkipForDemo}
              className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Skip for Demo
            </button>
            <button
              onClick={onCancel}
              className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Photo review state
  if (capturedImage) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4 text-center">Review Photo</h3>

        <div className="relative mb-6 rounded-lg overflow-hidden bg-gray-800">
          <img src={capturedImage} alt="Captured face" className="w-full h-auto" />
        </div>

        <div className="flex gap-3">
          <button
            onClick={retakePhoto}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Retake
          </button>
          <button
            onClick={handleUsePhoto}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            Use Photo
          </button>
        </div>
      </div>
    );
  }

  // Camera capture state
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h3 className="text-xl font-semibold text-white mb-4 text-center">Capture Verification Photo</h3>

      <div className="relative mb-6 rounded-lg overflow-hidden bg-black aspect-[4/3]">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center flex-col gap-4">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            <p className="text-gray-400 text-sm">Starting camera...</p>
            <p className="text-gray-500 text-xs">This should take less than 2 seconds</p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {cameraReady && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-64 h-80 border-4 border-blue-600/50 rounded-full"></div>
                </div>
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-green-600 text-white px-4 py-2 rounded-full flex items-center gap-2 text-sm font-medium">
                    <CheckCircle className="w-4 h-4" />
                    Camera Ready
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="space-y-3">
        <button
          onClick={capturePhoto}
          disabled={!cameraReady || loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <Camera className="w-5 h-5" />
          Take Photo
        </button>

        <div className="flex gap-3">
          <button
            onClick={handleSkipForDemo}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg font-medium transition-colors text-sm"
          >
            Skip for Demo
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg font-medium transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      </div>

      <p className="text-center text-gray-400 text-sm mt-4">
        Position your face in the oval and ensure good lighting
      </p>
    </div>
  );
}
