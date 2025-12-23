import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Plus,
  Truck,
  MapPin,
  User,
  Calendar,
  Loader2,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from '../hooks/useNavigate';
import { supabase } from '../lib/supabase';
import CreateLoadModal from '../components/CreateLoadModal';

interface Load {
  id: string;
  load_number: string;
  pickup_address: string;
  pickup_latitude: number;
  pickup_longitude: number;
  delivery_address: string;
  status: string;
  created_at: string;
  assigned_driver_id: string | null;
  verified_at: string | null;
}

interface Driver {
  id: string;
  name: string;
  email: string;
}

export default function ManageLoadsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [loads, setLoads] = useState<Load[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    totalLoads: 0,
    pending: 0,
    atPickup: 0,
    inTransit: 0,
    delivered: 0,
  });

  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);
  const [assigningDriver, setAssigningDriver] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsLoad, setDetailsLoad] = useState<Load | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [loadsResponse, driversResponse] = await Promise.all([
        supabase
          .from('loads')
          .select('*')
          .eq('company_id', profile?.company_id)
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('id, name, email')
          .eq('company_id', profile?.company_id)
          .eq('role', 'driver'),
      ]);

      if (loadsResponse.error) throw loadsResponse.error;
      if (driversResponse.error) throw driversResponse.error;

      const loadedLoads = loadsResponse.data || [];
      setLoads(loadedLoads);
      setDrivers(driversResponse.data || []);

      // Calculate stats
      setStats({
        totalLoads: loadedLoads.length,
        pending: loadedLoads.filter(l => ['pending', 'assigned'].includes(l.status)).length,
        atPickup: loadedLoads.filter(l => ['verified', 'at_pickup'].includes(l.status)).length,
        inTransit: loadedLoads.filter(l => ['in_transit', 'at_delivery'].includes(l.status)).length,
        delivered: loadedLoads.filter(l => l.status === 'delivered').length,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignDriver = async (loadId: string, driverId: string) => {
    try {
      setAssigningDriver(true);
      setError('');

      const { error: updateError } = await supabase
        .from('loads')
        .update({
          assigned_driver_id: driverId,
          status: 'assigned',
        })
        .eq('id', loadId);

      if (updateError) throw updateError;

      await loadData();
      setSelectedLoad(null);
    } catch (err: any) {
      setError(err.message || 'Failed to assign driver');
    } finally {
      setAssigningDriver(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-600/20 text-gray-400 border-gray-600/30';
      case 'assigned':
        return 'bg-blue-600/20 text-blue-400 border-blue-600/30';
      case 'verified':
      case 'at_pickup':
        return 'bg-green-600/20 text-green-400 border-green-600/30';
      case 'in_transit':
        return 'bg-blue-600/20 text-blue-400 border-blue-600/30';
      case 'at_delivery':
        return 'bg-green-600/20 text-green-400 border-green-600/30';
      case 'delivered':
        return 'bg-gray-600/20 text-gray-400 border-gray-600/30';
      case 'cancelled':
        return 'bg-red-600/20 text-red-400 border-red-600/30';
      default:
        return 'bg-gray-600/20 text-gray-400 border-gray-600/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'assigned':
        return <User className="w-4 h-4" />;
      case 'verified':
      case 'at_pickup':
        return <CheckCircle className="w-4 h-4" />;
      case 'in_transit':
        return <Truck className="w-4 h-4" />;
      case 'at_delivery':
        return <CheckCircle className="w-4 h-4" />;
      case 'delivered':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getDriverName = (driverId: string | null) => {
    if (!driverId) return 'Unassigned';
    const driver = drivers.find((d) => d.id === driverId);
    return driver?.name || 'Unknown Driver';
  };

  // Filter loads based on search query
  const filteredLoads = loads.filter((load) => {
    const query = searchQuery.toLowerCase();
    const driverName = getDriverName(load.assigned_driver_id).toLowerCase();

    return (
      load.load_number.toLowerCase().includes(query) ||
      load.pickup_address?.toLowerCase().includes(query) ||
      load.delivery_address?.toLowerCase().includes(query) ||
      driverName.includes(query) ||
      load.status.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="bg-gray-900 border-b border-gray-800 p-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Manage Loads</h1>
            <p className="text-gray-400">Assign drivers and track load status</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Load
          </button>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4 mb-6 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Stats Dashboard */}
        {loads.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-8">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 md:p-6 hover:border-blue-600/50 transition-colors">
              <div className="text-3xl md:text-4xl font-bold text-white mb-1 md:mb-2">{stats.totalLoads}</div>
              <div className="text-xs md:text-sm text-gray-400">Total Loads</div>
            </div>
            <div className="bg-gray-900 border border-yellow-800/50 rounded-lg p-4 md:p-6 hover:border-yellow-600 transition-colors">
              <div className="text-3xl md:text-4xl font-bold text-yellow-500 mb-1 md:mb-2">{stats.pending}</div>
              <div className="text-xs md:text-sm text-gray-400">Pending</div>
            </div>
            <div className="bg-gray-900 border border-green-800/50 rounded-lg p-4 md:p-6 hover:border-green-600 transition-colors">
              <div className="text-3xl md:text-4xl font-bold text-green-500 mb-1 md:mb-2">{stats.atPickup}</div>
              <div className="text-xs md:text-sm text-gray-400">At Pickup</div>
            </div>
            <div className="bg-gray-900 border border-blue-800/50 rounded-lg p-4 md:p-6 hover:border-blue-600 transition-colors">
              <div className="text-3xl md:text-4xl font-bold text-blue-500 mb-1 md:mb-2">{stats.inTransit}</div>
              <div className="text-xs md:text-sm text-gray-400">In Transit</div>
            </div>
            <div className="bg-gray-900 border border-green-800/50 rounded-lg p-4 md:p-6 hover:border-green-600 transition-colors col-span-2 sm:col-span-1">
              <div className="text-3xl md:text-4xl font-bold text-green-600 mb-1 md:mb-2">{stats.delivered}</div>
              <div className="text-xs md:text-sm text-gray-400">Delivered</div>
            </div>
          </div>
        )}

        {loads.length > 0 && (
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search by load number, address, driver, or status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 border border-gray-700 bg-gray-800 text-white rounded-lg focus:outline-none focus:border-blue-600 placeholder-gray-500"
            />
            <p className="text-sm text-gray-400 mt-2">
              Showing {filteredLoads.length} of {loads.length} loads
            </p>
          </div>
        )}

        {loads.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <Truck className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No Loads Yet</h2>
            <p className="text-gray-400 mb-6">Create your first load to get started</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Load
            </button>
          </div>
        ) : filteredLoads.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <p className="text-gray-400 mb-4">No loads match your search</p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-blue-400 hover:text-blue-300"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredLoads.map((load) => (
              <div
                key={load.id}
                onClick={() => {
                  setDetailsLoad(load);
                  setShowDetailsModal(true);
                }}
                className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-blue-600/50 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">{load.load_number}</h3>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                          load.status
                        )}`}
                      >
                        {getStatusIcon(load.status)}
                        {load.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-400">
                        Created {new Date(load.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {load.status === 'pending' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLoad(load);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      Assign Driver
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-400">Pickup Location</p>
                      <p className="text-white">{load.pickup_address}</p>
                    </div>
                  </div>

                  {load.delivery_address && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-400">Delivery Location</p>
                        <p className="text-white">{load.delivery_address}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400">Driver:</span>
                  <span className="text-white font-medium">{getDriverName(load.assigned_driver_id)}</span>
                </div>

                {load.verified_at && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    Verified on {new Date(load.verified_at).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {selectedLoad && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-md w-full">
              <h3 className="text-xl font-semibold text-white mb-4">
                Assign Driver to {selectedLoad.load_number}
              </h3>

              {drivers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">No drivers available in your company</p>
                  <button
                    onClick={() => setSelectedLoad(null)}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
                    {drivers.map((driver) => (
                      <button
                        key={driver.id}
                        onClick={() => handleAssignDriver(selectedLoad.id, driver.id)}
                        disabled={assigningDriver}
                        className="w-full text-left bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800 disabled:cursor-not-allowed border border-gray-700 hover:border-blue-600 rounded-lg p-4 transition-colors"
                      >
                        <p className="text-white font-medium">{driver.name}</p>
                        <p className="text-gray-400 text-sm">{driver.email}</p>
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setSelectedLoad(null)}
                    disabled={assigningDriver}
                    className="w-full bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-2 rounded-lg font-medium transition-colors"
                  >
                    {assigningDriver ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Assigning...
                      </span>
                    ) : (
                      'Cancel'
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateLoadModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            loadData();
            setShowCreateModal(false);
          }}
        />
      )}

      {/* Load Details Modal */}
      {showDetailsModal && detailsLoad && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDetailsModal(false)}
        >
          <div
            className="bg-gray-900 border border-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-3">{detailsLoad.load_number}</h2>
                  <span
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(
                      detailsLoad.status
                    )}`}
                  >
                    {getStatusIcon(detailsLoad.status)}
                    {detailsLoad.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XCircle className="w-8 h-8" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Pickup Location
                    </h3>
                    <p className="text-white font-medium mb-2">{detailsLoad.pickup_address}</p>
                    <p className="text-gray-400 text-sm font-mono mb-2">
                      {detailsLoad.pickup_latitude.toFixed(6)}, {detailsLoad.pickup_longitude.toFixed(6)}
                    </p>
                    <a
                      href={`https://www.google.com/maps?q=${detailsLoad.pickup_latitude},${detailsLoad.pickup_longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-sm inline-flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Open in Google Maps →
                    </a>
                  </div>

                  {detailsLoad.delivery_address && (
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Delivery Location
                      </h3>
                      <p className="text-white font-medium">{detailsLoad.delivery_address}</p>
                    </div>
                  )}

                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Assigned Driver
                    </h3>
                    <p className="text-white font-medium">{getDriverName(detailsLoad.assigned_driver_id)}</p>
                    {detailsLoad.assigned_driver_id && (
                      <p className="text-gray-400 text-sm">
                        {drivers.find(d => d.id === detailsLoad.assigned_driver_id)?.email}
                      </p>
                    )}
                  </div>

                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Created
                    </h3>
                    <p className="text-white font-medium">
                      {new Date(detailsLoad.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                {detailsLoad.verified_at && (
                  <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-green-400 mb-2 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Verification Details
                    </h3>
                    <p className="text-green-300">
                      Verified at {new Date(detailsLoad.verified_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-800">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-lg font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
