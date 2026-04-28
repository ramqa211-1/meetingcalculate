export interface Client {
  id: string;
  name: string;
  tax_id?: string;
  address?: string;
  email?: string;
  phone?: string;
  notes?: string;
  created_at: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export type DocumentType = 'invoice' | 'receipt' | 'invoice_receipt';
export type InvoiceStatus = 'issued' | 'cancelled';

export interface Invoice {
  id: string;
  document_number: string;
  document_type: DocumentType;
  issue_date: string;
  client_id: string;
  client_snapshot: {
    name: string;
    tax_id?: string;
    address?: string;
    email?: string;
    phone?: string;
  };
  items: InvoiceItem[];
  total: number;
  notes?: string;
  linked_event_ids?: string[];
  status: InvoiceStatus;
  created_at: string;
}

export interface BusinessProfile {
  business_name: string;
  osek_id: string;
  address?: string;
  phone?: string;
  email?: string;
  last_invoice_number: number;
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  invoice: 'חשבונית עסקה',
  receipt: 'קבלה',
  invoice_receipt: 'חשבונית קבלה',
};
