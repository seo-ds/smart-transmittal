import React, { useState, useEffect } from 'react';
import { X, Download, FileSpreadsheet, CheckSquare, Square } from 'lucide-react';
import { supabase } from './supabaseClient';
import { useAuth } from './AuthContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface BulkExportProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BulkExport: React.FC<BulkExportProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [transmittals, setTransmittals] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      loadTransmittals();
    }
  }, [isOpen, user]);

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

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  };

  const selectAll = () => {
    if (selected.size === transmittals.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(transmittals.map(t => t.id)));
    }
  };

  const exportSummaryReport = () => {
    const selectedTransmittals = transmittals.filter(t => selected.has(t.id));

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Transmittal Summary Report", pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: 'center' });
    doc.text(`Total Transmittals: ${selectedTransmittals.length}`, pageWidth / 2, 34, { align: 'center' });

    const tableData = selectedTransmittals.map(t => [
      t.transmittal_number,
      t.date || '',
      t.recipient_company || '',
      t.project_name || '',
      t.status,
      Array.isArray(t.items) ? t.items.length : 0,
      t.prepared_by || ''
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['Number', 'Date', 'Company', 'Project', 'Status', 'Items', 'Prepared By']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 22 },
        2: { cellWidth: 35 },
        3: { cellWidth: 35 },
        4: { cellWidth: 20 },
        5: { cellWidth: 15 },
        6: { cellWidth: 30 }
      }
    });

    doc.save(`transmittal-summary-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportBulkPDFs = async () => {
    setExporting(true);

    alert('Bulk PDF export will generate individual PDFs for each selected transmittal. This feature requires the full PDF generation logic from your main app.');

    setExporting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col m-4">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            Bulk Export
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={selectAll}
              className="px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
            >
              {selected.size === transmittals.length ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-sm text-slate-600">
              {selected.size} of {transmittals.length} selected
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportSummaryReport}
              disabled={selected.size === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Summary Report
            </button>
            <button
              onClick={exportBulkPDFs}
              disabled={selected.size === 0 || exporting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Exporting...' : 'Bulk PDFs'}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12 text-slate-500">Loading transmittals...</div>
          ) : transmittals.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No transmittals available</div>
          ) : (
            <div className="space-y-2">
              {transmittals.map((transmittal) => (
                <div
                  key={transmittal.id}
                  onClick={() => toggleSelection(transmittal.id)}
                  className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all ${
                    selected.has(transmittal.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-blue-300 bg-white'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {selected.has(transmittal.id) ? (
                      <CheckSquare className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 grid grid-cols-4 gap-4">
                    <div>
                      <div className="font-mono text-sm font-semibold text-slate-800">
                        {transmittal.transmittal_number}
                      </div>
                      <div className="text-xs text-slate-500">{transmittal.date}</div>
                    </div>
                    <div className="text-sm text-slate-700">{transmittal.recipient_company}</div>
                    <div className="text-sm text-slate-700">{transmittal.project_name}</div>
                    <div className="text-sm text-slate-600">
                      {Array.isArray(transmittal.items) ? transmittal.items.length : 0} items
                    </div>
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
