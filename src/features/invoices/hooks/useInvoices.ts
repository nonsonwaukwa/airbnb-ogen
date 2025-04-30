import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/config/supabaseClient';
import type {
    Invoice,
    InvoiceLineItem,
    CreateInvoicePayload,
    UpdateInvoicePayload,
    RecordPaymentPayload,
    InvoiceListItem
} from '../types';
import { toast } from 'sonner';
import { pdf } from '@react-pdf/renderer';
import { InvoicePDFDocument } from '../components/InvoicePDFDocument';
import { useGetSystemSettings } from '@/features/settings/hooks/useSystemSettings';
import type { SystemSettings } from '@/features/settings/types';
import React from 'react';

const INVOICE_QUERY_KEY = 'invoices';

// == Query Functions ==

const getInvoices = async (): Promise<InvoiceListItem[]> => {
    const { data, error } = await supabase
        .from('invoices')
        .select(`
            id,
            invoice_number,
            customer_name,
            issue_date,
            due_date,
            total_amount,
            amount_paid,
            currency,
            status,
            bookings ( id, booking_number )
        `)
        .order('issue_date', { ascending: false });

    if (error) {
        console.error('Error fetching invoices:', error);
        throw new Error(error.message);
    }
    
    // Manually map the data to the desired structure, handling the bookings array
    const mappedData = (data || []).map(item => ({
      ...item,
      // Supabase returns bookings as an array or null for LEFT JOIN
      booking: Array.isArray(item.bookings) ? (item.bookings[0] || null) : (item.bookings || null)
    }));

    return mappedData as InvoiceListItem[]; // Type assertion is safer after mapping
};

const getInvoice = async (id: string): Promise<Invoice | null> => {
    const { data, error } = await supabase
        .from('invoices')
        .select(`
            *,
            bookings ( id, booking_number ),
            created_by:profiles ( id, full_name, email ),
            invoice_line_items (*)
        `)
        .eq('id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        console.error(`Error fetching invoice ${id}:`, error);
        throw new Error(error.message);
    }

    // Map bookings to booking and ensure line items are sorted
    const mappedData = data ? {
        ...data,
        booking: Array.isArray(data.bookings) ? data.bookings[0] : data.bookings,
        invoice_line_items: data.invoice_line_items?.sort((a: InvoiceLineItem, b: InvoiceLineItem) => 
            a.created_at.localeCompare(b.created_at)
        )
    } : null;

    return mappedData;
};

// == Mutation Functions ==

// Helper to generate unique invoice number (simple example)
// TODO: Implement a more robust server-side generation (e.g., DB sequence or function)
const generateInvoiceNumber = async (): Promise<string> => {
  // Very basic example - replace with something robust
  const timestamp = Date.now().toString().slice(-6);
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV-${timestamp}${randomPart}`;
};

const createInvoice = async (payload: CreateInvoicePayload): Promise<Invoice> => {
    // Destructure status and amount_paid from the payload, along with others
    const { line_items, status, amount_paid, ...invoiceData } = payload;

    // 1. Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User must be authenticated to create an invoice');

    // 2. Generate Invoice Number
    const invoice_number = await generateInvoiceNumber();

    // 3. Insert Invoice Record - Use status & amount_paid from payload
    const { data: newInvoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
            ...invoiceData,
            invoice_number,
            status: status || 'draft', // Use provided status, default to draft
            amount_paid: amount_paid || 0, // Use provided amount_paid, default to 0
            created_by_user_id: user.id
        })
        .select()
        .single();

    if (invoiceError) {
        console.error('Error creating invoice:', invoiceError);
        throw new Error(`Failed to create invoice: ${invoiceError.message}`);
    }
    if (!newInvoice) throw new Error('Failed to create invoice, no data returned.');

    // 4. Insert Line Items
    if (line_items && line_items.length > 0) {
        const lineItemPayloads = line_items.map(item => ({
            ...item,
            invoice_id: newInvoice.id,
        }));

        const { error: lineError } = await supabase
            .from('invoice_line_items')
            .insert(lineItemPayloads);

        if (lineError) {
            console.error('Error inserting line items:', lineError);
            // Don't necessarily fail the whole operation, but warn the user
            toast.warning(`Invoice created, but failed to add line items: ${lineError.message}. Please edit the invoice.`);
            // Note: Invoice totals might be incorrect until edited due to trigger failure
        }
    }

    // Refetch the invoice with line items to return complete data
    // The trigger should have updated totals by now, and status should be correct from insert
    const createdInvoice = await getInvoice(newInvoice.id);
    if (!createdInvoice) throw new Error('Failed to refetch created invoice');
    return createdInvoice;
};

const updateInvoice = async (payload: UpdateInvoicePayload): Promise<Invoice> => {
    const { id, line_items, deleted_line_item_ids, ...invoiceData } = payload;

    // --- Complex Line Item Handling (Optional - requires careful implementation) ---
    // If handling granular line item updates:
    // 1. Delete items marked for deletion
    if (deleted_line_item_ids && deleted_line_item_ids.length > 0) {
       const { error: deleteError } = await supabase
         .from('invoice_line_items')
         .delete()
         .in('id', deleted_line_item_ids);
       if (deleteError) console.error('Error deleting line items:', deleteError); // Handle error
    }
    // 2. Update existing items / Insert new items (identify by presence/absence of ID?)
    // This requires more complex logic to diff arrays.

    // --- Simplistic Approach: Replace all line items --- 
    if (line_items) { 
      // Delete existing line items for this invoice first
      const { error: deleteError } = await supabase
        .from('invoice_line_items')
        .delete()
        .eq('invoice_id', id);
      if (deleteError) {
        console.error('Error deleting existing line items during update:', deleteError);
        toast.error(`Update failed: Could not replace line items. ${deleteError.message}`);
        throw new Error(`Could not replace line items: ${deleteError.message}`);
      }

      // Insert the new line items
      if (line_items.length > 0) {
        const lineItemPayloads = line_items.map(item => ({ ...item, invoice_id: id }));
        const { error: insertError } = await supabase
          .from('invoice_line_items')
          .insert(lineItemPayloads);
        if (insertError) {
          console.error('Error inserting new line items during update:', insertError);
          toast.warning(`Invoice updated, but failed to save line items: ${insertError.message}.`);
          // Totals might be wrong until trigger runs successfully
        }
      }
    }
    // --- End Simplistic Approach ---

    // Update the main invoice data
    const { data: updatedInvoice, error: updateError } = await supabase
        .from('invoices')
        .update(invoiceData)
        .eq('id', id)
        .select()
        .single();

    if (updateError) {
        console.error(`Error updating invoice ${id}:`, updateError);
        throw new Error(`Failed to update invoice: ${updateError.message}`);
    }
    if (!updatedInvoice) throw new Error('Failed to update invoice, no data returned.');

    // Refetch potentially needed if triggers don't update everything in time for UI
    const finalInvoice = await getInvoice(updatedInvoice.id);
    if (!finalInvoice) throw new Error('Failed to refetch updated invoice');
    return finalInvoice;
};

const recordInvoicePayment = async (payload: RecordPaymentPayload): Promise<Invoice> => {
  const { id, amount, payment_date, payment_method } = payload;

  // Fetch current amount paid
  const { data: currentInvoice, error: fetchError } = await supabase
    .from('invoices')
    .select('amount_paid, total_amount')
    .eq('id', id)
    .single();

  if (fetchError || !currentInvoice) {
      throw new Error(`Could not fetch invoice to record payment: ${fetchError?.message || 'Not found'}`);
  }

  const newAmountPaid = (currentInvoice.amount_paid || 0) + amount;
  let newStatus: Invoice['status'] = 'partial';
  if (newAmountPaid >= (currentInvoice.total_amount || 0)) {
      newStatus = 'paid';
  }

  const { data: updatedInvoice, error: updateError } = await supabase
    .from('invoices')
    .update({
        amount_paid: newAmountPaid,
        payment_date: payment_date,
        payment_method: payment_method,
        status: newStatus
    })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
      throw new Error(`Failed to record payment: ${updateError.message}`);
  }
  if (!updatedInvoice) throw new Error('Failed to update invoice after payment.');

  // Refetch potentially needed
  const finalInvoice = await getInvoice(updatedInvoice.id);
  if (!finalInvoice) throw new Error('Failed to refetch updated invoice after payment');
  return finalInvoice;
};

// --- Mutation Function for Voiding ---
const voidInvoice = async (id: string): Promise<Invoice> => {
    const { data: updatedInvoice, error: updateError } = await supabase
        .from('invoices')
        .update({ status: 'void' })
        .eq('id', id)
        .select()
        .single();

    if (updateError) {
        console.error(`Error voiding invoice ${id}:`, updateError);
        throw new Error(`Failed to void invoice: ${updateError.message}`);
    }
    if (!updatedInvoice) throw new Error('Failed to void invoice, no data returned.');

    // Refetch potentially needed
    const finalInvoice = await getInvoice(updatedInvoice.id);
    if (!finalInvoice) throw new Error('Failed to refetch voided invoice');
    return finalInvoice;
};

// == Helper Function for Imperative PDF Download ==

// Fetches necessary data and triggers PDF blob generation and download
export const downloadInvoicePDF = async (invoiceId: string, systemSettings: SystemSettings | null | undefined) => {
    if (!invoiceId) {
        toast.error("Invoice ID is missing.");
        return;
    }

    const toastId = toast.loading("Generating PDF...");

    try {
        // 1. Fetch the full invoice details
        const invoice = await getInvoice(invoiceId);
        if (!invoice) {
            toast.error("Failed to fetch invoice details.", { id: toastId });
            return;
        }

        // 2. Define the PDF document element
        const pdfDocumentElement = React.createElement(InvoicePDFDocument, { invoice, systemSettings });

        // 3. Generate the PDF blob using the element
        const pdfBlob = await pdf(pdfDocumentElement).toBlob();

        // 4. Create a URL and trigger download
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Invoice-${invoice.invoice_number || invoiceId}.pdf`;
        document.body.appendChild(link);
        link.click();

        // 5. Clean up
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success("PDF Download Started!", { id: toastId });

    } catch (error) {
        console.error("Error generating or downloading PDF:", error);
        toast.error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: toastId });
    }
};

// == React Query Hooks ==

export const useGetInvoices = () => {
    // Use the specific list item type for the hook
    return useQuery<InvoiceListItem[], Error>({
        queryKey: [INVOICE_QUERY_KEY],
        queryFn: getInvoices,
    });
};

export const useGetInvoice = (id: string | null) => {
    return useQuery<Invoice | null, Error>({
        queryKey: [INVOICE_QUERY_KEY, id],
        queryFn: () => (id ? getInvoice(id) : null),
        enabled: !!id, // Only run query if id is provided
    });
};

export const useCreateInvoice = () => {
    const queryClient = useQueryClient();
    return useMutation<Invoice, Error, CreateInvoicePayload>({
        mutationFn: createInvoice,
        onSuccess: (data) => {
            toast.success(`Invoice #${data.invoice_number} created successfully.`);
            queryClient.invalidateQueries({ queryKey: [INVOICE_QUERY_KEY] });
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });
};

export const useUpdateInvoice = () => {
    const queryClient = useQueryClient();
    return useMutation<Invoice, Error, UpdateInvoicePayload>({
        mutationFn: updateInvoice,
        onSuccess: (data) => {
            toast.success(`Invoice #${data.invoice_number} updated successfully.`);
            // Invalidate list and specific invoice query
            queryClient.invalidateQueries({ queryKey: [INVOICE_QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: [INVOICE_QUERY_KEY, data.id] });
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });
};

export const useRecordInvoicePayment = () => {
    const queryClient = useQueryClient();
    return useMutation<Invoice, Error, RecordPaymentPayload>({
        mutationFn: recordInvoicePayment,
        onSuccess: (data) => {
            toast.success(`Payment recorded for Invoice #${data.invoice_number}. Status: ${data.status}`);
            queryClient.invalidateQueries({ queryKey: [INVOICE_QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: [INVOICE_QUERY_KEY, data.id] });
        },
        onError: (error) => {
            toast.error(`Failed to record payment: ${error.message}`);
        },
    });
};

// --- Hook for Voiding Invoice ---
export const useVoidInvoice = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => voidInvoice(id),
        onSuccess: (data) => {
            toast.success(`Invoice #${data.invoice_number} voided successfully.`);
            // Invalidate and refetch single invoice query if it exists
            queryClient.invalidateQueries({ queryKey: [INVOICE_QUERY_KEY, data.id] });
            // Optimistically update the list view or invalidate list query
            queryClient.setQueryData<InvoiceListItem[]>([INVOICE_QUERY_KEY], (oldData) =>
                oldData ? oldData.map(inv => inv.id === data.id ? { ...inv, status: 'void' } : inv) : []
            );
            // Or just invalidate the list query
            // queryClient.invalidateQueries({ queryKey: [INVOICE_QUERY_KEY] });
        },
        onError: (error) => {
            toast.error(`Failed to void invoice: ${error.message}`);
        },
    });
}; 