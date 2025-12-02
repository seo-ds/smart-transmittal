import React, { useState, useEffect } from 'react';
import { X, Building2, Save, Plus, Trash2 } from 'lucide-react';
import { supabase } from './supabaseClient';
import { useAuth } from './AuthContext';

interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  contact_details: string | null;
  color_scheme: {
    primary: string;
    secondary: string;
  };
}

interface CompanyProfileProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCompany: (company: Company) => void;
}

export const CompanyProfile: React.FC<CompanyProfileProps> = ({
  isOpen,
  onClose,
  onSelectCompany
}) => {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newCompany, setNewCompany] = useState({
    name: '',
    contact_details: '',
    primary_color: '#3B82F6',
    secondary_color: '#1E40AF'
  });

  useEffect(() => {
    if (isOpen && user) {
      loadCompanies();
    }
  }, [isOpen, user]);

  const loadCompanies = async () => {
    if (!user) {
      console.log('CompanyProfile: No user found');
      return;
    }

    console.log('CompanyProfile: Loading companies for user:', user.id);
    setLoading(true);
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    console.log('CompanyProfile: Query result:', { data, error });

    if (!error && data) {
      console.log('CompanyProfile: Setting companies:', data.length);
      setCompanies(data);
    } else if (error) {
      console.error('CompanyProfile: Error loading companies:', error);
    }
    setLoading(false);
  };

  const createCompany = async () => {
    if (!user || !newCompany.name.trim()) return;

    const { error } = await supabase.from('companies').insert({
      owner_id: user.id,
      name: newCompany.name,
      contact_details: newCompany.contact_details,
      color_scheme: {
        primary: newCompany.primary_color,
        secondary: newCompany.secondary_color
      }
    });

    if (!error) {
      setNewCompany({
        name: '',
        contact_details: '',
        primary_color: '#3B82F6',
        secondary_color: '#1E40AF'
      });
      setShowNewForm(false);
      loadCompanies();
    }
  };

  const deleteCompany = async (id: string) => {
    if (!confirm('Delete this company profile? This will not delete associated transmittals.')) return;

    await supabase.from('companies').delete().eq('id', id);
    loadCompanies();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col m-4">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Company Profiles
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {showNewForm && (
          <div className="p-6 border-b bg-slate-50">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">New Company Profile</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={newCompany.name}
                onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                placeholder="Company name..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <textarea
                value={newCompany.contact_details}
                onChange={(e) => setNewCompany({ ...newCompany, contact_details: e.target.value })}
                placeholder="Contact details..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none h-24"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Primary Color</label>
                  <input
                    type="color"
                    value={newCompany.primary_color}
                    onChange={(e) => setNewCompany({ ...newCompany, primary_color: e.target.value })}
                    className="w-full h-10 border border-slate-300 rounded-lg cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Secondary Color</label>
                  <input
                    type="color"
                    value={newCompany.secondary_color}
                    onChange={(e) => setNewCompany({ ...newCompany, secondary_color: e.target.value })}
                    className="w-full h-10 border border-slate-300 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={createCompany}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
                <button
                  onClick={() => setShowNewForm(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-slate-700">Your Companies</h3>
            {!showNewForm && (
              <button
                onClick={() => setShowNewForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Company
              </button>
            )}
          </div>

          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading companies...</div>
          ) : companies.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No company profiles yet</div>
          ) : (
            <div className="space-y-2">
              {companies.map((company) => (
                <div
                  key={company.id}
                  className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:border-blue-300 transition-colors"
                  style={{
                    borderLeftWidth: '4px',
                    borderLeftColor: company.color_scheme.primary
                  }}
                >
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-800">{company.name}</h4>
                    {company.contact_details && (
                      <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                        {company.contact_details}
                      </p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <div
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: company.color_scheme.primary }}
                        title="Primary color"
                      />
                      <div
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: company.color_scheme.secondary }}
                        title="Secondary color"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        onSelectCompany(company);
                        onClose();
                      }}
                      className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                    >
                      Use
                    </button>
                    <button
                      onClick={() => deleteCompany(company.id)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
