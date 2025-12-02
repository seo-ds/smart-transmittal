export interface TransmittalItem {
  id: string;
  originalFilename: string;
  qty: string;         
  documentType: string; // Was 'title', now 'Type of Document' e.g., "Architectural Plan"
  description: string;  // Was 'docCode', now 'Description' e.g., "Ground Floor Layout"
  remarks: string;     
}

// New Types for Column Reordering
export type ColumnId = 'qty' | 'documentType' | 'description' | 'remarks';

export interface TableColumn {
  id: ColumnId;
  label: string;
  pdfWidth: number | 'auto'; // Width for PDF generation
  width: string;             // Tailwind width class for UI
}

export interface ProjectDetails {
  // Sender Info
  sender: string;
  senderEmail: string;        
  senderContactNumber: string; 
  senderContactDetails: string; 
  logoBase64: string | null;
  department: string;         
  
  // Recipient Info
  recipientName: string;      
  recipientCompany: string;   
  attentionTo: string;        
  recipientAddress: string;   
  contactNo: string;          
  
  // Project Info
  projectName: string;
  projectNumber: string;
  purpose: string;       
  transmittalNumber: string;  
  
  // Dates & Signatures
  date: string;
  timeGenerated: string;
  preparedBy: string;
  notedBy: string;
  timeReleased: string;
  preparedBySignature: string | null;
  notedBySignature: string | null;
}

export interface TransmittalLogEntry {
  id: string;
  transmittalNumber: string;
  date: string;
  recipientCompany: string;
  projectName: string;
  itemCount: number;
  timestamp: number;
}

export interface GeminiResponseSchema {
  items: {
    originalFilename: string;
    qty: string;
    documentType: string;
    description: string;
    remarks: string;
  }[];
}