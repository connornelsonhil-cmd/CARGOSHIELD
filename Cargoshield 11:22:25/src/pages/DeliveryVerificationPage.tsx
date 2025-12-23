import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  MapPin,
  Camera,
  CheckCircle,
  Loader2,
  AlertCircle,
  Navigation,
  Target,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../hooks/useNavigate';
import { supabase } from '../lib/supabase';
import FaceCapture from '../components/FaceCapture';
import { calculateDistance } from '../utils/gpsUtils';

interface Load {
  id: string;
  load_number: string;
  pickup_address: string;
  delivery_address: string | null;
  delivery_latitude?: number;
  delivery_longitude?: number;
  status: string;
}

type DeliveryStep =
  | 'gps_check'
  | 'gps_waiting'
  | 'gps_approved'
  | 'photo_capture'
  | 'completing'
  | 'success';

export default function DeliveryVerificationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [load, setLoad] = useState<Load | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [step, setStep] = useState<DeliveryStep>('gps_check');
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number>(0);
  const [distanceToDelivery, setDistanceToDelivery] = useState<number>(0);
  const [isAtDelivery, setIsAtDelivery] = useState(false);

  const [showCamera, setShowCamera] = useState(false);
  const [deliveryPhoto, setDeliveryPhoto] = useState<string | null>(null);
  const [deliveryNotes, setDeliveryNotes] = useState('');

  const loadId = window.location.pathname.split('/').pop();

  useEffect(() => {
    loadLoadDetails();
  }, []);

  const loadLoadDetails = async () => {
    try {
      setLoading(true);
      console.log('✅ DeliveryVerification: Loading load details for ID:', loadId);

      const { data, error } = await supabase
        .from('loads')
        .select('*')
        .eq('id', loadId)
        .maybeSingle();

      if (error) {
        console.error('❌ DeliveryVerification: Query error:', error);
        throw error;
      }
      if (!data) {
        console.error('❌ DeliveryVerification: Load not found');
        throw new Error('Load not found');
      }

      console.log('✅ DeliveryVerification: Load loaded successfully:', data);
      setLoad(data);
    } catch (err: any) {
      console.error('❌ DeliveryVerification: Error:', err);
      setError(err.message || 'Failed to load details');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckDeliveryLocation = async () => {
    try {
      setStep('gps_waiting');
      setError('');
      console.log('✅ DeliveryVerification: Checking delivery location...');

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

      console.log('📍 DeliveryVerification: Driver GPS Location:', {
        lat: driverLat,
        lng: driverLng,
        accuracy: `±${accuracyFeet}ft`
      });

      setDriverLocation({ lat: driverLat, lng: driverLng });
      setGpsAccuracy(accuracy);

      // Use pickup location as fallback if delivery coordinates not set
      const deliveryLat = load?.delivery_latitude || load?.pickup_latitude || 0;
      const deliveryLng = load?.delivery_longitude || load?.pickup_longitude || 0;

      console.log('📍 DeliveryVerification: Delivery Location:', {
        lat: deliveryLat,
        lng: deliveryLng
      });

      const distanceFeet = calculateDistance(
        driverLat,
        driverLng,
        deliveryLat,
        deliveryLng
      );
      const distanceMiles = distanceFeet / 5280;

      setDistanceToDelivery(distanceFeet);

      console.log('📏 DeliveryVerification: Calculated Distance:', distanceMiles.toFixed(3), 'miles (', Math.round(distanceFeet), 'feet)');

      const GEOFENCE_RADIUS_MILES = 0.5;
      const isWithinGeofence = distanceMiles <= GEOFENCE_RADIUS_MILES;

      console.log('✅ DeliveryVerification: Within geofence?', isWithinGeofence, `(threshold: ${GEOFENCE_RADIUS_MILES} miles)`);

      setIsAtDelivery(isWithinGeofence);

      if (isWithinGeofence) {
        console.log('✅ DeliveryVerification: Within geofence - GPS approved!');
        setStep('gps_approved');
      } else {
        console.log(`⚠️ DeliveryVerification: Outside geofence (need to be within ${GEOFENCE_RADIUS_MILES} miles)`);
        setStep('gps_check');
      }
    } catch (err: any) {
      console.error('❌ DeliveryVerification: GPS error:', err);
      setError('Unable to get GPS location. Please enable location permissions.');
      setStep('gps_check');
    }
  };

  const handleSkipLocationCheck = () => {
    console.log('⚠️ DeliveryVerification: Skipping location check (Demo Mode)');
    setIsAtDelivery(true);
    setStep('gps_approved');
    if (load && !driverLocation) {
      setDriverLocation({
        lat: load.delivery_latitude || load.pickup_latitude || 0,
        lng: load.delivery_longitude || load.pickup_longitude || 0
      });
    }
  };

  const handleStartPhotoCapture = () => {
    console.log('✅ DeliveryVerification: Starting photo capture...');
    setStep('photo_capture');
    setShowCamera(true);
  };

  const handlePhotoCapture = (imageData: string) => {
    console.log('📸 DeliveryVerification: Delivery photo captured');
    setDeliveryPhoto(imageData);
    setShowCamera(false);
    setStep('gps_approved');
  };

  const handleSkipPhoto = () => {
    console.log('⚠️ DeliveryVerification: Skipping photo (Demo Mode)');
    setDeliveryPhoto('demo-placeholder');
    setStep('gps_approved');
  };

  const handleCompleteDelivery = async () => {
    try {
      setStep('completing');
      console.log('✅ DeliveryVerification: Completing delivery...');
      console.log('📝 Delivery notes:', deliveryNotes);
      console.log('📸 Has photo:', !!deliveryPhoto);

      const updateData: any = {
        status: 'delivered',
        delivered_at: new Date().toISOString(),
        arrival_at_delivery: new Date().toISOString(),
        delivery_notes: deliveryNotes || null,
      };

      if (driverLocation) {
        updateData.delivery_latitude = driverLocation.lat;
        updateData.delivery_longitude = driverLocation.lng;
        updateData.delivery_accuracy = gpsAccuracy;
      }

      if (deliveryPhoto && deliveryPhoto !== 'demo-placeholder') {
        updateData.delivery_photo = deliveryPhoto;
      }

      console.log('✅ DeliveryVerification: Updating load to delivered status');

      const { error: updateError } = await supabase
        .from('loads')
        .update(updateData)
        .eq('id', load?.id);

      if (updateError) {
        console.error('❌ DeliveryVerification: Error updating load:', updateError);
        throw updateError;
      }

      console.log('✅ DeliveryVerification: Delivery completed successfully!');
      console.log('📦 Status: in_transit → delivered');
      console.log('🕐 Delivered at:', new Date().toISOString());

      setStep('success');

      // Redirect after success animation
      setTimeout(() => {
        navigate('/driver/dashboard');
      }, 3000);
    } catch (err: any) {
      console.error('❌ DeliveryVerification: Delivery completion error:', err);
      setError(err.message || 'Failed to complete delivery');
      setStep('gps_approved');
    }
  };

  const handleOpenMaps = () => {
    if (load) {
      const lat = load.delivery_latitude || load.pickup_latitude || 0;
      const lng = load.delivery_longitude || load.pickup_longitude || 0;
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
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
                <CheckCircle className="w-20 h-20 text-white" />
              </div>
              <h1 className="text-5xl font-bold text-white mb-4 animate-pulse">Delivery Complete!</h1>
              <div className="space-y-2 mb-8">
                <p className="text-2xl text-green-400 font-semibold">
                  {load.load_number}
                </p>
                <p className="text-xl text-gray-300">Cargo Successfully Delivered</p>
                <p className="text-lg text-gray-400">
                  {new Date().toLocaleTimeString()}
                </p>
              </div>
              <div className="bg-green-900/30 border border-green-600/50 rounded-lg p-6 max-w-md mx-auto">
                <p className="text-green-400 text-lg">Great work!</p>
                <p className="text-gray-400 text-sm mt-2">Returning to dashboard...</p>
              </div>
            </div>
          </div>
        ) : step === 'completing' ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-2">Completing Delivery...</h2>
            <p className="text-gray-400">Please wait while we update the system</p>
          </div>
        ) : step === 'photo_capture' && showCamera ? (
          <FaceCapture
            onCapture={handlePhotoCapture}
            onCancel={() => {
              setShowCamera(false);
              setStep('gps_approved');
            }}
          />
        ) : step === 'gps_approved' ? (
          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4">{load.load_number}</h2>

              <div className="space-y-3 mb-6">
                <div>
                  <p className="text-sm text-gray-400">Delivery Address</p>
                  <p className="text-white font-medium">{load.delivery_address || load.pickup_address}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Status</p>
                  <p className="text-white font-medium capitalize">{load.status.replace('_', ' ')}</p>
                </div>
              </div>

              <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <p className="text-green-400 font-semibold text-lg">At Delivery Location - GPS Confirmed</p>
                </div>
                {driverLocation && (
                  <>
                    <p className="text-green-400/70 text-sm">
                      Distance: {distanceToDelivery >= 5280 ? `${(distanceToDelivery / 5280).toFixed(2)} miles` : `${Math.round(distanceToDelivery)} feet`}
                    </p>
                    <p className="text-green-400/70 text-sm">
                      GPS accuracy: ±{Math.round(gpsAccuracy * 3.28084)}ft
                    </p>
                  </>
                )}
              </div>

              {deliveryPhoto ? (
                <div className="bg-gray-800 border border-green-600 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">✓ Delivery Photo Captured</p>
                      <p className="text-gray-400 text-sm">Photo ready for upload</p>
                    </div>
                    <button
                      onClick={() => {
                        setDeliveryPhoto(null);
                        setShowCamera(false);
                      }}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Retake
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mb-6">
                  <button
                    onClick={handleStartPhotoCapture}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 mb-2"
                  >
                    <Camera className="w-5 h-5" />
                    Take Delivery Photo
                  </button>
                  <button
                    onClick={handleSkipPhoto}
                    className="w-full px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors text-sm"
                  >
                    Skip Photo (Demo Mode)
                  </button>
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Delivery Notes (Optional)
                </label>
                <textarea
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="Add any notes about the delivery..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-600 resize-none"
                  rows={3}
                />
              </div>

              <button
                onClick={handleCompleteDelivery}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-lg font-bold text-lg transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-6 h-6" />
                Complete Delivery
              </button>
            </div>
          </div>
        ) : step === 'gps_waiting' ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-2">Checking Location...</h2>
            <p className="text-gray-400">Verifying you're at the delivery location</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4">{load.load_number}</h2>

              <div className="space-y-3 mb-6">
                <div>
                  <p className="text-sm text-gray-400">Delivery Address</p>
                  <p className="text-white font-medium">{load.delivery_address || load.pickup_address}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Status</p>
                  <p className="text-white font-medium capitalize">{load.status.replace('_', ' ')}</p>
                </div>
              </div>

              {driverLocation && !isAtDelivery && (
                <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-6 mb-4">
                  <div className="flex items-center gap-3 mb-4">
                    <Target className="w-8 h-8 text-yellow-400" />
                    <div>
                      <p className="text-yellow-400 font-semibold text-lg">Not At Delivery Yet</p>
                      <p className="text-yellow-400/70 text-sm">You must be within 0.5 miles of delivery to verify</p>
                    </div>
                  </div>

                  <div className="bg-gray-900 rounded-lg p-4 mb-4">
                    <p className="text-white text-center text-lg font-medium">
                      You are{' '}
                      <span className="text-yellow-400">
                        {distanceToDelivery >= 5280
                          ? `${(distanceToDelivery / 5280).toFixed(2)} miles`
                          : `${Math.round(distanceToDelivery)} feet`}
                      </span>
                      {' '}from delivery
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

                  {distanceToDelivery / 5280 > 1 && (
                    <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-4">
                      <p className="text-red-400 text-sm font-medium mb-2">
                        You are {(distanceToDelivery / 5280).toFixed(1)} miles from the delivery location.
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
                      onClick={handleCheckDeliveryLocation}
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
                onClick={handleCheckDeliveryLocation}
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
                    {driverLocation && !isAtDelivery ? 'Check Location Again' : 'Check My Location'}
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
