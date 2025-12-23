import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface CreateLoadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateLoadModal({ onClose, onSuccess }: CreateLoadModalProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    pickup_address: '',
    pickup_latitude: '',
    pickup_longitude: '',
    delivery_address: '',
    assigned_driver_id: '',
  });

  const [drivers, setDrivers] = useState<any[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);

  useEffect(() => {
    loadDrivers();
  }, [profile?.company_id]);

  const loadDrivers = async () => {
    if (!profile?.company_id) return;

    try {
      setLoadingDrivers(true);
      console.log('✅ CreateLoad: Loading drivers for company:', profile.company_id);

      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, name, user_type')
        .eq('company_id', profile.company_id)
        .eq('user_type', 'driver')
        .order('name');

      if (error) throw error;
      console.log('✅ CreateLoad: Found drivers:', data);
      setDrivers(data || []);
    } catch (err: any) {
      console.error('❌ CreateLoad: Driver load error:', err);
    } finally {
      setLoadingDrivers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('✅ CreateLoad: Starting load creation...');

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated. Please log in again.');
      }
      console.log('✅ CreateLoad: User authenticated:', user.id);

      // Get user's profile with company_id
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('company_id, name, user_type')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('❌ CreateLoad: Profile fetch error:', profileError);
        throw new Error('Could not fetch user profile. Please contact support.');
      }

      if (!userProfile?.company_id) {
        console.error('❌ CreateLoad: No company_id found in profile:', userProfile);
        throw new Error('Your account is not associated with a company. Please contact support.');
      }

      console.log('✅ CreateLoad: Company ID verified:', userProfile.company_id);
      console.log('✅ CreateLoad: User:', userProfile.name, '(' + userProfile.user_type + ')');

      const loadNumber = `LOAD-${Date.now().toString().slice(-6)}`;

      const insertData: any = {
        company_id: userProfile.company_id,
        load_number: loadNumber,
        pickup_address: formData.pickup_address,
        pickup_latitude: parseFloat(formData.pickup_latitude) || 0,
        pickup_longitude: parseFloat(formData.pickup_longitude) || 0,
        delivery_address: formData.delivery_address || null,
        status: formData.assigned_driver_id ? 'assigned' : 'pending',
      };

      if (formData.assigned_driver_id) {
        insertData.assigned_driver_id = formData.assigned_driver_id;
        const driver = drivers.find(d => d.id === formData.assigned_driver_id);
        console.log('✅ CreateLoad: Assigning to driver:', driver?.email || driver?.name);
      }

      console.log('✅ CreateLoad: Inserting load with data:', insertData);

      const { data, error: insertError } = await supabase
        .from('loads')
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        console.error('❌ CreateLoad: Insert error:', insertError);
        throw insertError;
      }

      console.log('✅ CreateLoad: Load created successfully:', data);

      // Show success toast
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
      toast.textContent = `✅ Load ${loadNumber} created successfully!`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('❌ CreateLoad: Error creating load:', err);

      // User-friendly error messages
      let errorMessage = 'Failed to create load';
      if (err.message?.includes('company_id')) {
        errorMessage = 'Your account is not associated with a company. Please contact support.';
      } else if (err.message?.includes('not authenticated')) {
        errorMessage = 'Your session expired. Please log in again.';
      } else if (err.message?.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-800">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Create New Load</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Pickup Address *
            </label>
            <input
              type="text"
              required
              value={formData.pickup_address}
              onChange={(e) => setFormData({ ...formData, pickup_address: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-600"
              placeholder="1234 Street, City, State ZIP"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Pickup Latitude *
              </label>
              <input
                type="number"
                step="any"
                required
                value={formData.pickup_latitude}
                onChange={(e) => setFormData({ ...formData, pickup_latitude: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-600"
                placeholder="34.0522"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Pickup Longitude *
              </label>
              <input
                type="number"
                step="any"
                required
                value={formData.pickup_longitude}
                onChange={(e) => setFormData({ ...formData, pickup_longitude: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-600"
                placeholder="-118.2437"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Delivery Address
            </label>
            <input
              type="text"
              value={formData.delivery_address}
              onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-600"
              placeholder="5678 Street, City, State ZIP"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Assign Driver (Optional)
            </label>
            <select
              value={formData.assigned_driver_id}
              onChange={(e) => setFormData({ ...formData, assigned_driver_id: e.target.value })}
              disabled={loadingDrivers}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {loadingDrivers ? 'Loading drivers...' : 'Select a driver (optional)'}
              </option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.name || driver.email} - {driver.email}
                </option>
              ))}
            </select>
            {drivers.length === 0 && !loadingDrivers && (
              <p className="text-sm text-gray-400 mt-2">
                No drivers available. Add drivers to your company first.
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors font-semibold"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Creating...
                </>
              ) : 'Create Load'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
