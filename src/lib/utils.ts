import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNowStrict, format as formatDateFns } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount?: number | null, currencyCode: string = 'NGN'): string {
  if (amount === null || amount === undefined) {
      return ''; // Or return a default like 'N/A' or '-'
  }
  return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0, // Adjust if cents are needed
      maximumFractionDigits: 2,
    }).format(amount);
}

export function formatRelativeDate(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return formatDistanceToNowStrict(dateObj, { addSuffix: true });
  } catch (error) {
    console.error("Error formatting relative date:", error);
    return "Invalid date";
  }
}

export function formatDate(date: string | Date | null | undefined, formatString: string = 'yyyy-MM-dd'): string {
    if (!date) {
        return 'N/A'; // Return N/A or similar for null/undefined dates
    }
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      // Use format from date-fns, aliased to formatDateFns
      return formatDateFns(dateObj, formatString); 
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  }

export function getStatusBadgeVariant(
    status: string | null | undefined
): "default" | "secondary" | "destructive" | "outline" {
    switch (status?.toLowerCase()) {
        // Issue Statuses
        case 'open':
            return "default"; // Blue/Primary
        case 'in_progress':
            return "secondary"; // Yellow/Orange-ish
        case 'resolved':
            return "outline"; // Green (or use outline for less emphasis)
        case 'closed':
             return "secondary"; // Gray
        
        // Procurement Statuses
        case 'draft':
             return "secondary"; // Gray
        case 'pending approval':
             return "secondary"; // Yellow/Orange-ish 
        case 'approved':
            return "outline"; // Green
        case 'ordered':
             return "default"; // Blue
        case 'partially received':
            return "secondary"; // Lighter Blue/Purple?
        case 'received':
            return "outline"; // Green
        case 'cancelled':
        case 'rejected':
            return "destructive"; // Red

        // Booking Statuses
        case 'pending': // Booking pending payment/confirmation
             return "secondary"; // Yellow/Orange
        case 'confirmed': // Booking confirmed (paid or otherwise)
             return "outline"; // Green
        // case 'cancelled': // Already handled
        case 'completed': // Stay finished
            return "default"; // Blue/Primary
        case 'no-show':
            return "destructive"; // Red

        // Payment Statuses (Bookings/Invoices)
        // case 'pending': // Already handled
        case 'paid':
            return "outline"; // Green
        case 'partially_paid':
        case 'partial':
             return "secondary"; // Yellow/Orange
        case 'refunded':
             return "destructive"; // Red
        // case 'cancelled': // Already handled
        case 'void':
             return "secondary"; // Gray
        case 'sent': // Invoice status
            return "default"; // Blue
        
        // Expense Statuses
        // case 'pending': // Already handled
        // case 'approved': // Already handled
        // case 'paid': // Already handled
        // case 'rejected': // Already handled

        // Staff Status
        case 'active':
            return "outline"; // Green
        case 'inactive':
            return "secondary"; // Gray

        default:
            return "secondary"; // Default fallback
  }
}