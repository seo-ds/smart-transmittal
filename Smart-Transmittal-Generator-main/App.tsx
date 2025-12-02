import React, { useState, useEffect } from 'react';
import { FileText, Printer, Download, FolderOpen, AlertCircle, CheckCircle2, Image as ImageIcon, Upload, History, Plus, FileSpreadsheet, Settings, Trash2, Pen, Cloud, Building2, LogIn, LogOut, User, Key } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { processFilesWithGemini } from './geminiService';
import { TransmittalItem, ProjectDetails, TransmittalLogEntry, TableColumn } from './types';
import { FileInput } from './FileInput';
import { TransmittalTable } from './TransmittalTable';
import { SettingsModal } from './SettingsModal';
import { SignatureModal } from './SignatureModal';
import { useAuth } from './AuthContext';
import { AuthModal } from './AuthModal';
import { TemplateManager } from './TemplateManager';
import { EnhancedHistory } from './EnhancedHistory';
import { CompanyProfile } from './CompanyProfile';
import { BulkExport } from './BulkExport';
import { CloudSyncService } from './CloudSyncService';
import { supabase } from './supabaseClient';
import { getNextTransmittalNumber } from './TransmittalNumberService';
import { PasswordResetModal } from './PasswordResetModal';

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [driveId, setDriveId] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [items, setItems] = useState<TransmittalItem[]>([]);
  const [history, setHistory] = useState<TransmittalLogEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showPreparedBySignature, setShowPreparedBySignature] = useState(false);
  const [showNotedBySignature, setShowNotedBySignature] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showEnhancedHistory, setShowEnhancedHistory] = useState(false);
  const [showCompanyProfiles, setShowCompanyProfiles] = useState(false);
  const [showBulkExport, setShowBulkExport] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<'draft' | 'sent' | 'received' | 'pending'>('draft');
  const [currentTransmittalId, setCurrentTransmittalId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [savedCompanies, setSavedCompanies] = useState<any[]>([]);
  
  // Column Setup
  const [columns, setColumns] = useState<TableColumn[]>([
    { id: 'qty', label: 'QTY', pdfWidth: 15, width: 'w-[8%]' },
    { id: 'documentType', label: 'Type of Document', pdfWidth: 25, width: 'w-[25%]' },
    { id: 'description', label: 'Description', pdfWidth: 'auto', width: 'w-[40%]' },
    { id: 'remarks', label: 'Remarks', pdfWidth: 40, width: 'w-[20%]', minWidth: 40 },
  ]);
  
  const defaultHeaderText = `Telephone: (028) 372 5023 • (02) 8478-5826
Mobile: 0917 892 2337
Email: info@filepino.com
Unit 1212 High Street South Corporate Plaza Tower 2
26th Street Bonifacio Global City, Taguig City 1634
www.filepino.com`;

  const [projectDetails, setProjectDetails] = useState<ProjectDetails>({
    sender: 'FILEPINO, INC.',
    senderEmail: 'info@filepino.com',
    senderContactNumber: '0917 892 2337',
    senderContactDetails: defaultHeaderText,
    logoBase64: null,
    department: 'Admin', 
    
    recipientName: '',
    recipientCompany: '',
    attentionTo: '',
    recipientAddress: '',
    contactNo: '',
    
    projectName: '',
    projectNumber: '',
    purpose: '', 
    transmittalNumber: '', 
    
    date: new Date().toISOString().split('T')[0],
    timeGenerated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    preparedBy: '',
    notedBy: '',
    timeReleased: '',
    preparedBySignature: null,
    notedBySignature: null 
  });
  
  const [error, setError] = useState<string | null>(null);

  const generateTransmittalNo = async () => {
    if (!user) {
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
      return `TR-FP-${today}-0000-USR`;
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const fullName = profile?.full_name || 'User';
      return await getNextTransmittalNumber(user.id, fullName);
    } catch (error) {
      console.error('Error generating transmittal number:', error);
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
      return `TR-FP-${today}-0000-ERR`;
    }
  };

  // Load Saved Settings & History on Mount
  useEffect(() => {
    const initializeApp = async () => {
      const savedSettings = localStorage.getItem('smart_transmittal_settings');
      const savedHistory = localStorage.getItem('smart_transmittal_history');
      const savedApiKey = localStorage.getItem('gemini_api_key') || '';
      setApiKey(savedApiKey);

      // Load default logo
      const loadDefaultLogo = async () => {
        try {
          const response = await fetch('/Filepino-e1737536290175.png');
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result as string;
            setProjectDetails(prev => ({
              ...prev,
              logoBase64: prev.logoBase64 || base64
            }));
          };
          reader.readAsDataURL(blob);
        } catch (error) {
          console.error('Failed to load default logo:', error);
        }
      };

      const transmittalNo = await generateTransmittalNo();

      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setProjectDetails(prev => ({
          ...prev,
          ...parsed,
          date: new Date().toISOString().split('T')[0],
          timeGenerated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          transmittalNumber: transmittalNo
        }));
        if (!parsed.logoBase64) {
          loadDefaultLogo();
        }
      } else {
          setProjectDetails(prev => ({ ...prev, transmittalNumber: transmittalNo }));
          loadDefaultLogo();
      }

      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    };

    initializeApp();
  }, [user]);

  useEffect(() => {
    const timer = setInterval(() => {
        setProjectDetails(prev => ({
            ...prev,
            timeGenerated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user) {
      loadSavedCompanies();
    }
  }, [user]);

  const loadSavedCompanies = async () => {
    if (!user) {
      console.log('App: No user found for loading companies');
      return;
    }

    console.log('App: Loading companies for user:', user.id);
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    console.log('App: Companies loaded:', { data, error, count: data?.length });

    if (!error && data) {
      setSavedCompanies(data);
      console.log('App: savedCompanies state updated with', data.length, 'companies');
    } else if (error) {
      console.error('App: Error loading companies:', error);
    }
  };

  useEffect(() => {
    const settingsToSave = {
      sender: projectDetails.sender,
      senderEmail: projectDetails.senderEmail,
      senderContactNumber: projectDetails.senderContactNumber,
      senderContactDetails: projectDetails.senderContactDetails,
      logoBase64: projectDetails.logoBase64,
      department: projectDetails.department,
      preparedBy: projectDetails.preparedBy,
      notedBy: projectDetails.notedBy
    };
    localStorage.setItem('smart_transmittal_settings', JSON.stringify(settingsToSave));
  }, [projectDetails]);

  const saveToHistory = () => {
    const newEntry: TransmittalLogEntry = {
      id: Date.now().toString(),
      transmittalNumber: projectDetails.transmittalNumber,
      date: projectDetails.date,
      recipientCompany: projectDetails.recipientCompany,
      projectName: projectDetails.projectName,
      itemCount: items.length,
      timestamp: Date.now()
    };
    const updatedHistory = [newEntry, ...history];
    setHistory(updatedHistory);
    localStorage.setItem('smart_transmittal_history', JSON.stringify(updatedHistory));
  };

  const updateTimeGenerated = () => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setProjectDetails(prev => ({ ...prev, timeGenerated: now }));
    return now;
  };

  // --- Scan Handler ---
  const handleScanProcessing = async (fileList: any[], deepAnalysis?: boolean) => {
    setIsScanning(true);
    setError(null);
    try {
      updateTimeGenerated();
      
      const processedItems = await processFilesWithGemini(
          fileList, 
          projectDetails.projectName, 
          deepAnalysis
      );
      setItems(prev => [...prev, ...processedItems]);
    } catch (err: any) {
      setError(err.message || "Failed to process files");
    } finally {
      setIsScanning(false);
    }
  };

  const handleAddItem = () => {
    const newItem: TransmittalItem = {
      id: `manual-${Date.now()}`,
      originalFilename: '',
      qty: '1',
      documentType: '',
      description: '',
      remarks: ''
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleUpdateItem = (id: string, field: keyof TransmittalItem, value: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleDeleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleColumnReorder = (newOrder: TableColumn[]) => {
    setColumns(newOrder);
  };

  const handleSaveApiKey = (key: string) => {
    localStorage.setItem('gemini_api_key', key);
    setApiKey(key);
  };

  const handleSavePreparedBySignature = (signature: string) => {
    setProjectDetails({ ...projectDetails, preparedBySignature: signature });
  };

  const handleSaveNotedBySignature = (signature: string) => {
    setProjectDetails({ ...projectDetails, notedBySignature: signature });
  };

  const handleLoadTemplate = (templateData: Partial<ProjectDetails>) => {
    setProjectDetails(prev => ({
      ...prev,
      ...templateData,
      transmittalNumber: prev.transmittalNumber,
      date: prev.date,
      timeGenerated: prev.timeGenerated
    }));
  };

  const handleLoadTransmittal = (transmittal: any) => {
    setProjectDetails({
      sender: transmittal.sender || '',
      senderEmail: transmittal.sender_email || '',
      senderContactNumber: transmittal.sender_contact_number || '',
      senderContactDetails: transmittal.sender_contact_details || '',
      logoBase64: transmittal.logo_base64 || null,
      department: transmittal.department || '',
      recipientName: transmittal.recipient_name || '',
      recipientCompany: transmittal.recipient_company || '',
      attentionTo: transmittal.attention_to || '',
      recipientAddress: transmittal.recipient_address || '',
      contactNo: transmittal.contact_no || '',
      projectName: transmittal.project_name || '',
      projectNumber: transmittal.project_number || '',
      purpose: transmittal.purpose || '',
      transmittalNumber: transmittal.transmittal_number,
      date: transmittal.date || new Date().toISOString().split('T')[0],
      timeGenerated: transmittal.time_generated || '',
      preparedBy: transmittal.prepared_by || '',
      notedBy: transmittal.noted_by || '',
      timeReleased: '',
      preparedBySignature: transmittal.prepared_by_signature || null,
      notedBySignature: transmittal.noted_by_signature || null
    });
    setItems(transmittal.items || []);
    setColumns(transmittal.columns || columns);
    setCurrentStatus(transmittal.status || 'draft');
    setCurrentTransmittalId(transmittal.id);
  };

  const handleSelectCompany = (company: any) => {
    setProjectDetails(prev => ({
      ...prev,
      sender: company.name,
      senderContactDetails: company.contact_details || prev.senderContactDetails,
      logoBase64: company.logo_url || prev.logoBase64
    }));
    loadSavedCompanies();
  };

  const handleCompanyDropdownChange = (companyId: string) => {
    const company = savedCompanies.find(c => c.id === companyId);
    if (company) {
      handleSelectCompany(company);
    }
  };

  const handleSaveToCloud = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setSyncStatus('syncing');
    try {
      await CloudSyncService.saveTransmittal(user.id, {
        transmittal_number: projectDetails.transmittalNumber,
        status: currentStatus,
        projectDetails: { ...projectDetails },
        items,
        columns
      });

      setSyncStatus('synced');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  const handleUpdateStatus = async (newStatus: 'draft' | 'sent' | 'received' | 'pending') => {
    setCurrentStatus(newStatus);
    if (user && currentTransmittalId) {
      await CloudSyncService.updateStatus(currentTransmittalId, newStatus, user.id);
    }
  };

  const handleClearForm = async () => {
    if (confirm('Clear all form data except sender details? This will remove all recipient info, project details, and items.')) {
      const savedSettings = localStorage.getItem('smart_transmittal_settings');
      let senderData = {
        sender: projectDetails.sender,
        senderEmail: projectDetails.senderEmail,
        senderContactNumber: projectDetails.senderContactNumber,
        senderContactDetails: projectDetails.senderContactDetails,
        logoBase64: projectDetails.logoBase64,
        department: projectDetails.department,
        preparedBy: projectDetails.preparedBy,
        notedBy: projectDetails.notedBy
      };

      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        senderData = { ...senderData, ...parsed };
      }

      const newTransmittalNo = await generateTransmittalNo();

      setProjectDetails({
        ...senderData,
        recipientName: '',
        recipientCompany: '',
        attentionTo: '',
        recipientAddress: '',
        contactNo: '',
        projectName: '',
        projectNumber: '',
        purpose: '',
        transmittalNumber: newTransmittalNo,
        date: new Date().toISOString().split('T')[0],
        timeGenerated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timeReleased: ''
      });

      setItems([]);
      setError(null);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProjectDetails(prev => ({ ...prev, logoBase64: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const getScaledImageDimensions = async (base64: string, maxWidth: number, maxHeight: number) => {
    return new Promise<{ width: number, height: number }>((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
        resolve({ width: img.width * ratio, height: img.height * ratio });
      };
      img.onerror = () => resolve({ width: 0, height: 0 }); 
    });
  };

  const handleExportCSV = () => {
    const headers = columns.map(col => col.label);
    const rows = items.map(item => {
        return columns.map(col => {
            const value = item[col.id] || '';
            return `"${value.replace(/"/g, '""')}"`; 
        }).join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Transmittal-${projectDetails.transmittalNumber}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const handlePrint = async () => {
    updateTimeGenerated();
    saveToHistory();
    setTimeout(() => {
        window.print();
    }, 100);
  };

  const handleDownloadPDF = async () => {
    saveToHistory();
    const doc = await generatePDF(projectDetails);
    doc.save(`Transmittal-${projectDetails.transmittalNumber}.pdf`);
  };

  const generatePDF = async (details: ProjectDetails) => {
    const currentTime = updateTimeGenerated();
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    doc.setDrawColor(150, 150, 150);

    let currentY = 15;
    let logoHeight = 0;
    if (details.logoBase64) {
        try {
            const maxW = 60;
            const maxH = 25;
            const dims = await getScaledImageDimensions(details.logoBase64, maxW, maxH);
            if (dims.width > 0) {
               doc.addImage(details.logoBase64, 'JPEG', margin, currentY, dims.width, dims.height);
               logoHeight = dims.height;
            }
        } catch (e) { console.error("Logo Error", e); }
    } else {
        doc.setFontSize(20);
        doc.setFont("times", "bold");
        doc.text(details.sender, margin, currentY + 10);
        logoHeight = 15;
    }

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const contactLines = doc.splitTextToSize(details.senderContactDetails, 90);
    doc.text(contactLines, pageWidth - margin, currentY + 5, { align: 'right' });

    const textHeight = contactLines.length * 4;
    const headerContentHeight = Math.max(logoHeight, textHeight);

    const titleY = currentY + headerContentHeight + 15;

    doc.setFontSize(16);
    doc.setFont("times", "bold");
    doc.text("TRANSMITTAL FORM", pageWidth / 2, titleY, { align: 'center' });

    const gridY = titleY + 15;
    const rowHeight = 7;
    const col1Width = 35;
    const col2Width = pageWidth - 2 * margin - col1Width;

    const recipientRows = [
        { label: 'To:', value: details.recipientName },
        { label: 'Company:', value: details.recipientCompany },
        { label: 'Attention:', value: details.attentionTo },
        { label: 'Address:', value: details.recipientAddress },
        { label: 'Contact No:', value: details.contactNo }
    ];

    doc.setFontSize(10);
    recipientRows.forEach((row, index) => {
        const y = gridY + index * rowHeight;
        doc.rect(margin, y, col1Width, rowHeight);
        doc.rect(margin + col1Width, y, col2Width, rowHeight);
        doc.setFont("helvetica", "bold");
        doc.text(row.label, margin + 2, y + 5);
        doc.setFont("helvetica", "normal");
        doc.text(row.value, margin + col1Width + 2, y + 5);
    });

    currentY = gridY + recipientRows.length * rowHeight + 8;

    const infoY = currentY;
    const infoRowHeight = 7;

    const projectRows = [
        { label: 'Project Name:', value: details.projectName },
        { label: 'Project No:', value: details.projectNumber },
        { label: 'Purpose:', value: details.purpose },
        { label: 'Transmittal No:', value: details.transmittalNumber },
        { label: 'Department:', value: details.department },
        { label: 'Date:', value: details.date },
        { label: 'Time Generated:', value: currentTime }
    ];

    doc.setFontSize(10);
    projectRows.forEach((row, index) => {
        const y = infoY + index * infoRowHeight;
        doc.rect(margin, y, col1Width, infoRowHeight);
        doc.rect(margin + col1Width, y, col2Width, infoRowHeight);
        doc.setFont("helvetica", "bold");
        doc.text(row.label, margin + 2, y + 5);
        doc.setFont("helvetica", "normal");
        doc.text(row.value, margin + col1Width + 2, y + 5);
    });

    const tableStartY = infoY + projectRows.length * infoRowHeight + 8;

    const tableBody = items.map(item => {
        return columns.map(col => item[col.id] || '');
    });

    const columnStylesMap: any = {};
    columns.forEach((col) => {
        const width = col.pdfWidth;
        const minWidth = (col as any).minWidth;

        columnStylesMap[col.id] = {
            cellWidth: width === 'auto' ? 'auto' : (minWidth && width < minWidth ? minWidth : width),
            halign: col.id === 'qty' ? 'center' : 'left',
            ...(col.id === 'remarks' ? { cellWidth: 40 } : {})
        };
    });

    autoTable(doc, {
      startY: tableStartY,
      head: [columns.map(c => c.label)],
      body: tableBody,
      theme: 'grid',
      headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          lineWidth: 0.1,
          lineColor: [150, 150, 150],
          halign: 'center'
      },
      styles: {
          lineWidth: 0.1,
          lineColor: [150, 150, 150],
          textColor: [0,0,0]
      },
      columnStyles: columnStylesMap,
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    currentY = finalY;

    if (currentY > pageHeight - 60) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(9);
    doc.setDrawColor(150, 150, 150);

    doc.text('Prepared by:', margin, currentY);
    if (details.preparedBySignature) {
      try {
        doc.addImage(details.preparedBySignature, 'PNG', margin, currentY + 2, 40, 10);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(details.preparedBy, margin, currentY + 14);
        doc.setFontSize(9);
      } catch (e) {
        doc.text(details.preparedBy, margin, currentY + 8);
      }
    } else {
        doc.line(margin, currentY + 12, margin + 50, currentY + 12);
        doc.text(details.preparedBy, margin, currentY + 16);
    }

    doc.text('Noted by:', margin + 60, currentY);
    if (details.notedBySignature) {
      try {
        doc.addImage(details.notedBySignature, 'PNG', margin + 60, currentY + 2, 40, 10);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(details.notedBy, margin + 60, currentY + 14);
        doc.setFontSize(9);
      } catch (e) {
        doc.text(details.notedBy, margin + 60, currentY + 8);
      }
    } else {
        doc.line(margin + 60, currentY + 12, margin + 110, currentY + 12);
        doc.text(details.notedBy, margin + 60, currentY + 16);
    }

    doc.text('Time Released:', margin + 120, currentY);
    doc.line(margin + 120, currentY + 12, margin + 170, currentY + 12);

    currentY += 30;
    doc.setFont("helvetica", "bold");
    doc.text("Transmitted via:", margin, currentY);
    doc.setFont("helvetica", "normal");

    doc.text("Personal Delivery", margin + 30, currentY);
    doc.text("Pick-up", margin + 65, currentY);
    doc.text("Grab / Lalamove", margin + 85, currentY);
    doc.text("Registered Mail / Private Courier", margin + 115, currentY);

    currentY += 10;

    doc.setFont("helvetica", "italic");
    doc.setFont("helvetica", "normal");
    const ackText = "This is to acknowledge and confirm that the items/documents listed above are complete and in good condition.";
    doc.setFont("helvetica", "italic");
    doc.text(ackText, margin, currentY);
    currentY += 18;

    doc.setFont("helvetica", "normal");

    doc.text('Received by:', margin, currentY);
    doc.line(margin + 25, currentY, margin + 85, currentY);
    doc.text('Date Received:', margin + 95, currentY);
    doc.line(margin + 125, currentY, margin + 180, currentY);

    currentY += 15;

    doc.text('Time Received:', margin, currentY);
    doc.line(margin + 25, currentY, margin + 85, currentY);
    doc.text('Remarks:', margin + 95, currentY);
    doc.line(margin + 115, currentY, margin + 180, currentY);

    currentY += 10;

    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100);
    const bottomNote = "For documentation purposes, please return the signed transmittal form to our office via email or courier at your earliest convenience.";
    const wrappedText = doc.splitTextToSize(bottomNote, pageWidth - 2 * margin);
    doc.text(wrappedText, pageWidth / 2, currentY, { align: 'center' });

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    }

    return doc;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth modal when not authenticated
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <AuthModal
          isOpen={!showForgotPassword}
          onClose={() => {}}
          onForgotPassword={() => setShowForgotPassword(true)}
        />
        <PasswordResetModal
          isOpen={showForgotPassword}
          onClose={() => setShowForgotPassword(false)}
          mode="forgot"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <PasswordResetModal
        isOpen={showPasswordReset}
        onClose={() => setShowPasswordReset(false)}
        mode="change"
      />
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={handleSaveApiKey}
        savedKey={apiKey}
      />
      <SignatureModal
        isOpen={showPreparedBySignature}
        onClose={() => setShowPreparedBySignature(false)}
        onSave={handleSavePreparedBySignature}
        title="Prepared By Signature"
        currentSignature={projectDetails.preparedBySignature}
      />
      <SignatureModal
        isOpen={showNotedBySignature}
        onClose={() => setShowNotedBySignature(false)}
        onSave={handleSaveNotedBySignature}
        title="Noted By Signature"
        currentSignature={projectDetails.notedBySignature}
      />
      <TemplateManager
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        onLoadTemplate={handleLoadTemplate}
        currentProjectDetails={projectDetails}
      />
      <EnhancedHistory
        isOpen={showEnhancedHistory}
        onClose={() => setShowEnhancedHistory(false)}
        onLoadTransmittal={handleLoadTransmittal}
      />
      <CompanyProfile
        isOpen={showCompanyProfiles}
        onClose={() => setShowCompanyProfiles(false)}
        onSelectCompany={handleSelectCompany}
      />
      <BulkExport
        isOpen={showBulkExport}
        onClose={() => setShowBulkExport(false)}
      />
      <header className="bg-slate-900 text-white p-4 shadow-md no-print sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-400" />
            <h1 className="text-xl font-bold tracking-tight">Smart Transmittal Gen</h1>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <button
                  onClick={() => setShowTemplates(true)}
                  className="text-sm flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-slate-400 hover:text-white hover:bg-slate-800"
                  title="Templates"
                >
                  <FolderOpen className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowEnhancedHistory(true)}
                  className="text-sm flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-slate-400 hover:text-white hover:bg-slate-800"
                  title="Cloud History"
                >
                  <History className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowCompanyProfiles(true)}
                  className="text-sm flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-slate-400 hover:text-white hover:bg-slate-800"
                  title="Company Profiles"
                >
                  <Building2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowBulkExport(true)}
                  className="text-sm flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-slate-400 hover:text-white hover:bg-slate-800"
                  title="Bulk Export"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSaveToCloud}
                  disabled={syncStatus === 'syncing'}
                  className={`text-sm flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${
                    syncStatus === 'synced' ? 'text-green-400' : syncStatus === 'error' ? 'text-red-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title="Save to Cloud"
                >
                  <Cloud className="w-4 h-4" />
                  {syncStatus === 'syncing' && '...'}
                  {syncStatus === 'synced' && '✓'}
                </button>
                <div className="h-6 w-px bg-slate-700 mx-2"></div>
                <button
                  onClick={() => setShowPasswordReset(true)}
                  className="text-sm flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-slate-400 hover:text-white hover:bg-slate-800"
                  title="Change Password"
                >
                  <Key className="w-4 h-4" />
                </button>
                <button
                  onClick={async () => {
                    await signOut();
                    setSavedCompanies([]);
                    setCurrentTransmittalId(null);
                  }}
                  className="text-sm flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="text-sm flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
            )}
            <div className="h-6 w-px bg-slate-700 mx-2"></div>
            <button
               onClick={handleClearForm}
               className="text-sm flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-slate-400 hover:text-red-400"
               title="Clear Form"
            >
               <Trash2 className="w-4 h-4" />
            </button>
            <button
               onClick={() => setShowSettings(true)}
               className="text-sm flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-slate-400 hover:text-white hover:bg-slate-800"
               title="Settings"
            >
               <Settings className="w-4 h-4" />
            </button>
            <button
               onClick={() => setShowHistory(!showHistory)}
               className={`text-sm flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${showHistory ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
               <History className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow bg-slate-50 p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* History Section */}
          {showHistory && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-in slide-in-from-top-4 no-print">
               <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                 <History className="w-5 h-5 text-blue-600" />
                 Transmittal History (Local Database)
               </h2>
               {history.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">No history yet. Generate a transmittal to save a record.</p>
               ) : (
                  <div className="overflow-x-auto max-h-60 overflow-y-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0">
                           <tr>
                              <th className="px-4 py-2">Transmittal #</th>
                              <th className="px-4 py-2">Date</th>
                              <th className="px-4 py-2">Recipient</th>
                              <th className="px-4 py-2">Project</th>
                              <th className="px-4 py-2">Items</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                           {history.map((entry) => (
                              <tr key={entry.id} className="hover:bg-slate-50">
                                 <td className="px-4 py-2 font-mono text-xs">{entry.transmittalNumber}</td>
                                 <td className="px-4 py-2">{entry.date}</td>
                                 <td className="px-4 py-2">{entry.recipientCompany}</td>
                                 <td className="px-4 py-2">{entry.projectName}</td>
                                 <td className="px-4 py-2 text-center">{entry.itemCount}</td>
                              </tr>
                           ))}
                        </tbody>
                    </table>
                  </div>
               )}
            </div>
          )}
          
          {/* Document Status Tracker */}
          {user && currentTransmittalId && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 no-print">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-700">Document Status:</span>
                  <select
                    value={currentStatus}
                    onChange={(e) => handleUpdateStatus(e.target.value as any)}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="pending">Pending</option>
                    <option value="received">Received</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <FileText className="w-4 h-4" />
                  <span>Status: {items.length} items</span>
                </div>
              </div>
            </div>
          )}

          {/* Project Details Section - No Print */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 no-print">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-blue-600" />
              Configuration
            </h2>
            <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">Sender Details (Auto-Saved)</h3>
                {user && savedCompanies.length > 0 && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <label className="block text-xs font-medium text-blue-700 uppercase mb-2 flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Quick Load from Saved Company ({savedCompanies.length} available)
                    </label>
                    <select
                      onChange={(e) => handleCompanyDropdownChange(e.target.value)}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                      defaultValue=""
                    >
                      <option value="">Select a company profile...</option>
                      {savedCompanies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {user && savedCompanies.length === 0 && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-800">
                      <span className="font-semibold">Tip:</span> Save company profiles using the <Building2 className="w-3 h-3 inline" /> Company Profiles button in the header to quickly load sender details.
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                     <div>
                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Company Name</label>
                        <input
                          type="text"
                          value={projectDetails.sender}
                          onChange={(e) => setProjectDetails({...projectDetails, sender: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          placeholder="e.g. FILEPINO"
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Company Logo</label>
                        <div className="flex gap-2 items-center">
                            <label className="flex-1 flex items-center justify-center px-4 py-2 border border-slate-300 border-dashed rounded-lg cursor-pointer hover:bg-white hover:border-blue-400 transition-colors">
                                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Upload className="w-4 h-4" />
                                {projectDetails.logoBase64 ? 'Update Logo' : 'Upload Logo'}
                                </div>
                            </label>
                            {projectDetails.logoBase64 && (
                                <div className="w-10 h-10 border rounded overflow-hidden bg-white flex-shrink-0">
                                    <img src={projectDetails.logoBase64} alt="Logo" className="w-full h-full object-contain" />
                                </div>
                            )}
                        </div>
                     </div>
                     <div>
                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Department (Sending)</label>
                        <input 
                          type="text" 
                          value={projectDetails.department}
                          onChange={(e) => setProjectDetails({...projectDetails, department: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          placeholder="e.g. Admin, Engineering"
                        />
                     </div>
                     <div className="grid grid-cols-2 gap-3">
                         <div>
                            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Sender Email</label>
                            <input 
                              type="text" 
                              value={projectDetails.senderEmail}
                              onChange={(e) => setProjectDetails({...projectDetails, senderEmail: e.target.value})}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                         </div>
                         <div>
                            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Sender Contact No</label>
                            <input 
                              type="text" 
                              value={projectDetails.senderContactNumber}
                              onChange={(e) => setProjectDetails({...projectDetails, senderContactNumber: e.target.value})}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                         </div>
                     </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Header Contact Details (Preview)</label>
                    <textarea 
                      value={projectDetails.senderContactDetails}
                      onChange={(e) => setProjectDetails({...projectDetails, senderContactDetails: e.target.value})}
                      className="w-full h-40 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-mono text-right"
                      placeholder="Enter the full contact details block exactly as you want it to appear on the PDF."
                    />
                    <p className="text-[10px] text-slate-400 mt-1 italic">
                       This text box controls exactly what prints on the top-right of the PDF.
                    </p>
                  </div>
                </div>
            </div>
            
            {/* Recipient & Project Config Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* RECIPIENT INFO */}
                <div>
                     <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">Recipient Details</h3>
                     <div className="grid grid-cols-1 gap-3">
                         <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Recipient Name</label>
                                <input 
                                  type="text" 
                                  value={projectDetails.recipientName}
                                  onChange={(e) => setProjectDetails({...projectDetails, recipientName: e.target.value})}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                  placeholder="Leave blank if not needed"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Company</label>
                                <input 
                                  type="text" 
                                  value={projectDetails.recipientCompany}
                                  onChange={(e) => setProjectDetails({...projectDetails, recipientCompany: e.target.value})}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                />
                            </div>
                         </div>
                         <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Attention To</label>
                            <input 
                              type="text" 
                              value={projectDetails.attentionTo}
                              onChange={(e) => setProjectDetails({...projectDetails, attentionTo: e.target.value})}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Address</label>
                            <input 
                              type="text" 
                              value={projectDetails.recipientAddress}
                              onChange={(e) => setProjectDetails({...projectDetails, recipientAddress: e.target.value})}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Contact No.</label>
                            <input 
                              type="text" 
                              value={projectDetails.contactNo}
                              onChange={(e) => setProjectDetails({...projectDetails, contactNo: e.target.value})}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                            />
                        </div>
                     </div>
                </div>

                {/* PROJECT & META INFO */}
                <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">Project & Transmittal Info</h3>
                    <div className="grid grid-cols-1 gap-3">
                         <div className="grid grid-cols-2 gap-3">
                             <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Project Name</label>
                                <input 
                                  type="text" 
                                  value={projectDetails.projectName}
                                  onChange={(e) => setProjectDetails({...projectDetails, projectName: e.target.value})}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                />
                             </div>
                             <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Purpose of Transmittal</label>
                                <input 
                                  type="text" 
                                  value={projectDetails.purpose}
                                  onChange={(e) => setProjectDetails({...projectDetails, purpose: e.target.value})}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                  placeholder="e.g. For Billing, For Approval"
                                />
                             </div>
                         </div>
                         <div className="grid grid-cols-2 gap-3">
                             <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Transmittal No. (Auto)</label>
                                <input 
                                  type="text" 
                                  value={projectDetails.transmittalNumber}
                                  readOnly
                                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-600 rounded-lg text-sm font-mono"
                                />
                             </div>
                             <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
                                <input 
                                  type="date" 
                                  value={projectDetails.date}
                                  onChange={(e) => setProjectDetails({...projectDetails, date: e.target.value})}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                />
                             </div>
                         </div>
                         <div className="grid grid-cols-2 gap-3">
                             <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Time (Syncs Automatically)</label>
                                <input 
                                  type="text" 
                                  value={projectDetails.timeGenerated}
                                  onChange={(e) => setProjectDetails({...projectDetails, timeGenerated: e.target.value})}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                  placeholder="e.g. 10:00 AM"
                                />
                             </div>
                             <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Prepared By</label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={projectDetails.preparedBy}
                                    onChange={(e) => setProjectDetails({...projectDetails, preparedBy: e.target.value})}
                                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                  />
                                  <button
                                    onClick={() => setShowPreparedBySignature(true)}
                                    className="px-3 py-2 bg-blue-50 border border-blue-300 rounded-lg hover:bg-blue-100 transition-colors"
                                    title="Add Signature"
                                  >
                                    <Pen className="w-4 h-4 text-blue-600" />
                                  </button>
                                </div>
                                {projectDetails.preparedBySignature && (
                                  <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded">
                                    <img src={projectDetails.preparedBySignature} alt="Signature" className="h-8 object-contain" />
                                  </div>
                                )}
                             </div>
                         </div>
                         <div className="grid grid-cols-2 gap-3">
                             <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Noted By (Admin)</label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={projectDetails.notedBy}
                                    onChange={(e) => setProjectDetails({...projectDetails, notedBy: e.target.value})}
                                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                  />
                                  <button
                                    onClick={() => setShowNotedBySignature(true)}
                                    className="px-3 py-2 bg-blue-50 border border-blue-300 rounded-lg hover:bg-blue-100 transition-colors"
                                    title="Add Signature"
                                  >
                                    <Pen className="w-4 h-4 text-blue-600" />
                                  </button>
                                </div>
                                {projectDetails.notedBySignature && (
                                  <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded">
                                    <img src={projectDetails.notedBySignature} alt="Signature" className="h-8 object-contain" />
                                  </div>
                                )}
                             </div>
                         </div>
                    </div>
                </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 no-print">
             <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-blue-600" />
                  Source Files
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Upload files, paste a list, or scan a Google Drive folder.
                </p>
             </div>

             <FileInput 
                isScanning={isScanning} 
                onProcess={handleScanProcessing} 
                driveId={driveId}
              />
              
             {error && (
               <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                 <AlertCircle className="w-4 h-4" />
                 {error}
               </div>
             )}
          </div>

          {/* Results Section */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden print:shadow-none print:border-none">
              
              {/* Toolbar */}
              <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center no-print">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-slate-700">Generated Transmittal ({items.length} items)</span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm font-medium text-sm"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                  <button 
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm font-medium text-sm"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Export CSV
                  </button>
                  <button 
                    onClick={handleDownloadPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </button>
                </div>
              </div>

              {/* Printable Header (Visible on Screen) */}
              <div className="p-8 pb-0">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex-1">
                        {/* Logo Left */}
                        {projectDetails.logoBase64 && (
                            <img src={projectDetails.logoBase64} alt="Company Logo" className="max-h-20 w-auto object-contain" />
                        )}
                    </div>
                    {/* Address Block Right */}
                    <div className="flex-1 text-sm whitespace-pre-wrap text-right max-w-md">
                        {projectDetails.senderContactDetails}
                    </div>
                </div>

                <div className="text-center pb-4 mb-4">
                  <h1 className="text-3xl font-bold uppercase tracking-wide">Transmittal Form</h1>
                </div>

                {/* Grid */}
                <div className="text-sm mb-4">
                    <div className="grid grid-cols-[130px_1fr_100px_130px] py-1">
                        <div className="font-bold">Company Name:</div>
                        <div>{projectDetails.recipientCompany}</div>
                        <div className="font-bold">Date:</div>
                        <div>{projectDetails.date}</div>
                    </div>
                    <div className="grid grid-cols-[130px_1fr_100px_130px] py-1">
                        <div className="font-bold">Attention to:</div>
                        <div>{projectDetails.attentionTo}</div>
                        <div className="font-bold">Time:</div>
                        <div>{projectDetails.timeGenerated}</div>
                    </div>
                    <div className="grid grid-cols-[130px_1fr_100px_130px] py-1">
                        <div className="font-bold">Address:</div>
                        <div>{projectDetails.recipientAddress}</div>
                        <div className="font-bold">Transmittal No:</div>
                        <div>{projectDetails.transmittalNumber}</div>
                    </div>
                     <div className="grid grid-cols-[130px_1fr] py-1">
                        <div className="font-bold">Contact No:</div>
                        <div>{projectDetails.contactNo}</div>
                    </div>
                    <div className="grid grid-cols-[130px_1fr] py-1">
                        <div className="font-bold">Purpose:</div>
                        <div>{projectDetails.purpose}</div>
                    </div>
                    {/* Light Blue Bar */}
                    <div className="bg-blue-50 p-1 text-center font-bold border border-slate-400 my-2">
                        The following document(s) are being sent by: {projectDetails.department}
                    </div>
                    {/* Project */}
                    <div className="p-1 font-bold border border-slate-400 mb-4">
                        Project/Service Availed: <span className="font-normal ml-2">{projectDetails.projectName}</span>
                    </div>
                </div>
              </div>

              {/* The Editable Table */}
              <TransmittalTable 
                items={items} 
                onUpdate={handleUpdateItem}
                onDelete={handleDeleteItem}
                onAdd={handleAddItem}
                columns={columns}
                onColumnReorder={handleColumnReorder}
              />

               {/* Printable Footer (Visible on Screen) */}
               <div className="p-8 pt-4">
                
                {/* Signatures */}
                <div className="grid grid-cols-3 gap-8 mt-8 mb-8">
                  <div>
                     <p className="text-xs font-bold mb-4">Prepared By:</p>
                     <p className="text-sm border-b border-slate-400 pb-1">{projectDetails.preparedBy}</p>
                  </div>
                  <div>
                     <p className="text-xs font-bold mb-4">Noted By:</p>
                     <p className="text-sm border-b border-slate-400 pb-1">{projectDetails.notedBy}</p>
                  </div>
                  <div>
                     <p className="text-xs font-bold mb-4">Time Released:</p>
                     <p className="text-sm border-b border-slate-400 pb-1 h-[21px]"></p>
                  </div>
                </div>

                <div className="mt-8 pt-4">
                  <div className="font-bold mb-6 flex items-center gap-6 text-sm flex-wrap">
                    <span>Transmitted via:</span>
                    <span className="font-normal">Personal Delivery</span>
                    <span className="font-normal">Pick-up</span>
                    <span className="font-normal">Grab / Lalamove</span>
                    <span className="font-normal">Registered Mail / Private Courier</span>
                  </div>

                  <p className="text-sm italic text-slate-700 mb-8">
                    "This is to acknowledge and confirm that the items/documents listed above are complete and in good condition."
                  </p>
                  
                  <div className="grid grid-cols-2 gap-x-12 gap-y-12">
                     <div>
                        <div className="border-b border-slate-400 h-10"></div>
                        <p className="text-xs mt-1">Received By</p>
                     </div>
                     <div>
                        <div className="border-b border-slate-400 h-10"></div>
                        <p className="text-xs mt-1">Date Received</p>
                     </div>
                     <div>
                        <div className="border-b border-slate-400 h-10"></div>
                        <p className="text-xs mt-1">Time Received</p>
                     </div>
                     <div>
                        <div className="border-b border-slate-400 h-10"></div>
                        <p className="text-xs mt-1">Remarks</p>
                     </div>
                  </div>

                  <div className="mt-12 text-center">
                    <p className="text-[10px] text-slate-500 italic">
                      For documentation purposes, please return the signed transmittal form to our office via email or courier at your earliest convenience.
                    </p>
                  </div>
                </div>
              </div>

            </div>

        </div>
      </main>
    </div>
  );
}