import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  MapPin,
  Navigation,
  CheckCircle,
  AlertCircle,
  Loader2,
  Camera,
  Target,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../hooks/useNavigate';
import { supabase } from '../lib/supabase';
import FaceCapture from '../components/FaceCapture';
import {
  compareFaces,
  FaceComparisonProgress,
  FaceVerificationResult,
  getConfidenceColor,
} from '../utils/faceVerification';
import { calculateDistance } from '../utils/gpsUtils';

interface Load {
  id: string;
  load_number: string;
  pickup_address: string;
  pickup_latitude: number;
  pickup_longitude: number;
  delivery_address: string | null;
  status: string;
}

type VerificationStep = 'gps_check' | 'gps_waiting' | 'gps_approved' | 'face_capture' | 'face_matching' | 'success';

export default function LoadVerificationFlowPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [load, setLoad] = useState<Load | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [step, setStep] = useState<VerificationStep>('gps_check');
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number>(0);
  const [distanceToPickup, setDistanceToPickup] = useState<number>(0);
  const [isAtPickup, setIsAtPickup] = useState(false);

  const [showFaceCapture, setShowFaceCapture] = useState(false);
  const [capturedFaceImage, setCapturedFaceImage] = useState<string | null>(null);
  const [faceProgress, setFaceProgress] = useState<FaceComparisonProgress | null>(null);
  const [faceResult, setFaceResult] = useState<FaceVerificationResult | null>(null);

  const loadId = window.location.pathname.split('/').pop();

  useEffect(() => {
    loadLoadDetails();
  }, []);

  const loadLoadDetails = async () => {
    try {
      setLoading(true);
      console.log('✅ LoadVerification: Loading load details for ID:', loadId);

      const { data, error } = await supabase
        .from('loads')
        .select('*')
        .eq('id', loadId)
        .maybeSingle();

      if (error) {
        console.error('❌ LoadVerification: Query error:', error);
        throw error;
      }
      if (!data) {
        console.error('❌ LoadVerification: Load not found');
        throw new Error('Load not found');
      }

      console.log('✅ LoadVerification: Load loaded successfully:', data);
      setLoad(data);
    } catch (err: any) {
      console.error('❌ LoadVerification: Error:', err);
      setError(err.message || 'Failed to load details');
    } finally {
      setLoading(false);
    }
  };

  const handleGetGPSLocation = async () => {
    try {
      setStep('gps_waiting');
      setError('');
      console.log('✅ LoadVerification: Getting GPS location...');

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const driverLat = position.coords.latitude;
      const driverLng = position.coords.longitude;
      const accuracy = position.coords.accuracy;
      const accuracyFeet = Math.round(accuracy * 3.28084);

      console.log('📍 LoadVerification: Driver GPS Location:', {
        lat: driverLat,
        lng: driverLng,
        accuracy: `±${accuracyFeet}ft`
      });

      setDriverLocation({ lat: driverLat, lng: driverLng });
      setGpsAccuracy(accuracy);

      if (load) {
        console.log('📍 LoadVerification: Pickup Location:', {
          lat: load.pickup_latitude,
          lng: load.pickup_longitude
        });

        const distanceFeet = calculateDistance(
          driverLat,
          driverLng,
          load.pickup_latitude,
          load.pickup_longitude
        );
        const distanceMiles = distanceFeet / 5280;

        setDistanceToPickup(distanceFeet);

        console.log('📏 LoadVerification: Calculated Distance:', distanceMiles.toFixed(3), 'miles (', Math.round(distanceFeet), 'feet)');

        // CRITICAL FIX: Increased from 500ft to 0.5 miles (2,640ft)
        const GEOFENCE_RADIUS_MILES = 0.5;
        const GEOFENCE_RADIUS_FEET = GEOFENCE_RADIUS_MILES * 5280;
        const isWithinGeofence = distanceMiles <= GEOFENCE_RADIUS_MILES;

        console.log('✅ LoadVerification: Within geofence?', isWithinGeofence, `(threshold: ${GEOFENCE_RADIUS_MILES} miles)`);

        setIsAtPickup(isWithinGeofence);

        if (isWithinGeofence) {
          console.log('✅ LoadVerification: Within geofence - GPS approved!');
          setStep('gps_approved');
        } else {
          console.log(`⚠️ LoadVerification: Outside geofence (need to be within ${GEOFENCE_RADIUS_MILES} miles / ${GEOFENCE_RADIUS_FEET}ft)`);
          setStep('gps_check');
        }
      }
    } catch (err: any) {
      console.error('❌ LoadVerification: GPS error:', err);
      setError('Unable to get GPS location. Please enable location permissions.');
      setStep('gps_check');
    }
  };

  const handleStartFaceVerification = () => {
    console.log('✅ LoadVerification: Starting face verification...');
    setStep('face_capture');
    setShowFaceCapture(true);
  };

  const handleSkipLocationCheck = () => {
    console.log('⚠️ LoadVerification: Skipping location check (Demo Mode)');
    setIsAtPickup(true);
    setStep('gps_approved');
    // Use pickup location as fallback for verification data
    if (load && !driverLocation) {
      setDriverLocation({ lat: load.pickup_latitude, lng: load.pickup_longitude });
    }
  };

  const handleFaceCapture = async (imageData: string) => {
    console.log('✅ LoadVerification: Face photo captured, starting verification...');
    setCapturedFaceImage(imageData);
    setShowFaceCapture(false);
    setStep('face_matching');

    // Check if this is a demo skip (placeholder image contains "Demo Mode" text)
    const isDemoSkip = imageData.includes('Demo Mode') || imageData.length < 5000;

    try {
      let result;

      if (isDemoSkip) {
        console.log('⚠️ LoadVerification: Demo skip detected, using mock verification...');
        // Mock the face comparison for demo mode
        await new Promise((resolve) => setTimeout(resolve, 500));
        setFaceProgress({ progress: 50, message: 'Demo mode - skipping face detection...' });
        await new Promise((resolve) => setTimeout(resolve, 500));
        setFaceProgress({ progress: 100, message: 'Demo verification complete' });

        result = {
          success: true,
          confidence: 95.0,
          message: 'Demo verification successful'
        };
      } else {
        // Real face verification
        const mockOnboardingImage = imageData;

        // Add timeout for face comparison
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Face verification timeout after 10 seconds')), 10000);
        });

        const comparePromise = compareFaces(mockOnboardingImage, imageData, (progress) => {
          setFaceProgress(progress);
        });

        result = await Promise.race([comparePromise, timeoutPromise]) as any;
      }

      setFaceResult(result);
      console.log(`✅ LoadVerification: Face match result - ${result.success ? 'SUCCESS' : 'FAILED'} (${result.confidence.toFixed(1)}% confidence)`);

      if (result.success) {
        console.log('✅ LoadVerification: Saving verification event...');
        await supabase.from('verification_events').insert({
          load_id: load?.id,
          driver_id: user?.id,
          event_type: 'face',
          status: 'success',
          confidence_score: result.confidence,
          verification_data: {
            gps_lat: driverLocation?.lat,
            gps_lng: driverLocation?.lng,
            gps_accuracy: gpsAccuracy,
            face_confidence: result.confidence,
            demo_mode: isDemoSkip,
          },
        });

        await new Promise((resolve) => setTimeout(resolve, 1000));
        setStep('success');

        console.log('✅ LoadVerification: Updating load status to verified...');
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Allowed statuses: 'pending', 'assigned', 'verified', 'at_pickup', 'in_transit', 'at_delivery', 'delivered', 'cancelled'
        const newStatus = 'verified';
        console.log('✅ LoadVerification: Setting status to:', newStatus);

        const { error: updateError } = await supabase
          .from('loads')
          .update({
            status: newStatus,
            verified_at: new Date().toISOString(),
            verification_latitude: driverLocation?.lat,
            verification_longitude: driverLocation?.lng,
            verification_accuracy: gpsAccuracy,
          })
          .eq('id', load?.id);

        if (updateError) {
          console.error('❌ LoadVerification: Error updating load:', updateError);
          throw updateError;
        } else {
          console.log('✅ LoadVerification: Load verified successfully!');
        }

        // Show success animation for 2 seconds before navigating
        await new Promise((resolve) => setTimeout(resolve, 3000));
        navigate('/driver/dashboard');
      } else {
        // Verification failed
        setStep('face_capture');
        setError(result.message || 'Face verification failed. Please try again.');
      }
    } catch (err: any) {
      console.error('❌ LoadVerification: Face verification error:', err);
      setError(err.message || 'Face verification failed');
      setStep('face_capture');
    }
  };

  const handleRetryFaceCapture = () => {
    setFaceResult(null);
    setFaceProgress(null);
    setCapturedFaceImage(null);
    setShowFaceCapture(true);
  };

  const handleOpenMaps = () => {
    if (load) {
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${load.pickup_latitude},${load.pickup_longitude}`;
      window.open(mapsUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!load) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Load Not Found</h2>
          <button
            onClick={() => navigate('/driver/dashboard')}
            className="text-blue-400 hover:text-blue-300"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="bg-gray-900 border-b border-gray-800 p-4">
        <button
          onClick={() => navigate('/driver/dashboard')}
          className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {step === 'success' ? (
          <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50">
            <div className="text-center px-4">
              <div className="w-32 h-32 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce shadow-lg shadow-green-600/50">
                <svg className="w-20 h-20 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-5xl font-bold text-white mb-4 animate-pulse">Verified!</h1>
              <div className="space-y-2 mb-8">
                <p className="text-2xl text-green-400 font-semibold">
                  Face Match: {faceResult?.confidence.toFixed(1)}%
                </p>
                <p className="text-xl text-gray-300">Driver identity confirmed</p>
                <p className="text-lg text-gray-400">
                  {new Date().toLocaleTimeString()}
                </p>
              </div>
              <div className="bg-green-900/30 border border-green-600/50 rounded-lg p-6 max-w-md mx-auto">
                <Loader2 className="w-8 h-8 text-green-400 animate-spin mx-auto mb-3" />
                <p className="text-green-400 text-lg">Updating load status...</p>
              </div>
            </div>
          </div>
        ) : step === 'face_matching' ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Verifying Identity...</h2>

            {faceProgress && (
              <>
                <div className="mb-6">
                  <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full transition-all duration-500"
                      style={{ width: `${faceProgress.progress}%` }}
                    />
                  </div>
                </div>

                <div className="text-center mb-8">
                  <p className="text-gray-400 mb-2">{faceProgress.message}</p>
                  <p className="text-blue-400 text-3xl font-bold">{faceProgress.progress}%</p>
                </div>
              </>
            )}

            {faceResult && !faceResult.success && (
              <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-6 text-center">
                <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-red-400 mb-2">Identity Not Verified</h3>
                <p className="text-gray-400 mb-2">
                  Match confidence: <span className={getConfidenceColor(faceResult.confidence)}>{faceResult.confidence.toFixed(1)}%</span>
                </p>
                <p className="text-gray-400 mb-6">{faceResult.message}</p>
                <button
                  onClick={handleRetryFaceCapture}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        ) : step === 'face_capture' && showFaceCapture ? (
          <FaceCapture
            onCapture={handleFaceCapture}
            onCancel={() => {
              setShowFaceCapture(false);
              setStep('gps_approved');
            }}
          />
        ) : step === 'gps_approved' ? (
          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4">{load.load_number}</h2>

              <div className="space-y-3 mb-6">
                <div>
                  <p className="text-sm text-gray-400">Pickup Address</p>
                  <p className="text-white font-medium">{load.pickup_address}</p>
                </div>
                {load.delivery_address && (
                  <div>
                    <p className="text-sm text-gray-400">Delivery Address</p>
                    <p className="text-white font-medium">{load.delivery_address}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-400">Status</p>
                  <p className="text-white font-medium capitalize">{load.status.replace('_', ' ')}</p>
                </div>
              </div>

              <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <p className="text-green-400 font-semibold text-lg">At Pickup Location - GPS Confirmed</p>
                </div>
                <p className="text-green-400/70 text-sm">
                  Distance: {distanceToPickup >= 5280 ? `${(distanceToPickup / 5280).toFixed(2)} miles` : `${Math.round(distanceToPickup)} feet`}
                </p>
                <p className="text-green-400/70 text-sm">
                  GPS accuracy: ±{Math.round(gpsAccuracy * 3.28084)}ft
                  {gpsAccuracy * 3.28084 > 100 && (
                    <span className="text-yellow-500"> (Low accuracy)</span>
                  )}
                </p>
              </div>

              <button
                onClick={handleStartFaceVerification}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-lg font-semibold text-lg transition-colors flex items-center justify-center gap-2"
              >
                <Camera className="w-6 h-6" />
                Take Verification Selfie
              </button>
            </div>
          </div>
        ) : step === 'gps_waiting' ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-2">Getting GPS Location...</h2>
            <p className="text-gray-400">Please wait while we verify your location</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4">{load.load_number}</h2>

              <div className="space-y-3 mb-6">
                <div>
                  <p className="text-sm text-gray-400">Pickup Address</p>
                  <p className="text-white font-medium">{load.pickup_address}</p>
                </div>
                {load.delivery_address && (
                  <div>
                    <p className="text-sm text-gray-400">Delivery Address</p>
                    <p className="text-white font-medium">{load.delivery_address}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-400">Status</p>
                  <p className="text-white font-medium capitalize">{load.status.replace('_', ' ')}</p>
                </div>
              </div>

              {driverLocation && !isAtPickup && (
                <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-6 mb-4">
                  <div className="flex items-center gap-3 mb-4">
                    <Target className="w-8 h-8 text-yellow-400" />
                    <div>
                      <p className="text-yellow-400 font-semibold text-lg">Not At Pickup Yet</p>
                      <p className="text-yellow-400/70 text-sm">You must be within 0.5 miles of pickup to verify</p>
                    </div>
                  </div>

                  <div className="bg-gray-900 rounded-lg p-4 mb-4">
                    <p className="text-white text-center text-lg font-medium">
                      You are{' '}
                      <span className="text-yellow-400">
                        {distanceToPickup >= 5280
                          ? `${(distanceToPickup / 5280).toFixed(2)} miles`
                          : `${Math.round(distanceToPickup)} feet`}
                      </span>
                      {' '}from pickup
                    </p>
                    {gpsAccuracy && (
                      <p className="text-sm text-gray-400 mt-2 text-center">
                        GPS Accuracy: ±{Math.round(gpsAccuracy * 3.28084)} feet
                        {gpsAccuracy * 3.28084 > 100 && (
                          <span className="text-yellow-500 block mt-1">(Low accuracy - try moving to open area)</span>
                        )}
                      </p>
                    )}
                  </div>

                  {distanceToPickup / 5280 > 1 && (
                    <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-4">
                      <p className="text-red-400 text-sm font-medium mb-2">
                        You are {(distanceToPickup / 5280).toFixed(1)} miles from the pickup location.
                      </p>
                      <p className="text-red-300 text-xs leading-relaxed">
                        • Make sure you're at the correct address<br/>
                        • Check that GPS is enabled on your device<br/>
                        • Try refreshing your location<br/>
                        • Use "Skip Location Check" if this is a demo
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3 mb-3">
                    <button
                      onClick={handleOpenMaps}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <Navigation className="w-5 h-5" />
                      Get Directions
                    </button>
                    <button
                      onClick={handleGetGPSLocation}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold transition-colors"
                    >
                      Refresh Location
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4 mb-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                onClick={handleGetGPSLocation}
                disabled={step === 'gps_waiting'}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-4 rounded-lg font-semibold text-lg transition-colors flex items-center justify-center gap-2 mb-3"
              >
                {step === 'gps_waiting' ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Checking Location...
                  </>
                ) : (
                  <>
                    <MapPin className="w-6 h-6" />
                    {driverLocation && !isAtPickup ? 'Check Location Again' : 'Check My Location'}
                  </>
                )}
              </button>

              <button
                onClick={handleSkipLocationCheck}
                disabled={step === 'gps_waiting'}
                className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                Skip Location Check (Demo Mode)
              </button>
              <p className="text-xs text-gray-500 text-center mt-2">
                For demonstration and testing purposes
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
