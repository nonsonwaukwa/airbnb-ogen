import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { format, parseISO } from 'date-fns';

import type { Invoice, InvoiceLineItem } from '../types';
// Import the official SystemSettings type
import type { SystemSettings } from '@/features/settings/types'; 

// --- Font Registration (Important for non-Latin characters if needed) ---
// Example: Registering Inter font (assuming font files are available)
// Font.register({
//   family: 'Inter',
//   fonts: [
//     { src: '/path/to/Inter-Regular.ttf' }, // Adjust paths as needed
//     { src: '/path/to/Inter-Bold.ttf', fontWeight: 'bold' },
//   ],
// });

// --- Styles --- 
// Note: Styling in react-pdf is different from CSS (no cascading, limited properties)
const styles = StyleSheet.create({
    page: {
        fontFamily: 'Helvetica', // Default font
        // fontFamily: 'Inter', // Use registered font
        fontSize: 10,
        paddingTop: 30,
        paddingLeft: 40,
        paddingRight: 40,
        paddingBottom: 40,
        backgroundColor: '#FFFFFF'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
        paddingBottom: 10,
    },
    companyInfo: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        maxWidth: '60%',
    },
    companyName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    companyAddress: {
        fontSize: 9,
        color: '#444444'
    },
    companyLogo: {
        width: 80,
        height: 40,
        objectFit: 'contain' // Or 'cover' depending on logo aspect ratio
    },
    invoiceInfo: {
        flexDirection: 'column',
        alignItems: 'flex-end',
    },
    invoiceTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 5,
        color: '#333333'
    },
    invoiceNumber: {
        fontSize: 11,
        marginBottom: 2,
    },
    invoiceDate: {
        fontSize: 9,
        color: '#555555',
    },
    billingSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        marginBottom: 30,
    },
    billTo: {
        maxWidth: '50%'
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#666666'
    },
    customerName: {
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 3,
    },
    customerDetails: {
        fontSize: 9,
        color: '#444444'
    },
    statusSection: {
        alignItems: 'flex-end'
    },
    statusBadge: {
        padding: '4px 8px',
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 5,
        backgroundColor: '#CCCCCC', // Default
        color: '#FFFFFF',
    },
    statusPaid: { backgroundColor: '#28a745' },
    statusPartial: { backgroundColor: '#ffc107', color: '#000000' },
    statusDue: { backgroundColor: '#dc3545' },
    statusDraft: { backgroundColor: '#6c757d' },
    statusVoid: { backgroundColor: '#343a40' },
    // Table Styles
    table: {
        display: "flex", // Changed from 'table' which might not be fully supported
        width: 'auto',
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#EEEEEE',
        marginBottom: 20,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
        backgroundColor: '#FFFFFF',
        alignItems: 'center'
    },
    tableHeaderRow: {
        backgroundColor: '#F8F8F8',
        minHeight: 20, // Ensure header has height
    },
    tableColHeader: {
        // width: '25%', // Assign specific widths
        padding: 5,
        fontWeight: 'bold',
        borderRightWidth: 1,
        borderRightColor: '#EEEEEE',
        textAlign: 'left',
        fontSize: 9
    },
    tableCol: {
        // width: '25%', // Assign specific widths
        padding: 5,
        borderRightWidth: 1,
        borderRightColor: '#EEEEEE',
        textAlign: 'left',
        fontSize: 9,
    },
    tableColDesc: { width: '45%' },
    tableColQty: { width: '10%', textAlign: 'right' },
    tableColPrice: { width: '20%', textAlign: 'right' },
    tableColTotal: { width: '25%', textAlign: 'right', borderRightWidth: 0 }, // Last column no border

    noBorder: { borderRightWidth: 0 },
    textRight: { textAlign: 'right' },

    // Totals Section
    totalsSection: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 10,
    },
    totalsBox: {
        width: '40%',
    },
    totalsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 3,
        paddingBottom: 2,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0'
    },
    totalsLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#555555'
    },
    totalsValue: {
        fontSize: 10,
        textAlign: 'right'
    },
    grandTotalRow: {
        marginTop: 5,
        paddingTop: 5,
        borderTopWidth: 1,
        borderTopColor: '#AAAAAA'
    },
    grandTotalLabel: {
        fontWeight: 'bold',
        fontSize: 11,
    },
    grandTotalValue: {
        fontWeight: 'bold',
        fontSize: 11,
        textAlign: 'right'
    },

    // Notes & Footer
    notesSection: {
        marginTop: 30,
        borderTopWidth: 1,
        borderTopColor: '#EEEEEE',
        paddingTop: 10,
    },
    notesTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#666666'
    },
    notesText: {
        fontSize: 9,
        color: '#444444'
    },
    footer: {
        position: 'absolute',
        bottom: 20,
        left: 40,
        right: 40,
        textAlign: 'center',
        fontSize: 8,
        color: '#888888',
        borderTopWidth: 1,
        borderTopColor: '#EEEEEE',
        paddingTop: 5,
    },
});

// Helper function for currency formatting
const formatCurrencyPDF = (value: number | null | undefined, currency: string | null | undefined = 'NGN') => {
    if (value === null || value === undefined) return '--';
    const ccy = currency || 'NGN';
    // Basic formatting for PDF compatibility
    return `${ccy} ${value.toFixed(2)}`;
};

// Helper function for date formatting
const formatDatePDF = (dateString: string | null | undefined) => {
    if (!dateString) return '--';
    try {
        return format(parseISO(dateString), 'dd MMM yyyy');
    } catch (e) {
        return dateString; // Fallback to original string if parsing fails
    }
};

// Helper to get status style
const getStatusStyle = (status: Invoice['status'] | undefined) => {
    switch (status) {
        case 'paid': return styles.statusPaid;
        case 'partial': return styles.statusPartial;
        case 'overdue': return styles.statusDue;
        case 'draft': return styles.statusDraft;
        case 'void': return styles.statusVoid;
        case 'sent': return {};
        case 'refunded': return {};
        default: return {};
    }
};

// --- Component Props --- 
interface InvoicePDFDocumentProps {
    invoice: Invoice | null;
    systemSettings?: SystemSettings | null; // Now uses the imported type
}

// --- The PDF Document Component ---
export const InvoicePDFDocument: React.FC<InvoicePDFDocumentProps> = ({ invoice, systemSettings }) => (
    <Document title={`Invoice ${invoice?.invoice_number || ''}`}>
        <Page size="A4" style={styles.page}>
            {/* === Header === */} 
            <View style={styles.header}>
                {/* Company Info */} 
                <View style={styles.companyInfo}>
                     {systemSettings?.company_logo_url && (
                        <Image 
                            style={styles.companyLogo} 
                            src={systemSettings.company_logo_url} 
                        />
                    )}
                    <Text style={styles.companyName}>{systemSettings?.company_name || '[Company Name Not Set]'}</Text>
                    <Text style={styles.companyAddress}>{systemSettings?.company_address || '[Company Address Not Set]'}</Text>
                    <Text style={styles.companyAddress}>{systemSettings?.company_email || '[Company Email Not Set]'} | {systemSettings?.company_phone || '[Company Phone Not Set]'}</Text>
                </View>

                {/* Invoice Info */} 
                <View style={styles.invoiceInfo}>
                    <Text style={styles.invoiceTitle}>Invoice</Text>
                    <Text style={styles.invoiceNumber}># {invoice?.invoice_number || 'N/A'}</Text>
                    <Text style={styles.invoiceDate}>Issued: {formatDatePDF(invoice?.issue_date)}</Text>
                    <Text style={styles.invoiceDate}>Due: {formatDatePDF(invoice?.due_date)}</Text>
                </View>
            </View>

            {/* === Billing & Status === */} 
            <View style={styles.billingSection}>
                {/* Bill To */} 
                <View style={styles.billTo}>
                    <Text style={styles.sectionTitle}>Bill To:</Text>
                    <Text style={styles.customerName}>{invoice?.customer_name || 'N/A'}</Text>
                    <Text style={styles.customerDetails}>{invoice?.customer_email || ''}</Text>
                    <Text style={styles.customerDetails}>{invoice?.customer_phone || ''}</Text>
                    <Text style={styles.customerDetails}>{invoice?.customer_address_street || ''}</Text>
                    <Text style={styles.customerDetails}>
                        {invoice?.customer_address_city ? `${invoice.customer_address_city}, ` : ''}
                        {invoice?.customer_address_state ? `${invoice.customer_address_state} ` : ''}
                        {invoice?.customer_address_postal_code || ''}
                    </Text>
                    <Text style={styles.customerDetails}>
                        {invoice?.customer_address_country || ''}
                    </Text>
                    {invoice?.booking && <Text style={styles.customerDetails}>Booking Ref: {invoice.booking.booking_number}</Text>}
                </View>

                {/* Status */} 
                <View style={styles.statusSection}>
                     <Text style={[styles.statusBadge, getStatusStyle(invoice?.status)]}>
                        {invoice?.status?.toUpperCase() || 'UNKNOWN'}
                    </Text>
                    <Text style={styles.invoiceDate}>Total Amount: {formatCurrencyPDF(invoice?.total_amount, invoice?.currency)}</Text>
                    <Text style={styles.invoiceDate}>Amount Paid: {formatCurrencyPDF(invoice?.amount_paid, invoice?.currency)}</Text>
                    <Text style={styles.invoiceDate}>Amount Due: {formatCurrencyPDF((invoice?.total_amount || 0) - (invoice?.amount_paid || 0), invoice?.currency)}</Text>
                </View>
            </View>

            {/* === Line Items Table === */} 
            <View style={styles.table}>
                {/* Table Header */} 
                <View style={[styles.tableRow, styles.tableHeaderRow]}>
                    <Text style={[styles.tableColHeader, styles.tableColDesc]}>Description</Text>
                    <Text style={[styles.tableColHeader, styles.tableColQty]}>Qty</Text>
                    <Text style={[styles.tableColHeader, styles.tableColPrice]}>Unit Price</Text>
                    <Text style={[styles.tableColHeader, styles.tableColTotal, styles.noBorder]}>Total</Text>
                </View>
                {/* Table Body */} 
                {(invoice?.invoice_line_items || []).map((item: InvoiceLineItem, index: number) => (
                    <View style={styles.tableRow} key={item.id || index}>
                        <Text style={[styles.tableCol, styles.tableColDesc]}>{item.description}</Text>
                        <Text style={[styles.tableCol, styles.tableColQty]}>{item.quantity}</Text>
                        <Text style={[styles.tableCol, styles.tableColPrice]}>{formatCurrencyPDF(item.unit_price, invoice?.currency)}</Text>
                        <Text style={[styles.tableCol, styles.tableColTotal, styles.noBorder]}>{formatCurrencyPDF(item.line_total, invoice?.currency)}</Text>
                    </View>
                ))}
                 {/* Add a row if no items exist */} 
                {(invoice?.invoice_line_items || []).length === 0 && (
                    <View style={styles.tableRow}>
                         <Text style={[styles.tableCol, { width: '100%', textAlign: 'center', borderRightWidth: 0 }]}>No line items.</Text>
                    </View>
                )}
            </View>

             {/* === Totals === */} 
            <View style={styles.totalsSection}>
                <View style={styles.totalsBox}>
                    {/* Subtotal */} 
                     <View style={styles.totalsRow}>
                        <Text style={styles.totalsLabel}>Subtotal:</Text>
                        <Text style={styles.totalsValue}>{formatCurrencyPDF(invoice?.subtotal_amount, invoice?.currency)}</Text>
                    </View>
                    {/* Discount */} 
                    {(invoice?.discount_amount ?? 0) > 0 && (
                        <View style={styles.totalsRow}>
                            <Text style={styles.totalsLabel}>Discount:</Text>
                            <Text style={styles.totalsValue}>- {formatCurrencyPDF(invoice?.discount_amount, invoice?.currency)}</Text>
                        </View>
                    )}
                    {/* Tax */} 
                    {(invoice?.tax_amount ?? 0) > 0 && (
                        <View style={styles.totalsRow}>
                            <Text style={styles.totalsLabel}>Tax:</Text>
                            <Text style={styles.totalsValue}>{formatCurrencyPDF(invoice?.tax_amount, invoice?.currency)}</Text>
                        </View>
                    )}
                    {/* Grand Total */} 
                    <View style={[styles.totalsRow, styles.grandTotalRow]}>
                        <Text style={[styles.totalsLabel, styles.grandTotalLabel]}>Total Amount:</Text>
                        <Text style={[styles.totalsValue, styles.grandTotalValue]}>{formatCurrencyPDF(invoice?.total_amount, invoice?.currency)}</Text>
                    </View>
                    {/* Amount Paid */} 
                     <View style={styles.totalsRow}>
                        <Text style={styles.totalsLabel}>Amount Paid:</Text>
                        <Text style={styles.totalsValue}>- {formatCurrencyPDF(invoice?.amount_paid, invoice?.currency)}</Text>
                    </View>
                    {/* Amount Due */} 
                     <View style={[styles.totalsRow, styles.grandTotalRow, { borderTopColor: '#CCCCCC' }]}>
                        <Text style={[styles.totalsLabel, styles.grandTotalLabel]}>Amount Due:</Text>
                        <Text style={[styles.totalsValue, styles.grandTotalValue]}>{formatCurrencyPDF((invoice?.total_amount || 0) - (invoice?.amount_paid || 0), invoice?.currency)}</Text>
                    </View>
                </View>
            </View>

            {/* === Notes === */} 
            {(invoice?.notes || systemSettings?.bank_name) && (
                <View style={styles.notesSection}>
                    {invoice?.notes && ( 
                        <> 
                            <Text style={styles.notesTitle}>Notes:</Text>
                            <Text style={styles.notesText}>{invoice.notes}</Text>
                         </>
                    )}
                    {/* Bank Details (from System Settings) */} 
                    {systemSettings?.bank_name && (
                         <> 
                            <Text style={[styles.notesTitle, { marginTop: 10 }]}>Payment Details:</Text>
                            <Text style={styles.notesText}>Bank: {systemSettings.bank_name}</Text>
                            <Text style={styles.notesText}>Account Name: {systemSettings.bank_account_name}</Text>
                            <Text style={styles.notesText}>Account Number: {systemSettings.bank_account_number}</Text>
                         </>
                    )}
                </View>
            )}

            {/* === Footer === */} 
            <Text style={styles.footer}>
                Thank you for your business! | {systemSettings?.company_name || '[Company Name Not Set]'}
            </Text>
        </Page>
    </Document>
); 