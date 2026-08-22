export type ConsentStatus = 'OPTED_IN' | 'PENDING' | 'OPTED_OUT';

export type Contact = {
  id: number;
  name: string;
  mobile: string;
  normalized_phone?: string;
  consent_status: ConsentStatus;
  created_at?: string;
};

export type ContactGroup = {
  id: number;
  name: string;
  max_members: number;
  member_count: number;
  contacts: Contact[];
  created_at?: string;
};

export type CampaignRecipient = {
  id: number;
  name: string;
  phone: string;
  status: string;
  attempts: number;
  error_message?: string;
};

export type Campaign = {
  id: number;
  name: string;
  message: string;
  delay_seconds: number;
  status: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  pending_count: number;
  created_at: string;
  recipients: CampaignRecipient[];
};

export type DashboardData = {
  total_contacts: number;
  total_campaigns: number;
  messages_sent: number;
  messages_failed: number;
  messages_pending: number;
  whatsapp_status: string;
};

export type AppSettings = {
  connected_phone: string;
  default_delay_seconds: number;
};

export type MediaFile = {
  id?: number;
  file_name: string;
  original_name?: string;
  file_type: string;
  file_size: number;
  storage_path?: string;
  url?: string;
  download_url?: string;
};
