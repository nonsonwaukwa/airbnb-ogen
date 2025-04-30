import React from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Download, Loader2 } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import type { Invoice, InvoiceLineItem } from '../types';
import { Skeleton } from '@/components/ui/skeleton';
import { InvoicePDFDocument } from './InvoicePDFDocument';
import { useGetSystemSettings } from '@/features/settings/hooks/useSystemSettings';
import type { SystemSettings } from '@/features/settings/types';
import { Link } from 'react-router-dom';

// --- Helper Functions ---
const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'N/A';
  try {
    const date = dateString.includes('T') ? new Date(dateString) : new Date(`${dateString}T00:00:00`);
    return format(date, 'PPP'); // Example: September 14th, 2024
  } catch (error) {
    console.error('Error formatting date:', dateString, error);
    return 'Invalid Date';
  }
};

const formatCurrency = (amount: number | null | undefined, currency: string | null | undefined) => {
    if (amount === null || amount === undefined) return '--';
    const ccy = currency || 'NGN'; // Default currency
    const options: Intl.NumberFormatOptions = {
        style: 'currency',
        currency: ccy,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    };
    try {
        return amount.toLocaleString(undefined, options);
    } catch (e) {
        console.error("Currency formatting error", e);
        return `${ccy} ${amount.toFixed(2)}`; // Fallback
    }
};

const getInvoiceStatusVariant = (status: Invoice['status'] | null | undefined): "default" | "secondary" | "destructive" | "outline" => {
  switch (status?.toLowerCase()) {
    case 'paid':
      return 'default';
    case 'sent':
    case 'partial':
      return 'secondary';
    case 'draft':
      return 'outline';
    case 'overdue':
    case 'void':
    case 'refunded':
      return 'destructive';
    default:
      return 'outline';
  }
};

interface InvoiceViewDisplayProps {
  invoice: Invoice | null;
  isLoading?: boolean;
}

export const InvoiceViewDisplay: React.FC<InvoiceViewDisplayProps> = ({ invoice, isLoading: isLoadingInvoice }) => {

  // Fetch system settings
  const { data: systemSettings, isLoading: isLoadingSettings, error: settingsError } = useGetSystemSettings();
  // Note: We might want to handle settingsError more gracefully, maybe show fallback text

  // Combine loading states
  const isLoading = isLoadingInvoice || isLoadingSettings;

  // Handle loading state
  if (isLoading) { // Check combined loading state
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader><Skeleton className="h-8 w-3/4" /></CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader>
          <CardContent><Skeleton className="h-20 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  // Handle case where invoice is not found or null
  if (!invoice) {
    return <div className="text-center text-muted-foreground py-10">Invoice not found.</div>;
  }

  const amountDue = (invoice.total_amount || 0) - (invoice.amount_paid || 0);
  const pdfFileName = `Invoice-${invoice.invoice_number || 'details'}.pdf`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                {/* Left Side: Title & Basic Info */}
                <div>
                    <CardTitle className="text-2xl font-bold mb-1">Invoice #{invoice.invoice_number}</CardTitle>
                    <CardDescription>
                        Issued: {formatDate(invoice.issue_date)} {invoice.due_date ? ` | Due: ${formatDate(invoice.due_date)}` : ''}
                    </CardDescription>
                    {invoice.booking?.booking_number && (
                         <p className="text-sm text-muted-foreground mt-1">
                            Related Booking: {' '}
                            <Link 
                                to={`/bookings/${invoice.booking_id}`}
                                className="text-primary hover:underline"
                            >
                                #{invoice.booking.booking_number}
                            </Link>
                         </p>
                     )}
                </div>

                {/* Right Side: Status & Download */}
                <div className="flex flex-col items-start md:items-end gap-2">
                    <Badge variant={getInvoiceStatusVariant(invoice.status)} className="capitalize text-base px-3 py-1">
                        {invoice.status}
                    </Badge>
                    
                    {/* PDF Download Link - Pass real systemSettings */}
                    <PDFDownloadLink
                        document={<InvoicePDFDocument invoice={invoice} systemSettings={systemSettings} />}
                        fileName={pdfFileName}
                    >
                         {({ blob, url, loading, error }) => (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="mt-2 md:mt-0"
                                disabled={loading} // Disable while PDF is rendering
                            >
                                {loading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Download className="mr-2 h-4 w-4" />
                                )}
                                {loading ? 'Generating PDF...' : 'Download PDF'}
                                {/* TODO: Consider showing PDF generation error here */}
                            </Button>
                        )}
                    </PDFDownloadLink>
                </div>
            </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Information */}
            <div className="space-y-1">
                <h3 className="text-lg font-semibold mb-2">Bill To:</h3>
                <p className="font-medium">{invoice.customer_name}</p>
                {invoice.customer_email && <p className="text-sm text-muted-foreground">{invoice.customer_email}</p>}
                {invoice.customer_phone && <p className="text-sm text-muted-foreground">{invoice.customer_phone}</p>}
                {invoice.customer_address_street && <p className="text-sm text-muted-foreground">{invoice.customer_address_street}</p>}
                {(invoice.customer_address_city || invoice.customer_address_state || invoice.customer_address_postal_code) && (
                    <p className="text-sm text-muted-foreground">
                        {invoice.customer_address_city}{invoice.customer_address_city && invoice.customer_address_state ? ', ' : ''}{invoice.customer_address_state} {invoice.customer_address_postal_code}
                    </p>
                )}
                {invoice.customer_address_country && <p className="text-sm text-muted-foreground">{invoice.customer_address_country}</p>}
            </div>

            {/* Company Information (Now uses fetched systemSettings) */}
            <div className="space-y-1 text-left md:text-right">
                <h3 className="text-lg font-semibold mb-2">From:</h3>
                <p className="font-medium">{systemSettings?.company_name || '[Company Name Not Set]'}</p>
                <p className="text-sm text-muted-foreground">{systemSettings?.company_address || '[Company Address Not Set]'}</p>
                <p className="text-sm text-muted-foreground">{systemSettings?.company_email || '[Company Email Not Set]'}</p>
                <p className="text-sm text-muted-foreground">{systemSettings?.company_phone || '[Company Phone Not Set]'}</p>
            </div>
        </CardContent>
      </Card>

      {/* Line Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60%]">Description</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.invoice_line_items && invoice.invoice_line_items.length > 0 ? (
                invoice.invoice_line_items.map((item: InvoiceLineItem) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.description}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unit_price, invoice.currency)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.line_total, invoice.currency)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                    No line items found for this invoice.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Totals and Notes Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Notes Section */}
          <div className="md:col-span-2 space-y-2">
              {invoice.notes && (
                  <>
                      <h3 className="text-lg font-semibold">Notes:</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">{invoice.notes}</p>
                  </>
              )}
               {/* Display Bank Details from System Settings if available */}
               {systemSettings?.bank_name && (
                  <div className="mt-4 pt-4 border-t">
                      <h3 className="text-lg font-semibold mb-2">Payment Details:</h3>
                      <p className="text-sm text-muted-foreground">Bank: {systemSettings.bank_name}</p>
                      <p className="text-sm text-muted-foreground">Account Name: {systemSettings.bank_account_name}</p>
                      <p className="text-sm text-muted-foreground">Account Number: {systemSettings.bank_account_number}</p>
                   </div>
               )}
          </div>

          {/* Totals Section */}
          <div className="space-y-2 text-right">
              <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>{formatCurrency(invoice.subtotal_amount, invoice.currency)}</span>
              </div>
              {invoice.discount_amount > 0 && (
                  <div className="flex justify-between">
                      <span className="text-muted-foreground">Discount:</span>
                      <span>-{formatCurrency(invoice.discount_amount, invoice.currency)}</span>
                  </div>
              )}
              {invoice.tax_amount > 0 && (
                 <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax:</span>
                      <span>{formatCurrency(invoice.tax_amount, invoice.currency)}</span>
                  </div> 
              )}
              <Separator className="my-2" />
              <div className="flex justify-between font-semibold text-lg">
                  <span>Total:</span>
                  <span>{formatCurrency(invoice.total_amount, invoice.currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount Paid:</span>
                  <span>{formatCurrency(invoice.amount_paid, invoice.currency)}</span>
              </div>
               <div className="flex justify-between font-semibold text-base text-primary">
                  <span>Amount Due:</span>
                  <span>{formatCurrency(amountDue, invoice.currency)}</span>
              </div>
          </div>
      </div>

       {/* Add Payment/Void Actions here later? */} 
    </div>
  );
}; 