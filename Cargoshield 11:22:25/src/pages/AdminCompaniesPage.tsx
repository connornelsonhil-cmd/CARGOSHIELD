import { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Edit,
  Users,
  Package,
  Search,
  AlertCircle,
  X,
  CheckCircle,
  Truck,
  Briefcase,
  Box,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from '../hooks/useNavigate';

interface Company {
  id: string;
  name: string;
  company_type: string | null;
  mc_number: string | null;
  dot_number: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  status: string;
  created_at: string;
  driver_count?: number;
  load_count?: number;
}

export default function AdminCompaniesPage() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    company_type: 'carrier',
    mc_number: '',
    dot_number: '',
    contact_email: '',
    contact_phone: '',
    address: '',
  });

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      console.log('✅ AdminCompanies: Loading companies...');

      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .order('name');

      if (companiesError) throw companiesError;

      // Get driver counts for each company
      const { data: driverCounts } = await supabase
        .from('user_profiles')
        .select('company_id, user_type')
        .eq('user_type', 'driver');

      // Get load counts for each company
      const { data: loadCounts } = await supabase
        .from('loads')
        .select('company_id');

      // Aggregate counts
      const driverCountMap: Record<string, number> = {};
      const loadCountMap: Record<string, number> = {};

      driverCounts?.forEach((driver) => {
        if (driver.company_id) {
          driverCountMap[driver.company_id] = (driverCountMap[driver.company_id] || 0) + 1;
        }
      });

      loadCounts?.forEach((load) => {
        if (load.company_id) {
          loadCountMap[load.company_id] = (loadCountMap[load.company_id] || 0) + 1;
        }
      });

      const companiesWithCounts = companiesData?.map((company) => ({
        ...company,
        driver_count: driverCountMap[company.id] || 0,
        load_count: loadCountMap[company.id] || 0,
      })) || [];

      console.log('✅ AdminCompanies: Loaded', companiesWithCounts.length, 'companies');
      setCompanies(companiesWithCounts);
    } catch (err: any) {
      console.error('❌ AdminCompanies: Load error:', err);
      setError('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      if (!formData.name.trim()) {
        throw new Error('Company name is required');
      }

      console.log('✅ AdminCompanies: Adding company:', formData.name);

      const { data, error: insertError } = await supabase
        .from('companies')
        .insert({
          name: formData.name,
          company_type: formData.company_type || null,
          mc_number: formData.mc_number || null,
          dot_number: formData.dot_number || null,
          contact_email: formData.contact_email || null,
          contact_phone: formData.contact_phone || null,
          address: formData.address || null,
          status: 'active',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      console.log('✅ AdminCompanies: Company added:', data.id);

      // Reset form
      setFormData({
        name: '',
        company_type: 'carrier',
        mc_number: '',
        dot_number: '',
        contact_email: '',
        contact_phone: '',
        address: '',
      });

      setShowAddModal(false);
      loadCompanies();

      // Show success message
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      toast.textContent = '✓ Company added successfully!';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } catch (err: any) {
      console.error('❌ AdminCompanies: Add error:', err);
      setError(err.message || 'Failed to add company');
    } finally {
      setSaving(false);
    }
  };

  const getTypeIcon = (type: string | null) => {
    switch (type) {
      case 'carrier':
        return <Truck className="w-4 h-4" />;
      case 'broker':
        return <Briefcase className="w-4 h-4" />;
      case 'shipper':
        return <Box className="w-4 h-4" />;
      default:
        return <Building2 className="w-4 h-4" />;
    }
  };

  const getTypeBadge = (type: string | null) => {
    if (!type) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-gray-600/20 text-gray-400 border border-gray-600/30">
          Not Set
        </span>
      );
    }

    const colors = {
      carrier: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
      broker: 'bg-purple-600/20 text-purple-400 border-purple-600/30',
      shipper: 'bg-green-600/20 text-green-400 border-green-600/30',
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${colors[type as keyof typeof colors]}`}>
        {getTypeIcon(type)}
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-600/20 text-green-400 border-green-600/30',
      suspended: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
      inactive: 'bg-gray-600/20 text-gray-400 border-gray-600/30',
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${colors[status as keyof typeof colors]}`}>
        {status === 'active' && <CheckCircle className="w-3 h-3" />}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const filteredCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.mc_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.dot_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: companies.length,
    active: companies.filter((c) => c.status === 'active').length,
    totalDrivers: companies.reduce((sum, c) => sum + (c.driver_count || 0), 0),
    totalLoads: companies.reduce((sum, c) => sum + (c.load_count || 0), 0),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-400">Loading companies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Company Management</h1>
            <p className="text-gray-400">Manage carriers, brokers, and shippers</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Company
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-medium text-gray-400">Total Companies</h3>
            </div>
            <p className="text-3xl font-bold text-white">{stats.total}</p>
          </div>

          <div className="bg-gray-900 border border-green-800/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <h3 className="text-sm font-medium text-gray-400">Active</h3>
            </div>
            <p className="text-3xl font-bold text-green-400">{stats.active}</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-medium text-gray-400">Total Drivers</h3>
            </div>
            <p className="text-3xl font-bold text-white">{stats.totalDrivers}</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Package className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-medium text-gray-400">Total Loads</h3>
            </div>
            <p className="text-3xl font-bold text-white">{stats.totalLoads}</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by company name, MC#, or DOT#..."
              className="w-full pl-12 pr-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

        {/* Companies List */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {filteredCompanies.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                {searchTerm ? 'No companies found' : 'No Companies Yet'}
              </h3>
              <p className="text-gray-400 mb-6">
                {searchTerm
                  ? 'Try a different search term'
                  : 'Add your first company to get started'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Company
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      MC / DOT
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Drivers
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Loads
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredCompanies.map((company) => (
                    <tr
                      key={company.id}
                      className="hover:bg-gray-800/50 cursor-pointer"
                      onClick={() => navigate(`/admin/companies/${company.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-900/30 rounded-lg flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-blue-400" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{company.name}</div>
                            {company.contact_email && (
                              <div className="text-xs text-gray-400">{company.contact_email}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getTypeBadge(company.company_type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">
                          {company.mc_number && (
                            <div className="font-mono">MC: {company.mc_number}</div>
                          )}
                          {company.dot_number && (
                            <div className="font-mono">DOT: {company.dot_number}</div>
                          )}
                          {!company.mc_number && !company.dot_number && (
                            <span className="text-gray-500">Not set</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-white">{company.driver_count || 0}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-white">{company.load_count || 0}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(company.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/companies/${company.id}`);
                          }}
                          className="p-2 hover:bg-blue-900/50 rounded transition-colors"
                          title="View details"
                        >
                          <Edit className="w-4 h-4 text-blue-400" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Company Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Add New Company</h2>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleAddCompany} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Fellow Logistics"
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Company Type
                </label>
                <select
                  value={formData.company_type}
                  onChange={(e) => setFormData({ ...formData, company_type: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-600"
                >
                  <option value="carrier">Carrier</option>
                  <option value="broker">Broker</option>
                  <option value="shipper">Shipper</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    MC Number
                  </label>
                  <input
                    type="text"
                    value={formData.mc_number}
                    onChange={(e) => setFormData({ ...formData, mc_number: e.target.value })}
                    placeholder="123456"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    DOT Number
                  </label>
                  <input
                    type="text"
                    value={formData.dot_number}
                    onChange={(e) => setFormData({ ...formData, dot_number: e.target.value })}
                    placeholder="789012"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    placeholder="contact@company.com"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Main St, City, State, ZIP"
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-600 resize-none"
                />
              </div>

              {error && (
                <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-colors"
                >
                  {saving ? 'Adding...' : 'Add Company'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
