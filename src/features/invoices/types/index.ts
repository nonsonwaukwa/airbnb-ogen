import type { Booking } from '@/features/bookings/types';
import type { DbUserProfile } from '@/types/auth';

// Mirrors public.invoice_line_items table
export interface InvoiceLineItem {
  id: string; // UUID
  invoice_id: string; // UUID
  description: string;
  quantity: number; // NUMERIC mapped to number
  unit_price: number; // NUMERIC mapped to number
  line_total: number; // NUMERIC (Generated column)
  created_at: string; // TIMESTAMPTZ
  updated_at: string; // TIMESTAMPTZ
}

// Mirrors public.invoices table
export interface Invoice {
  id: string; // UUID
  invoice_number: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  customer_address_street: string | null;
  customer_address_city: string | null;
  customer_address_state: string | null;
  customer_address_postal_code: string | null;
  customer_address_country: string | null;
  issue_date: string; // DATE mapped to string
  due_date: string | null; // DATE mapped to string
  subtotal_amount: number; // NUMERIC mapped to number
  tax_amount: number; // NUMERIC mapped to number
  discount_amount: number; // NUMERIC mapped to number
  total_amount: number; // NUMERIC mapped to number
  amount_paid: number; // NUMERIC mapped to number
  currency: string;
  // Use literal types based on the updated constraint
  status: 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'void' | 'refunded'; 
  notes: string | null;
  booking_id: string | null; // UUID
  payment_method: string | null;
  payment_date: string | null; // DATE mapped to string
  created_by_user_id: string | null; // UUID
  created_at: string; // TIMESTAMPTZ
  updated_at: string; // TIMESTAMPTZ

  // Relational data (fetched separately or via joins)
  invoice_line_items?: InvoiceLineItem[];
  booking?: Pick<Booking, 'id' | 'booking_number'> | null;
  created_by?: Pick<DbUserProfile, 'id' | 'full_name' | 'email'> | null;
}

// --- Specific List Type ---
// Moved from hooks file
export type InvoiceListItem = Pick<
    Invoice,
    'id' | 'invoice_number' | 'customer_name' | 'issue_date' | 'due_date' | 'total_amount' | 'amount_paid' | 'currency' | 'status'
> & { booking: { id: string; booking_number: string } | null };

// --- Payloads for API Hooks ---

// Payload for creating a new invoice line item (within InvoiceForm)
export type CreateInvoiceLineItemPayload = Omit<InvoiceLineItem, 'id' | 'invoice_id' | 'line_total' | 'created_at' | 'updated_at'>;

// Payload for creating a new invoice
// Omit fields that are auto-generated or calculated by triggers initially
export type CreateInvoicePayload = Omit<Invoice, 
    'id' | 
    'invoice_number' | 
    'created_at' | 
    'updated_at' | 
    'created_by_user_id' | 
    'subtotal_amount' | // Calculated by trigger
    'total_amount' | // Calculated by trigger
    'booking' | // Relation handled via booking_id
    'created_by' | // Relation handled via created_by_user_id (if needed, or RLS)
    'invoice_line_items' | // Passed separately
    'status' | // Allow explicit setting below
    'amount_paid' // Allow explicit setting below
> & {
  line_items: CreateInvoiceLineItemPayload[];
  // Allow explicitly setting status (e.g., to 'paid' if auto-created from paid booking)
  status?: 'draft' | 'sent' | 'paid'; 
  // Allow explicitly setting amount_paid (useful if status is 'paid')
  amount_paid?: number; 
};

// Payload for updating an existing invoice (flexible)
export type UpdateInvoicePayload = Partial<Omit<Invoice, 'id' | 'invoice_number' | 'created_at' | 'updated_at' | 'created_by_user_id' | 'booking' | 'created_by' | 'invoice_line_items' | 'subtotal_amount' | 'total_amount'>> & {
  id: string; // ID is required
  // Allow updating/adding/deleting line items potentially?
  // For simplicity now, we might handle line item changes separately or require full replacement
  line_items?: CreateInvoiceLineItemPayload[]; // Simplistic: replace all line items on update
  deleted_line_item_ids?: string[]; // Add this if fine-grained updates are needed
};

// Payload for recording a payment
export interface RecordPaymentPayload {
    id: string; // Invoice ID
    amount: number;
    payment_date: string; // ISO date string
    payment_method: string;
} 