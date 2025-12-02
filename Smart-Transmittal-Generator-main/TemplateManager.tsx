import React, { useState, useEffect } from 'react';
import { X, Save, Folder, Trash2, Share2, Lock } from 'lucide-react';
import { supabase } from './supabaseClient';
import { useAuth } from './AuthContext';
import { ProjectDetails } from './types';

interface Template {
  id: string;
  name: string;
  department: string | null;
  recipient_company: string | null;
  is_shared: boolean;
  template_data: any;
  created_at: string;
}

interface TemplateManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadTemplate: (templateData: Partial<ProjectDetails>) => void;
  currentProjectDetails: ProjectDetails;
}

export const TemplateManager: React.FC<TemplateManagerProps> = ({
  isOpen,
  onClose,
  onLoadTemplate,
  currentProjectDetails
}) => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingNew, setSavingNew] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [shareTemplate, setShareTemplate] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      loadTemplates();
    }
  }, [isOpen, user]);

  const loadTemplates = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTemplates(data);
    }
    setLoading(false);
  };

  const saveTemplate = async () => {
    if (!user || !newTemplateName.trim()) return;

    setSavingNew(true);
    const templateData = {
      sender: currentProjectDetails.sender,
      senderEmail: currentProjectDetails.senderEmail,
      senderContactNumber: currentProjectDetails.senderContactNumber,
      senderContactDetails: currentProjectDetails.senderContactDetails,
      logoBase64: currentProjectDetails.logoBase64,
      department: currentProjectDetails.department,
      recipientName: currentProjectDetails.recipientName,
      recipientCompany: currentProjectDetails.recipientCompany,
      recipientAddress: currentProjectDetails.recipientAddress,
      attentionTo: currentProjectDetails.attentionTo,
      contactNo: currentProjectDetails.contactNo,
      purpose: currentProjectDetails.purpose,
    };

    const { error } = await supabase.from('templates').insert({
      user_id: user.id,
      name: newTemplateName,
      department: currentProjectDetails.department,
      recipient_company: currentProjectDetails.recipientCompany,
      template_data: templateData,
      is_shared: shareTemplate,
    });

    if (!error) {
      setNewTemplateName('');
      setShareTemplate(false);
      loadTemplates();
    }
    setSavingNew(false);
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('Delete this template?')) return;

    await supabase.from('templates').delete().eq('id', id);
    loadTemplates();
  };

  const loadTemplate = (template: Template) => {
    onLoadTemplate(template.template_data);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col m-4">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Folder className="w-5 h-5 text-blue-600" />
            Template Manager
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 border-b bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Save Current Configuration</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="Template name..."
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <label className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={shareTemplate}
                onChange={(e) => setShareTemplate(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-slate-700">Share</span>
            </label>
            <button
              onClick={saveTemplate}
              disabled={!newTemplateName.trim() || savingNew}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Saved Templates</h3>
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading templates...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No templates saved yet</div>
          ) : (
            <div className="space-y-2">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:border-blue-300 transition-colors group"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-slate-800">{template.name}</h4>
                      {template.is_shared ? (
                        <Share2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <Lock className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="text-sm text-slate-500 mt-1">
                      {template.department && <span>Dept: {template.department}</span>}
                      {template.recipient_company && (
                        <span className="ml-3">To: {template.recipient_company}</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {new Date(template.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => loadTemplate(template)}
                      className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => deleteTemplate(template.id)}
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
