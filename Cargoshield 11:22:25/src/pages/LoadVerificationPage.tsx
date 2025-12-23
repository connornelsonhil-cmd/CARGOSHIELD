import { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Navigation,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Truck,
  Target,
  Camera,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../hooks/useNavigate';
import { supabase } from '../lib/supabase';
import {
  GPSLocation,
  GeofenceStatus,
  checkGeofence,
  requestLocationPermission,
  watchLocation,
  stopWatchingLocation,
  formatAccuracy,
  isAccuracyAcceptable,
} from '../utils/gpsUtils';
import FaceCapture from '../components/FaceCapture';
import {
  compareFaces,
  FaceComparisonProgress,
  FaceVerificationResult,
  getConfidenceColor,
  getConfidenceBgColor,
} from '../utils/faceVerification';

interface Load {
  id: string;
  load_number: string;
  pickup_address: string;
  pickup_latitude: number;
  pickup_longitude: number;
  delivery_address: string;
  status: string;
}

export default function LoadVerificationPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [loads, setLoads] = useState<Load[]>([]);
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'pending'>(
    'pending'
  );
  const [currentLocation, setCurrentLocation] = useState<GPSLocation | null>(null);
  const [geofenceStatus, setGeofenceStatus] = useState<GeofenceStatus | null>(null);

  const [verificationStep, setVerificationStep] = useState<'gps' | 'face' | 'complete'>('gps');
  const [showFaceCapture, setShowFaceCapture] = useState(false);
  const [faceVerificationProgress, setFaceVerificationProgress] = useState<FaceComparisonProgress | null>(null);
  const [faceVerificationResult, setFaceVerificationResult] = useState<FaceVerificationResult | null>(null);
  const [onboardingFaceImage, setOnboardingFaceImage] = useState<string | null>(null);

  const watchIdRef = useRef<number>(-1);

  useEffect(() => {
    if (user && profile?.user_type === 'driver') {
      loadAssignedLoads();
    }

    return () => {
      if (watchIdRef.current !== -1) {
        stopWatchingLocation(watchIdRef.current);
      }
    };
  }, [user, profile]);

  useEffect(() => {
    if (selectedLoad && currentLocation) {
      const status = checkGeofence(currentLocation, {
        latitude: selectedLoad.pickup_latitude,
        longitude: selectedLoad.pickup_longitude,
      });
      setGeofenceStatus(status);
    }
  }, [currentLocation, selectedLoad]);

  const loadAssignedLoads = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('loads')
        .select('*')
        .eq('assigned_driver_id', user?.id)
        .in('status', ['assigned', 'at_pickup'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLoads(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLoad = async (load: Load) => {
    setSelectedLoad(load);
    setError('');

    try {
      const position = await requestLocationPermission();
      setLocationPermission('granted');
      setCurrentLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });

      watchIdRef.current = watchLocation(
        (location) => {
          setCurrentLocation(location);
        },
        (errorMsg) => {
          setError(errorMsg);
        }
      );
    } catch (err: any) {
      setLocationPermission('denied');
      setError(err.message || 'Unable to access location');
    }
  };

  const handleStartFaceVerification = async () => {
    if (!selectedLoad || !currentLocation || !geofenceStatus?.isInside) return;

    if (!isAccuracyAcceptable(currentLocation.accuracy)) {
      setError('GPS accuracy too low. Move to an open area for better signal.');
      return;
    }

    try {
      setError('');

      const { data: cdlData, error: cdlError } = await supabase
        .from('cdl_documents')
        .select('face_image_url')
        .eq('driver_id', user?.id)
        .maybeSingle();

      if (cdlError) throw cdlError;

      if (!cdlData?.face_image_url) {
        setError('No onboarding photo found. Please complete CDL upload first.');
        return;
      }

      setOnboardingFaceImage(cdlData.face_image_url);
      setVerificationStep('face');
      setShowFaceCapture(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load verification data');
    }
  };

  const handleFaceCapture = async (capturedImage: string) => {
    if (!onboardingFaceImage || !selectedLoad) return;

    try {
      setShowFaceCapture(false);
      setVerifying(true);
      setError('');

      const result = await compareFaces(
        onboardingFaceImage,
        capturedImage,
        (progress) => {
          setFaceVerificationProgress(progress);
        }
      );

      setFaceVerificationResult(result);

      await supabase.from('verification_events').insert({
        load_id: selectedLoad.id,
        driver_id: user?.id,
        event_type: 'face',
        status: result.success ? 'success' : 'failed',
        confidence_score: result.confidence,
        verification_data: {
          onboarding_image: onboardingFaceImage,
          verification_image: capturedImage,
        },
        error_message: result.success ? null : result.message,
      });

      if (result.success) {
        await handleCompleteVerification(capturedImage);
      } else {
        setVerifying(false);
      }
    } catch (err: any) {
      setError(err.message || 'Face verification failed');
      setVerifying(false);
    }
  };

  const handleCompleteVerification = async (faceImage: string) => {
    if (!selectedLoad || !currentLocation) return;

    try {
      const { error: updateError } = await supabase
        .from('loads')
        .update({
          status: 'at_pickup',
          verified_at: new Date().toISOString(),
          verification_latitude: currentLocation.latitude,
          verification_longitude: currentLocation.longitude,
          verification_accuracy: currentLocation.accuracy,
        })
        .eq('id', selectedLoad.id);

      if (updateError) throw updateError;

      await supabase.from('verification_events').insert({
        load_id: selectedLoad.id,
        driver_id: user?.id,
        event_type: 'full_verification',
        status: 'success',
        verification_data: {
          gps: {
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            accuracy: currentLocation.accuracy,
          },
          face_image: faceImage,
        },
      });

      if (watchIdRef.current !== -1) {
        stopWatchingLocation(watchIdRef.current);
      }

      setVerificationStep('complete');

      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to complete verification');
      setVerifying(false);
    }
  };

  const handleRetryFaceVerification = () => {
    setFaceVerificationResult(null);
    setFaceVerificationProgress(null);
    setShowFaceCapture(true);
  };

  const handleCancel = () => {
    if (watchIdRef.current !== -1) {
      stopWatchingLocation(watchIdRef.current);
    }
    setSelectedLoad(null);
    setCurrentLocation(null);
    setGeofenceStatus(null);
    setLocationPermission('pending');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!selectedLoad) {
    return (
      <div className="min-h-screen bg-gray-950">
        <div className="bg-gray-900 border-b border-gray-800 p-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-white mb-2">Assigned Loads</h1>
          <p className="text-gray-400 mb-8">Select a load to verify at pickup location</p>

          {loads.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
              <Truck className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">No Assigned Loads</h2>
              <p className="text-gray-400">
                You don't have any loads assigned yet. Check back later.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {loads.map((load) => (
                <button
                  key={load.id}
                  onClick={() => handleSelectLoad(load)}
                  className="w-full bg-gray-900 border border-gray-800 hover:border-blue-600 rounded-xl p-6 text-left transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-1">{load.load_number}</h3>
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          load.status === 'assigned'
                            ? 'bg-blue-900/30 text-blue-400 border border-blue-600/30'
                            : 'bg-green-900/30 text-green-400 border border-green-600/30'
                        }`}
                      >
                        {load.status === 'assigned' ? 'Ready for Pickup' : 'At Pickup'}
                      </span>
                    </div>
                    <Navigation className="w-6 h-6 text-blue-600" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-300">Pickup Location</p>
                        <p className="text-white">{load.pickup_address}</p>
                      </div>
                    </div>
                    {load.delivery_address && (
                      <div className="flex items-start gap-2">
                        <Target className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-300">Delivery To</p>
                          <p className="text-white">{load.delivery_address}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="bg-gray-900 border-b border-gray-800 p-4">
        <button
          onClick={handleCancel}
          className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Loads
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">{selectedLoad.load_number}</h2>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <p className="text-sm font-medium text-gray-400">Pickup Location</p>
                <p className="text-white text-lg">{selectedLoad.pickup_address}</p>
              </div>
            </div>

            {selectedLoad.delivery_address && (
              <div className="flex items-start gap-3">
                <Target className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-400">Delivery To</p>
                  <p className="text-white">{selectedLoad.delivery_address}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {locationPermission === 'denied' && (
          <div className="bg-red-900/20 border border-red-600/30 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-red-400 mb-2">Location Access Required</h3>
                <p className="text-red-300 text-sm mb-4">
                  Please enable location permissions in your browser settings to verify your presence at
                  the pickup location.
                </p>
                <button
                  onClick={() => handleSelectLoad(selectedLoad)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {locationPermission === 'granted' && currentLocation && (
          <>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">GPS Status</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">GPS Accuracy</span>
                  <span
                    className={`font-medium ${
                      isAccuracyAcceptable(currentLocation.accuracy)
                        ? 'text-green-400'
                        : 'text-yellow-400'
                    }`}
                  >
                    {formatAccuracy(currentLocation.accuracy)}
                  </span>
                </div>

                {geofenceStatus && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Distance to Pickup</span>
                    <span className="font-medium text-white">
                      {geofenceStatus.distanceMiles >= 1
                        ? `${geofenceStatus.distanceMiles.toFixed(1)} mi`
                        : `${Math.round(geofenceStatus.distanceFeet)} ft`}
                    </span>
                  </div>
                )}

                {geofenceStatus && (
                  <div
                    className={`rounded-lg p-4 flex items-center gap-3 ${
                      geofenceStatus.isInside && isAccuracyAcceptable(currentLocation.accuracy)
                        ? 'bg-green-900/20 border border-green-600/30'
                        : 'bg-blue-900/20 border border-blue-600/30'
                    }`}
                  >
                    {geofenceStatus.isInside && isAccuracyAcceptable(currentLocation.accuracy) ? (
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    ) : (
                      <Navigation className="w-5 h-5 text-blue-400 flex-shrink-0 animate-pulse" />
                    )}
                    <p
                      className={`text-sm font-medium ${
                        geofenceStatus.isInside && isAccuracyAcceptable(currentLocation.accuracy)
                          ? 'text-green-400'
                          : 'text-blue-400'
                      }`}
                    >
                      {geofenceStatus.message}
                    </p>
                  </div>
                )}

                {!isAccuracyAcceptable(currentLocation.accuracy) && (
                  <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                    <p className="text-sm text-yellow-400">
                      GPS accuracy is low. Move to an open area for better signal.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4 mb-6 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-red-400 text-sm">{error}</div>
              </div>
            )}

            {showFaceCapture ? (
              <FaceCapture
                onCapture={handleFaceCapture}
                onCancel={() => {
                  setShowFaceCapture(false);
                  setVerificationStep('gps');
                }}
              />
            ) : faceVerificationProgress && verifying ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
                <h3 className="text-lg font-semibold text-white mb-4 text-center">
                  Verifying Identity...
                </h3>

                <div className="mb-4">
                  <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full transition-all duration-300"
                      style={{ width: `${faceVerificationProgress.progress}%` }}
                    />
                  </div>
                </div>

                <p className="text-center text-gray-400 mb-2">
                  {faceVerificationProgress.message}
                </p>
                <p className="text-center text-blue-400 text-lg font-semibold">
                  {faceVerificationProgress.progress}%
                </p>
              </div>
            ) : faceVerificationResult && !faceVerificationResult.success ? (
              <div className={`rounded-xl p-6 mb-6 ${getConfidenceBgColor(faceVerificationResult.confidence)}`}>
                <div className="text-center mb-4">
                  {faceVerificationResult.thresholds.lowConfidence ? (
                    <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                  ) : (
                    <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                  )}
                  <h3 className={`text-xl font-semibold mb-2 ${getConfidenceColor(faceVerificationResult.confidence)}`}>
                    {faceVerificationResult.message}
                  </h3>
                  <p className="text-gray-400 mb-2">Confidence Score</p>
                  <p className={`text-3xl font-bold ${getConfidenceColor(faceVerificationResult.confidence)}`}>
                    {faceVerificationResult.confidence.toFixed(1)}%
                  </p>
                </div>

                <button
                  onClick={handleRetryFaceVerification}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Camera className="w-5 h-5" />
                  Try Again
                </button>
              </div>
            ) : verificationStep === 'complete' ? (
              <div className="bg-green-900/20 border border-green-600/30 rounded-xl p-8 text-center">
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-2xl font-semibold text-green-400 mb-2">Verification Complete!</h3>
                <p className="text-gray-400">Load unlocked successfully</p>
              </div>
            ) : verificationStep === 'gps' ? (
              <>
                <button
                  onClick={handleStartFaceVerification}
                  disabled={
                    !geofenceStatus?.isInside ||
                    !isAccuracyAcceptable(currentLocation.accuracy) ||
                    verifying
                  }
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Verifying...
                    </>
                  ) : geofenceStatus?.isInside && isAccuracyAcceptable(currentLocation.accuracy) ? (
                    <>
                      <Camera className="w-5 h-5" />
                      Continue to Face Verification
                    </>
                  ) : (
                    <>
                      <Navigation className="w-5 h-5" />
                      Navigate to Pickup First
                    </>
                  )}
                </button>

                <p className="text-center text-gray-500 text-sm mt-4">
                  Step 1: GPS verified • Step 2: Face verification required
                </p>
              </>
            ) : null}
          </>
        )}

        {locationPermission === 'pending' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Requesting location access...</p>
          </div>
        )}
      </div>
    </div>
  );
}
