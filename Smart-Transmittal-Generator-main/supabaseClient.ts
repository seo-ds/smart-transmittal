import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          updated_at?: string;
        };
      };
      companies: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          logo_url: string | null;
          contact_details: string | null;
          color_scheme: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          logo_url?: string | null;
          contact_details?: string | null;
          color_scheme?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          owner_id?: string;
          name?: string;
          logo_url?: string | null;
          contact_details?: string | null;
          color_scheme?: any;
          updated_at?: string;
        };
      };
      templates: {
        Row: {
          id: string;
          company_id: string | null;
          user_id: string;
          name: string;
          department: string | null;
          recipient_company: string | null;
          recipient_name: string | null;
          recipient_address: string | null;
          attention_to: string | null;
          contact_no: string | null;
          purpose: string | null;
          template_data: any;
          is_shared: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          user_id: string;
          name: string;
          department?: string | null;
          recipient_company?: string | null;
          recipient_name?: string | null;
          recipient_address?: string | null;
          attention_to?: string | null;
          contact_no?: string | null;
          purpose?: string | null;
          template_data?: any;
          is_shared?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          department?: string | null;
          recipient_company?: string | null;
          recipient_name?: string | null;
          recipient_address?: string | null;
          attention_to?: string | null;
          contact_no?: string | null;
          purpose?: string | null;
          template_data?: any;
          is_shared?: boolean;
          updated_at?: string;
        };
      };
      transmittals: {
        Row: {
          id: string;
          company_id: string | null;
          user_id: string;
          transmittal_number: string;
          status: 'draft' | 'sent' | 'received' | 'pending';
          sender: string | null;
          sender_email: string | null;
          sender_contact_number: string | null;
          sender_contact_details: string | null;
          department: string | null;
          recipient_name: string | null;
          recipient_company: string | null;
          recipient_address: string | null;
          attention_to: string | null;
          contact_no: string | null;
          project_name: string | null;
          project_number: string | null;
          purpose: string | null;
          date: string | null;
          time_generated: string | null;
          prepared_by: string | null;
          noted_by: string | null;
          prepared_by_signature: string | null;
          noted_by_signature: string | null;
          logo_base64: string | null;
          qr_code_data: string | null;
          items: any;
          columns: any;
          notes: string | null;
          follow_up_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          user_id: string;
          transmittal_number: string;
          status?: 'draft' | 'sent' | 'received' | 'pending';
          sender?: string | null;
          sender_email?: string | null;
          sender_contact_number?: string | null;
          sender_contact_details?: string | null;
          department?: string | null;
          recipient_name?: string | null;
          recipient_company?: string | null;
          recipient_address?: string | null;
          attention_to?: string | null;
          contact_no?: string | null;
          project_name?: string | null;
          project_number?: string | null;
          purpose?: string | null;
          date?: string | null;
          time_generated?: string | null;
          prepared_by?: string | null;
          noted_by?: string | null;
          prepared_by_signature?: string | null;
          noted_by_signature?: string | null;
          logo_base64?: string | null;
          qr_code_data?: string | null;
          items?: any;
          columns?: any;
          notes?: string | null;
          follow_up_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: 'draft' | 'sent' | 'received' | 'pending';
          sender?: string | null;
          sender_email?: string | null;
          sender_contact_number?: string | null;
          sender_contact_details?: string | null;
          department?: string | null;
          recipient_name?: string | null;
          recipient_company?: string | null;
          recipient_address?: string | null;
          attention_to?: string | null;
          contact_no?: string | null;
          project_name?: string | null;
          project_number?: string | null;
          purpose?: string | null;
          date?: string | null;
          time_generated?: string | null;
          prepared_by?: string | null;
          noted_by?: string | null;
          prepared_by_signature?: string | null;
          noted_by_signature?: string | null;
          logo_base64?: string | null;
          qr_code_data?: string | null;
          items?: any;
          columns?: any;
          notes?: string | null;
          follow_up_date?: string | null;
          updated_at?: string;
        };
      };
    };
  };
}
