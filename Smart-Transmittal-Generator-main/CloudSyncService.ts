import { supabase } from './supabaseClient';
import { ProjectDetails, TransmittalItem, TableColumn } from './types';

export interface SyncTransmittal {
  transmittal_number: string;
  status: 'draft' | 'sent' | 'received' | 'pending';
  projectDetails: ProjectDetails;
  items: TransmittalItem[];
  columns: TableColumn[];
  notes?: string;
  follow_up_date?: string;
}

export class CloudSyncService {
  static async saveTransmittal(
    userId: string,
    transmittalData: SyncTransmittal,
    companyId?: string
  ) {
    const { data, error } = await supabase.from('transmittals').insert({
      user_id: userId,
      company_id: companyId || null,
      transmittal_number: transmittalData.transmittal_number,
      status: transmittalData.status,
      sender: transmittalData.projectDetails.sender,
      sender_email: transmittalData.projectDetails.senderEmail,
      sender_contact_number: transmittalData.projectDetails.senderContactNumber,
      sender_contact_details: transmittalData.projectDetails.senderContactDetails,
      department: transmittalData.projectDetails.department,
      recipient_name: transmittalData.projectDetails.recipientName,
      recipient_company: transmittalData.projectDetails.recipientCompany,
      recipient_address: transmittalData.projectDetails.recipientAddress,
      attention_to: transmittalData.projectDetails.attentionTo,
      contact_no: transmittalData.projectDetails.contactNo,
      project_name: transmittalData.projectDetails.projectName,
      project_number: transmittalData.projectDetails.projectNumber,
      purpose: transmittalData.projectDetails.purpose,
      date: transmittalData.projectDetails.date,
      time_generated: transmittalData.projectDetails.timeGenerated,
      prepared_by: transmittalData.projectDetails.preparedBy,
      noted_by: transmittalData.projectDetails.notedBy,
      prepared_by_signature: transmittalData.projectDetails.preparedBySignature,
      noted_by_signature: transmittalData.projectDetails.notedBySignature,
      logo_base64: transmittalData.projectDetails.logoBase64,
      items: transmittalData.items,
      columns: transmittalData.columns,
      notes: transmittalData.notes || null,
      follow_up_date: transmittalData.follow_up_date || null,
    });

    if (error) throw error;
    return data;
  }

  static async updateTransmittal(
    transmittalId: string,
    updates: Partial<SyncTransmittal>
  ) {
    const updateData: any = {};

    if (updates.status) updateData.status = updates.status;
    if (updates.projectDetails) {
      Object.assign(updateData, {
        sender: updates.projectDetails.sender,
        sender_email: updates.projectDetails.senderEmail,
        recipient_company: updates.projectDetails.recipientCompany,
        project_name: updates.projectDetails.projectName,
        // Add other fields as needed
      });
    }
    if (updates.items) updateData.items = updates.items;
    if (updates.notes) updateData.notes = updates.notes;

    const { data, error } = await supabase
      .from('transmittals')
      .update(updateData)
      .eq('id', transmittalId);

    if (error) throw error;
    return data;
  }

  static async updateStatus(
    transmittalId: string,
    newStatus: 'draft' | 'sent' | 'received' | 'pending',
    userId: string,
    notes?: string
  ) {
    const { data: transmittal } = await supabase
      .from('transmittals')
      .select('status')
      .eq('id', transmittalId)
      .single();

    await supabase.from('transmittals').update({ status: newStatus }).eq('id', transmittalId);

    await supabase.from('transmittal_history').insert({
      transmittal_id: transmittalId,
      user_id: userId,
      action: 'status_changed',
      previous_status: transmittal?.status || null,
      new_status: newStatus,
      notes: notes || null,
    });
  }

  static async getTransmittals(userId: string, companyId?: string) {
    let query = supabase
      .from('transmittals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  static async deleteTransmittal(transmittalId: string) {
    const { error } = await supabase.from('transmittals').delete().eq('id', transmittalId);
    if (error) throw error;
  }
}
