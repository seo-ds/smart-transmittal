import React, { useState, useEffect } from 'react';
import { X, Search, Download, Filter, BarChart3, Calendar, Building2, FileText as FileTextIcon } from 'lucide-react';
import { supabase } from './supabaseClient';
import { useAuth } from './AuthContext';

interface TransmittalRecord {
  id: string;
  transmittal_number: string;
  recipient_company: string | null;
  project_name: string | null;
  status: string;
  date: string | null;
  items: any;
  created_at: string;
}

interface EnhancedHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadTransmittal: (transmittal: any) => void;
}

export const EnhancedHistory: React.FC<EnhancedHistoryProps> = ({
  isOpen,
  onClose,
  onLoadTransmittal
}) => {
  const { user } = useAuth();
  const [transmittals, setTransmittals] = useState<TransmittalRecord[]>([]);
  const [filteredTransmittals, setFilteredTransmittals] = useState<TransmittalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      loadTransmittals();
    }
  }, [isOpen, user]);

  useEffect(() => {
    filterTransmittals();
  }, [transmittals, searchTerm, statusFilter, dateFrom, dateTo]);

  const loadTransmittals = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('transmittals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTransmittals(data);
    }
    setLoading(false);
  };

  const filterTransmittals = () => {
    let filtered = [...transmittals];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.transmittal_number?.toLowerCase().includes(term) ||
          t.recipient_company?.toLowerCase().includes(term) ||
          t.project_name?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }

    if (dateFrom) {
      filtered = filtered.filter((t) => t.date && t.date >= dateFrom);
    }

    if (dateTo) {
      filtered = filtered.filter((t) => t.date && t.date <= dateTo);
    }

    setFilteredTransmittals(filtered);
  };

  const exportToCSV = () => {
    const headers = ['Transmittal Number', 'Date', 'Company', 'Project', 'Status', 'Items'];
    const rows = filteredTransmittals.map((t) => [
      t.transmittal_number,
      t.date || '',
      t.recipient_company || '',
      t.project_name || '',
      t.status,
      Array.isArray(t.items) ? t.items.length : 0,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transmittals-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getStats = () => {
    const total = transmittals.length;
    const byStatus = transmittals.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalItems = transmittals.reduce((sum, t) => {
      return sum + (Array.isArray(t.items) ? t.items.length : 0);
    }, 0);

    return { total, byStatus, totalItems };
  };

  const stats = getStats();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[85vh] overflow-hidden flex flex-col m-4">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileTextIcon className="w-5 h-5 text-blue-600" />
            Transmittal History
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowStats(!showStats)}
              className="px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              Stats
            </button>
            <button
              onClick={exportToCSV}
              className="px-4 py-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {showStats && (
          <div className="p-6 bg-gradient-to-r from-blue-50 to-slate-50 border-b">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-slate-600">Total Transmittals</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-2xl font-bold text-green-600">{stats.byStatus.sent || 0}</div>
                <div className="text-sm text-slate-600">Sent</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-2xl font-bold text-orange-600">{stats.byStatus.pending || 0}</div>
                <div className="text-sm text-slate-600">Pending</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-2xl font-bold text-slate-600">{stats.totalItems}</div>
                <div className="text-sm text-slate-600">Total Documents</div>
              </div>
            </div>
          </div>
        )}

        <div className="p-6 border-b bg-slate-50 space-y-3">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by number, company, or project..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="pending">Pending</option>
              <option value="received">Received</option>
            </select>
          </div>
          <div className="flex gap-3 items-center">
            <Calendar className="w-4 h-4 text-slate-500" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
              placeholder="From"
            />
            <span className="text-slate-500">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
              placeholder="To"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                }}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Clear dates
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12 text-slate-500">Loading history...</div>
          ) : filteredTransmittals.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No transmittals found</div>
          ) : (
            <div className="space-y-2">
              {filteredTransmittals.map((transmittal) => (
                <div
                  key={transmittal.id}
                  className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:border-blue-300 transition-colors"
                >
                  <div className="flex-1 grid grid-cols-5 gap-4">
                    <div>
                      <div className="font-mono text-sm font-semibold text-slate-800">
                        {transmittal.transmittal_number}
                      </div>
                      <div className="text-xs text-slate-500">{transmittal.date}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-700">{transmittal.recipient_company}</div>
                      <div className="text-xs text-slate-500">Company</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-700">{transmittal.project_name}</div>
                      <div className="text-xs text-slate-500">Project</div>
                    </div>
                    <div>
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          transmittal.status === 'sent'
                            ? 'bg-green-100 text-green-700'
                            : transmittal.status === 'received'
                            ? 'bg-blue-100 text-blue-700'
                            : transmittal.status === 'pending'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {transmittal.status}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600">
                      {Array.isArray(transmittal.items) ? transmittal.items.length : 0} items
                    </div>
                  </div>
                  <button
                    onClick={() => onLoadTransmittal(transmittal)}
                    className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                  >
                    Load
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
