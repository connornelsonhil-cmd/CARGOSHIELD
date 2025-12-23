import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, CheckCircle, AlertCircle, Loader2, ArrowLeft, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../hooks/useNavigate';
import { supabase } from '../lib/supabase';
import {
  parseAndValidateCDL,
  formatDateForDisplay,
} from '../utils/cdlValidation';
import { compressImage, validateImageFile, canvasToBlob } from '../utils/imageProcessing';

type UploadStep = 'capture' | 'details' | 'preview' | 'success';

interface CDLData {
  image: Blob | null;
  imagePreview: string;
  licenseNumber: string;
  expirationDate: string;
}

export default function CDLUploadPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<UploadStep>('capture');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const [cdlData, setCdlData] = useState<CDLData>({
    image: null,
    imagePreview: '',
    licenseNumber: '',
    expirationDate: '',
  });

  const [validationErrors, setValidationErrors] = useState<{
    licenseNumber?: string;
    expirationDate?: string;
  }>({});

  useEffect(() => {
    if (!user || (profile && profile.role !== 'driver')) {
      navigate('/dashboard');
    }
  }, [user, profile, navigate]);

  useEffect(() => {
    return () => {
      if (cameraActive) {
        stopCamera();
      }
    };
  }, [cameraActive]);

  const startCamera = async () => {
    try {
      setError('');
      const constraints = {
        video: { facingMode: facingMode },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err: any) {
      setError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access.'
          : 'Unable to access camera. Please try uploading a file instead.'
      );
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      setCameraActive(false);
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      setLoading(true);
      setError('');

      const context = canvasRef.current.getContext('2d');
      if (!context) throw new Error('Failed to get canvas context');

      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;

      context.drawImage(videoRef.current, 0, 0);

      const blob = await canvasToBlob(canvasRef.current);
      const preview = canvasRef.current.toDataURL('image/jpeg');

      setCdlData((prev) => ({
        ...prev,
        image: blob,
        imagePreview: preview,
      }));

      stopCamera();
      setStep('details');
    } catch (err: any) {
      setError(err.message || 'Failed to capture photo');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setError('');

      const validationError = validateImageFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      const compressedBlob = await compressImage(file);
      const reader = new FileReader();

      reader.onload = () => {
        setCdlData((prev) => ({
          ...prev,
          image: compressedBlob,
          imagePreview: reader.result as string,
        }));
        setStep('details');
      };

      reader.readAsDataURL(compressedBlob);
    } catch (err: any) {
      setError(err.message || 'Failed to process image');
    } finally {
      setLoading(false);
    }
  };

  const validateCDLData = () => {
    const errors: typeof validationErrors = {};

    if (!cdlData.licenseNumber.trim()) {
      errors.licenseNumber = 'CDL number is required';
    }

    if (!cdlData.expirationDate.trim()) {
      errors.expirationDate = 'Expiration date is required';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return false;
    }

    const validation = parseAndValidateCDL(cdlData.licenseNumber, cdlData.expirationDate);

    if (!validation.isValid) {
      if (validation.error?.includes('Temporary')) {
        setError(validation.error);
      } else {
        setValidationErrors({
          licenseNumber: validation.error?.includes('CDL') ? validation.error : undefined,
          expirationDate: validation.error?.includes('date') || validation.error?.includes('expired') ? validation.error : undefined,
        });
      }
      return false;
    }

    setValidationErrors({});
    return true;
  };

  const handleContinue = () => {
    if (validateCDLData()) {
      setStep('preview');
    }
  };

  const uploadCDL = async () => {
    if (!user || !cdlData.image) {
      setError('Missing required data');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const validation = parseAndValidateCDL(cdlData.licenseNumber, cdlData.expirationDate);
      if (!validation.isValid) {
        setError(validation.error || 'CDL validation failed');
        return;
      }

      const timestamp = new Date().getTime();
      const filename = `cdl_${timestamp}.jpg`;
      const filepath = `cdl/${user.id}/${filename}`;

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('cdl-images')
        .upload(filepath, cdlData.image, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('cdl-images')
        .getPublicUrl(filepath);

      const { error: dbError } = await supabase.from('cdl_documents').insert({
        user_id: user.id,
        license_number: validation.licenseNumber,
        state_code: validation.stateCode,
        expiration_date: validation.expirationDate?.toISOString().split('T')[0],
        status: 'pending',
        image_url: urlData.publicUrl,
        image_filename: filename,
      });

      if (dbError) throw dbError;

      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Failed to upload CDL');
      setStep('preview');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'capture') {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col">
        <div className="bg-gray-900 border-b border-gray-800 p-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <div className="max-w-md w-full">
            <h1 className="text-3xl font-bold text-white mb-2 text-center">Upload Your CDL</h1>
            <p className="text-gray-400 text-center mb-8">
              Take a clear photo of your Commercial Driver License or upload from your device
            </p>

            {error && (
              <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4 mb-6 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-red-400 text-sm">{error}</div>
              </div>
            )}

            <div className="space-y-4">
              <button
                onClick={startCamera}
                disabled={cameraActive || loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-3"
              >
                <Camera className="w-5 h-5" />
                Take Photo
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="w-full bg-gray-800 hover:bg-gray-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-3"
              >
                <Upload className="w-5 h-5" />
                Upload from Device
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {cameraActive && (
              <div className="mt-6">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full rounded-lg bg-black mb-4"
                />
                <div className="flex gap-3">
                  <button
                    onClick={capturePhoto}
                    disabled={loading}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Capturing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Capture
                      </>
                    )}
                  </button>
                  <button
                    onClick={stopCamera}
                    disabled={loading}
                    className="flex-1 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-700 text-white py-3 rounded-lg font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                <button
                  onClick={() => setFacingMode(facingMode === 'user' ? 'environment' : 'user')}
                  className="w-full mt-3 text-gray-400 hover:text-white text-sm transition-colors"
                >
                  Switch Camera
                </button>
              </div>
            )}

            <div className="mt-8 bg-gray-900 border border-gray-800 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-3">Tips for a clear photo:</h3>
              <ul className="text-sm text-gray-400 space-y-2">
                <li>• Ensure good lighting</li>
                <li>• Keep CDL flat and straight</li>
                <li>• All text must be readable</li>
                <li>• Avoid glare or shadows</li>
              </ul>
            </div>
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  if (step === 'details') {
    return (
      <div className="min-h-screen bg-gray-950">
        <div className="bg-gray-900 border-b border-gray-800 p-4">
          <button
            onClick={() => setStep('capture')}
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-white mb-2">Enter CDL Details</h1>
          <p className="text-gray-400 mb-8">
            Provide your CDL information for verification
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <img
                src={cdlData.imagePreview}
                alt="CDL Preview"
                className="w-full rounded-lg"
              />
              <button
                onClick={() => setStep('capture')}
                className="w-full mt-4 text-blue-600 hover:text-blue-500 text-sm font-medium transition-colors"
              >
                Retake Photo
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  CDL Number
                  <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={cdlData.licenseNumber}
                  onChange={(e) => {
                    setCdlData({ ...cdlData, licenseNumber: e.target.value.toUpperCase() });
                    if (validationErrors.licenseNumber) {
                      setValidationErrors({ ...validationErrors, licenseNumber: undefined });
                    }
                  }}
                  placeholder="e.g., CA1234567"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
                {validationErrors.licenseNumber && (
                  <p className="mt-2 text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {validationErrors.licenseNumber}
                  </p>
                )}
                <p className="mt-2 text-gray-500 text-xs">
                  Format: 2-letter state code + 7-10 digits (e.g., CA1234567)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Expiration Date
                  <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={cdlData.expirationDate}
                  onChange={(e) => {
                    setCdlData({ ...cdlData, expirationDate: e.target.value });
                    if (validationErrors.expirationDate) {
                      setValidationErrors({ ...validationErrors, expirationDate: undefined });
                    }
                  }}
                  placeholder="MM/DD/YYYY"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
                {validationErrors.expirationDate && (
                  <p className="mt-2 text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {validationErrors.expirationDate}
                  </p>
                )}
              </div>

              {error && (
                <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-3 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="text-red-400 text-sm">{error}</div>
                </div>
              )}

              <button
                onClick={handleContinue}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'preview') {
    const validation = parseAndValidateCDL(cdlData.licenseNumber, cdlData.expirationDate);

    return (
      <div className="min-h-screen bg-gray-950">
        <div className="bg-gray-900 border-b border-gray-800 p-4">
          <button
            onClick={() => setStep('details')}
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-white mb-2">Review Your Information</h1>
          <p className="text-gray-400 mb-8">
            Please verify all details are correct before submitting
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <img
                src={cdlData.imagePreview}
                alt="CDL Preview"
                className="w-full rounded-lg border border-gray-800"
              />
            </div>

            <div className="space-y-6">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
                <div>
                  <p className="text-sm text-gray-400">CDL Number</p>
                  <p className="text-lg font-semibold text-white">{cdlData.licenseNumber}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-400">State</p>
                  <p className="text-lg font-semibold text-white">{validation.stateCode}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-400">Expiration Date</p>
                  <p className="text-lg font-semibold text-white">
                    {formatDateForDisplay(validation.expirationDate)}
                  </p>
                </div>

                <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-3 flex gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="text-green-400 text-sm">
                    CDL is valid and will be verified by our team
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="text-red-400 text-sm">{error}</div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('details')}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-lg font-semibold transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={uploadCDL}
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Submit
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 bg-green-600/10 border border-green-600/30 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white mb-2">CDL Uploaded Successfully</h1>
        <p className="text-gray-400 mb-8">
          Your Commercial Driver License has been uploaded and is now pending verification. You'll receive an email notification once our team has reviewed it.
        </p>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8 text-left space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-white">Submission Confirmed</p>
              <p className="text-xs text-gray-400">CDL #{cdlData.licenseNumber}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-gray-600 flex items-center justify-center">
              <div className="w-2 h-2 bg-gray-600 rounded-full" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Verification In Progress</p>
              <p className="text-xs text-gray-400">Usually completed within 24 hours</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}
