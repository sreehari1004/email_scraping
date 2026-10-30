export interface Job {
  id: number;
  job_name: string;
  created_at: string;
  status: 'Completed' | 'In Progress' | 'Failed' | 'Partial';
  total_websites: number;
  completed_websites: number;
  failed_websites: number;
  in_progress_websites: number;
  contacts_found: number;
  duration: string;
}

export interface JobWebsite {
  id: number;
  job_id: number;
  website: string;
  url: string;
  status: 'Completed' | 'In Progress' | 'Failed' | 'Partial';
  contacts_count: number;
  last_updated: string;
  error_message?: string;
}

export interface Contact {
  id: number;
  job_id: number;
  website_id: number;
  name: string;
  email: string;
  phone: string;
  designation: string;
  source_url: string;
  company_name: string;
  address?: string;
  social_links?: string;
  created_at?: string;
}

export interface OutreachLog {
  id: number;
  company_name: string;
  email: string;
  subject: string;
  body: string;
  status: 'Sent' | 'In Progress' | 'Completed' | 'Failed';
  sent_on: string;
  error_details?: string;
}

export interface AnalyticsData {
  kpis: {
    total_websites: { value: number; trend: string };
    unique_contacts: { value: number; trend: string };
    email_addresses: { value: number; trend: string };
    phone_numbers: { value: number; trend: string };
  };
  website_status: {
    total: number;
    completed: { count: number; percent: number };
    failed: { count: number; percent: number };
    partial: { count: number; percent: number };
    in_progress: { count: number; percent: number };
  };
  activity_chart: Array<{ date: string; count: number }>;
}

