import React, { useState } from 'react';
import { useAuth } from '@/app/AuthProvider';
// import { BookingListTable } from '../components/BookingListTable'; // Remove this
import { BookingList } from '../components/BookingList'; // Import BookingList
import { BookingForm } from '../components/BookingForm';
import AccessDenied from '@/components/AccessDenied';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PlusCircle } from 'lucide-react';

export function BookingListPage() {
    const { permissions } = useAuth();
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    // TODO: Add state for editing if needed
    // const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

    // 3.2.5 Permissions Check: Check if user has permission to view bookings
    if (!permissions.view_bookings) {
        return <AccessDenied />;
    }

    return (
        <div className="container mx-auto py-6">
             <div className="flex justify-between items-center mb-4">
                 <h1 className="text-2xl font-semibold">Bookings</h1>
                 {/* Add New Booking Button + Dialog Trigger */}
                 {permissions.add_bookings && (
                     <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                         <DialogTrigger asChild>
                             <Button>
                                 <PlusCircle className="mr-2 h-4 w-4" /> Add New Booking
                             </Button>
                         </DialogTrigger>
                         <DialogContent className="sm:max-w-3xl lg:max-w-5xl max-h-[85vh] overflow-y-auto">
                             <DialogHeader>
                                 <DialogTitle>Create New Booking</DialogTitle>
                                 <DialogDescription> Add new booking details below. Click save when you're done.</DialogDescription>
                             </DialogHeader>
                             <BookingForm
                                 onSuccess={() => {
                                    console.log('Booking created successfully!');
                                    setIsCreateDialogOpen(false); // Close dialog on success
                                    // Optionally add toast feedback here if not handled by hook
                                 }}
                                 onCancel={() => setIsCreateDialogOpen(false)} // Close dialog on cancel
                             />
                         </DialogContent>
                     </Dialog>
                 )}
             </div>

            {/* TODO: Add Edit Dialog similar to Create Dialog if handling edits here */}

            <BookingList />
        </div>
    );
}

// Create a simple AccessDenied component if it doesn't exist
// Example: src/components/AccessDenied.tsx
/*
import React from 'react';

const AccessDenied = () => {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center p-8 border rounded-lg shadow-md bg-card text-card-foreground">
        <h2 className="text-xl font-semibold text-destructive mb-4">Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    </div>
  );
};

export default AccessDenied;
*/ 