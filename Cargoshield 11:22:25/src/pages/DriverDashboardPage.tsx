import { useState, useEffect } from 'react';
import { Lock, MapPin, Clock, Package, Truck, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../hooks/useNavigate';
import { supabase } from '../lib/supabase';

interface Load {
  id: string;
  load_number: string;
  pickup_address: string;
  pickup_latitude: number;
  pickup_longitude: number;
  delivery_address: string | null;
  status: string;
  verified_at: string | null;
  created_at: string;
}

export default function DriverDashboardPage() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();

  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    if (user?.id) {
      loadAssignedLoads();
    }
  }, [user?.id]);

  const loadAssignedLoads = async () => {
    try {
      setLoading(true);

      console.log('✅ DriverDashboard: Loading assigned loads...');
      console.log('✅ DriverDashboard: Current User ID:', user?.id);
      console.log('✅ DriverDashboard: Profile Name:', profile?.name);
      console.log('✅ DriverDashboard: Profile Role:', profile?.role);

      const { data, error } = await supabase
        .from('loads')
        .select('*')
        .eq('assigned_driver_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ DriverDashboard: Query error:', error);
        throw error;
      }

      console.log('✅ DriverDashboard: Loads found:', data?.length || 0);
      console.log('✅ DriverDashboard: Loads data:', data);

      setDebugInfo({
        userId: user?.id,
        profileName: profile?.name,
        loadsFound: data?.length || 0,
      });

      setLoads(data || []);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('❌ DriverDashboard: Error loading loads:', err);
      setDebugInfo((prev: any) => ({ ...prev, error: err.message }));
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    console.log('✅ DriverDashboard: Manual refresh triggered');
    setRefreshing(true);
    await loadAssignedLoads();
    setRefreshing(false);
  };

  const handleStartVerification = (load: Load) => {
    navigate(`/loads/verify/${load.id}`);
  };

  const handleBeginPickup = async (loadId: string, loadNumber: string) => {
    const confirmed = window.confirm(
      `Begin cargo pickup for ${loadNumber}?\n\nThis will change the status to "In Transit".`
    );

    if (!confirmed) return;

    try {
      console.log('✅ DriverDashboard: Beginning pickup for load:', loadNumber);

      const { error } = await supabase
        .from('loads')
        .update({
          status: 'in_transit',
          transit_started_at: new Date().toISOString()
        })
        .eq('id', loadId);

      if (error) throw error;

      console.log('✅ DriverDashboard: Load status updated to in_transit');
      console.log('📦 Status: verified → in_transit');
      console.log('🚚 Started at:', new Date().toISOString());

      // Show success toast
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
      toast.textContent = '🚚 Transit Started!';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);

      // Reload loads
      await loadAssignedLoads();
    } catch (err: any) {
      console.error('❌ DriverDashboard: Error updating load status:', err);
      alert('Failed to start pickup. Please try again.');
    }
  };

  const handleArriveAtDelivery = (loadId: string) => {
    navigate(`/verify-delivery/${loadId}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
      case 'assigned':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-yellow-600/20 text-yellow-400 border border-yellow-600/30">
            <Clock className="w-4 h-4" />
            Awaiting Verification
          </span>
        );
      case 'verified':
      case 'at_pickup':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-green-600/20 text-green-400 border border-green-600/30">
            <CheckCircle className="w-4 h-4" />
            Identity Verified
          </span>
        );
      case 'in_transit':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-blue-600/20 text-blue-400 border border-blue-600/30">
            <Truck className="w-4 h-4" />
            In Transit
          </span>
        );
      case 'at_delivery':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-green-600/20 text-green-400 border border-green-600/30">
            <MapPin className="w-4 h-4" />
            At Delivery
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-gray-600/20 text-gray-400 border border-gray-600/30">
            <CheckCircle className="w-4 h-4" />
            Delivered
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-gray-600/20 text-gray-400 border border-gray-600/30">
            {status.replace('_', ' ').toUpperCase()}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-400">Loading your loads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {debugInfo && (
          <div className="bg-blue-900/20 border border-blue-600/30 rounded-xl p-4 mb-6">
            <h3 className="text-blue-400 font-bold mb-2 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Debug Info (Demo Mode)
            </h3>
            <div className="text-sm text-gray-300 space-y-1">
              <p>✅ User ID: <span className="font-mono text-blue-400">{debugInfo.userId?.slice(0, 8)}...</span></p>
              <p>✅ Profile: <span className="text-white">{debugInfo.profileName || 'Not set'}</span></p>
              <p>✅ Loads Found: <span className="text-white font-bold">{debugInfo.loadsFound}</span></p>
              {debugInfo.error && <p className="text-red-400">❌ Error: {debugInfo.error}</p>}
            </div>
          </div>
        )}

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">My Loads</h1>
              <p className="text-gray-400">Welcome back, {profile?.name}</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <svg
                className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          {lastUpdated && (
            <p className="text-sm text-gray-500 mb-4">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>

        {loads.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="w-10 h-10 text-gray-600" />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2">No Loads Assigned</h2>
            <p className="text-gray-400 mb-6">Check back later for new assignments from dispatch</p>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              {refreshing ? 'Checking...' : 'Check for Loads'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {loads.map((load) => (
              <div
                key={load.id}
                className={`bg-gray-900 rounded-xl p-6 transition-all ${
                  load.verified_at
                    ? 'border-2 border-green-600/50'
                    : 'border border-gray-800'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">{load.load_number}</h2>
                    {getStatusBadge(load.status)}
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-400">Pickup Location</p>
                      <p className="text-white font-medium">{load.pickup_address}</p>
                    </div>
                  </div>

                  {load.delivery_address && (
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-400">Delivery Location</p>
                        <p className="text-white font-medium">{load.delivery_address}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-400">Created</p>
                      <p className="text-white font-medium">{new Date(load.created_at).toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Status: Delivered */}
                  {load.status === 'delivered' && (
                    <div className="border-t border-gray-800 pt-4 mt-4">
                      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4 opacity-75">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <CheckCircle className="w-5 h-5 text-gray-500" />
                          <p className="text-gray-400 font-medium">Delivery Complete</p>
                        </div>
                        <p className="text-gray-500 text-sm text-center">
                          Completed at {load.verified_at ? new Date(load.verified_at).toLocaleString() : 'N/A'}
                        </p>
                      </div>

                      <button
                        disabled
                        className="w-full bg-slate-700 text-gray-400 py-4 min-h-[48px] rounded-lg font-semibold cursor-default"
                      >
                        Delivery Complete
                      </button>
                    </div>
                  )}

                  {/* Status: In Transit or At Delivery */}
                  {(load.status === 'in_transit' || load.status === 'at_delivery') && (
                    <div className="border-t border-gray-800 pt-4 mt-4">
                      <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Truck className="w-5 h-5 text-blue-400" />
                          <h3 className="text-blue-400 font-semibold">
                            {load.status === 'in_transit' ? 'In Transit' : 'At Delivery Location'}
                          </h3>
                        </div>
                        <p className="text-gray-300 text-sm mb-4">
                          {load.status === 'in_transit' ? 'Drive safely to the delivery location' : 'Ready to complete delivery'}
                        </p>
                        {load.delivery_address && (
                          <div className="bg-slate-800 rounded p-3">
                            <p className="text-xs text-gray-500 mb-1">Delivering to:</p>
                            <p className="text-white font-medium">{load.delivery_address}</p>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleArriveAtDelivery(load.id)}
                        className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white py-4 min-h-[48px] rounded-lg font-bold text-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <MapPin className="w-5 h-5" />
                        {load.status === 'in_transit' ? "I've Arrived at Delivery" : "Complete Delivery Verification"}
                      </button>
                    </div>
                  )}

                  {/* Status: Verified / At Pickup */}
                  {(load.status === 'verified' || load.status === 'at_pickup') && (
                    <div className="border-t border-gray-800 pt-4 mt-4">
                      <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-4 mb-4">
                        <p className="text-green-400 font-medium text-center">
                          ✓ Identity Verified - At Pickup Location
                        </p>
                        {load.verified_at && (
                          <p className="text-green-400/70 text-sm text-center mt-1">
                            Verified at {new Date(load.verified_at).toLocaleTimeString()}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBeginPickup(load.id, load.load_number);
                        }}
                        className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white py-4 min-h-[48px] rounded-lg font-bold text-lg transition-colors"
                      >
                        Begin Pickup
                      </button>
                    </div>
                  )}

                  {/* Status: Pending / Assigned */}
                  {(load.status === 'pending' || load.status === 'assigned') && (
                    <div className="border-t border-gray-800 pt-4 mt-4">
                      <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <Lock className="w-5 h-5 text-yellow-400" />
                          <p className="text-yellow-400 font-medium">Awaiting Verification</p>
                        </div>
                        <p className="text-yellow-400/70 text-sm text-center">
                          Navigate to pickup location to verify identity
                        </p>
                      </div>

                      <button
                        onClick={() => handleStartVerification(load)}
                        className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white py-4 min-h-[48px] rounded-lg font-semibold transition-colors text-lg flex items-center justify-center gap-2"
                      >
                        <MapPin className="w-6 h-6" />
                        Verify Load
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
