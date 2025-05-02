import React, { useState } from 'react';
import { format, isToday, isAfter, parseISO } from 'date-fns';
import { CalendarDays, MapPin, User, Users, Banknote, CreditCard, ArrowLeft, Download as DownloadIcon, CheckSquare, XSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Lightbox Imports
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Download from "yet-another-react-lightbox/plugins/download";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import "yet-another-react-lightbox/plugins/thumbnails.css";

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

import type { Booking } from '../types';
import { useAuth } from '@/app/AuthProvider';
import { useUpdateBooking } from '../hooks/useBookings';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

// Custom Download Function
const handleDownload = async (url: string, filename: string) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the blob URL
    URL.revokeObjectURL(blobUrl);
  } catch (error: any) {
    console.error("Download failed:", error);
    toast.error("Download failed", { description: error.message });
  }
};

interface BookingDetailProps {
  booking: Booking;
}

export const BookingDetail: React.FC<BookingDetailProps> = ({ booking }) => {
  const navigate = useNavigate();
  const { permissions } = useAuth();
  const updateBookingMutation = useUpdateBooking();
  const [openLightbox, setOpenLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Helper to format currency
  const formatCurrency = (amount: number | null, currency: string | null) => {
    if (amount === null) return '--';
    
    const currencySymbol = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'NGN': '₦',
      'CAD': 'C$',
      'AUD': 'A$',
    }[currency || 'USD'] || '';

    return `${currencySymbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Helper to get status badge variant
  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'partially_paid':
        return 'secondary';
      case 'pending':
        return 'outline';
      case 'refunded':
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Helper to get status badge variant (booking status)
  const getBookingStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'confirmed':
        return 'default';
      case 'pending':
        return 'outline';
      case 'completed':
        return 'secondary';
      case 'cancelled':
      case 'no-show':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Prepare slides for the lightbox
  const slides = booking.images?.map((image, index) => ({
      src: image.image_url,
      download: `booking_${booking.booking_number}_${index + 1}.png`
  })) || [];

  // Handler for updating booking status
  const handleUpdateStatus = (newStatus: 'completed' | 'no-show') => {
    if (!permissions?.edit_bookings) {
      toast.error('You do not have permission to update booking status.');
      return;
    }
    updateBookingMutation.mutate(
      { id: booking.id, booking_status: newStatus },
      {
        onSuccess: () => {
          toast.success(`Booking marked as ${newStatus.replace('-', ' ')}.`);
          // Optionally refetch data or rely on cache invalidation from hook
        },
        onError: (error) => {
          toast.error(`Failed to update status: ${error.message}`);
        },
      }
    );
  };

  // Check if the checkout date is today or in the past
  const canUpdateCompletionStatus = 
    booking.checkout_datetime && 
    (isToday(parseISO(booking.checkout_datetime)) || isAfter(new Date(), parseISO(booking.checkout_datetime)));

  return (
    <div className="space-y-4">
      {/* Back Button */}
      <Button variant="outline" size="sm" onClick={() => navigate('/bookings')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Bookings
      </Button>
      
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-bold">Booking #{booking.booking_number}</CardTitle>
              <CardDescription>
                Created on {format(new Date(booking.created_at), 'MMM d, yyyy')}
              </CardDescription>
            </div>
            <div className="flex flex-col items-end space-y-1 text-right">
              <div className="flex items-center gap-1.5">
                 <span className="text-xs text-muted-foreground">Booking Status:</span>
                 <Badge variant={getBookingStatusVariant(booking.booking_status || 'pending')} className="capitalize text-xs px-1.5 py-0.5">
                   {booking.booking_status?.replace('_', ' ') || 'Pending'}
                 </Badge>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Payment Status:</span>
                <Badge variant={getStatusVariant(booking.payment_status)} className="capitalize text-xs px-1.5 py-0.5">
                 {booking.payment_status.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Guest Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Guest Information</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{booking.guest_name}</span>
                </div>
                {booking.guest_email && (
                  <div className="flex items-center gap-2">
                    <span className="h-4 w-4" />
                    <span>{booking.guest_email}</span>
                  </div>
                )}
                {booking.guest_phone && (
                  <div className="flex items-center gap-2">
                    <span className="h-4 w-4" />
                    <span>{booking.guest_phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{booking.number_of_guests} guest{booking.number_of_guests !== 1 ? 's' : ''}</span>
                </div>
                {booking.platform && (
                  <div className="flex items-center gap-2">
                    <span className="h-4 w-4" />
                    <span>Booked via {booking.platform}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Property Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Property</h3>
              {booking.property ? (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{booking.property.name}</span>
                </div>
              ) : (
                <div className="text-muted-foreground">No property assigned</div>
              )}
            </div>

            {/* Stay Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Stay Details</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div><span className="font-medium">Check-in:</span> {format(new Date(booking.checkin_datetime), 'EEEE, MMM d, yyyy')}</div>
                    <div><span className="font-medium">Check-out:</span> {format(new Date(booking.checkout_datetime), 'EEEE, MMM d, yyyy')}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Payment Details</h3>
              <div className="space-y-2">
                {booking.amount !== null && (
                  <div className="flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-muted-foreground" />
                    <span><span className="font-medium">Amount:</span> {formatCurrency(booking.amount, booking.currency)}</span>
                  </div>
                )}
                {booking.payment_method && (
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span><span className="font-medium">Method:</span> {booking.payment_method.replace('_', ' ')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          {booking.notes && (
            <>
              <Separator className="my-6" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Notes</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{booking.notes}</p>
              </div>
            </>
          )}

          {/* Booking Images - Modified for Click */}
          {slides.length > 0 && (
            <>
              <Separator className="my-6" />
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Images</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {slides.map((slide, i) => (
                    // Wrap in a button or div with onClick
                    <button 
                      key={slide.src} 
                      className="aspect-square rounded-md overflow-hidden focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer" 
                      onClick={() => {
                        setLightboxIndex(i);
                        setOpenLightbox(true);
                      }}
                      aria-label={`View image ${i + 1}`}
                    >
                      <img 
                        src={slide.src} 
                        alt={`Booking image ${i + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons for Completion/No-Show - MOVED & CONDITION UPDATED */}
      {permissions?.edit_bookings && 
       (booking.booking_status === 'confirmed') && 
       canUpdateCompletionStatus && (
        <Card>
          <CardHeader>
            <CardTitle>Finalize Booking Status</CardTitle>
            <CardDescription>Mark the booking as completed or no-show now that the checkout date has passed.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4">
            {/* Mark Completed Button */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="secondary" disabled={updateBookingMutation.isPending}>
                  <CheckSquare className="mr-2 h-4 w-4"/> Mark as Completed
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Completion</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to mark this booking as 'Completed'?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleUpdateStatus('completed')}>Confirm</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Mark No-Show Button */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={updateBookingMutation.isPending}>
                  <XSquare className="mr-2 h-4 w-4"/> Mark as No-Show
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm No-Show</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to mark this booking as 'No-Show'?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleUpdateStatus('no-show')} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Confirm No-Show</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}

      {/* Render the Lightbox component with custom download button */}
      <Lightbox
        open={openLightbox}
        close={() => setOpenLightbox(false)}
        slides={slides}
        index={lightboxIndex}
        plugins={[Download, Thumbnails]} 
        // Custom Render Function for Download Button - Adjusted Signature
        render={{
          buttonDownload: () => { // Remove the destructured { C } parameter
            const currentSlide = slides[lightboxIndex];
            if (!currentSlide) return null;

            return (
              <button
                type="button"
                className="yarl__button" // Standard class from the library
                onClick={() => handleDownload(currentSlide.src, currentSlide.download || 'download.png')}
                aria-label="Download image"
              >
                 <DownloadIcon className="yarl__icon" /> {/* Use library class for icon? */}
              </button>
            );
          },
        }}
      />
    </div>
  );
}; 