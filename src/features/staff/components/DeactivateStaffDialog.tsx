import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Trash2 } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'; // Use AlertDialog for destructive actions
import { Button } from '@/components/ui/button';
import { useDeactivateStaff } from '@/features/staff/hooks/useStaff';
import { StaffMember } from '@/features/staff/types';

interface DeactivateStaffDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  staffMember: StaffMember | null;
}

export function DeactivateStaffDialog({ isOpen, setIsOpen, staffMember }: DeactivateStaffDialogProps) {
  const deactivateMutation = useDeactivateStaff();

  const handleDeactivate = async () => {
    if (!staffMember) return;

    try {
      await deactivateMutation.mutateAsync({ id: staffMember.id, status: 'inactive' });
      toast.success(`Staff member "${staffMember.full_name}" deactivated successfully.`);
      setIsOpen(false);
    } catch (error: any) {
      console.error("Deactivation error:", error);
      toast.error(error.message || 'Failed to deactivate staff member.');
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deactivate Staff Member?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to deactivate{' '}
            <span className="font-semibold">{staffMember?.full_name || 'this staff member'}</span>?
            Their status will be set to 'Inactive', but their record will remain.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deactivateMutation.isPending}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive" // Use destructive variant for the action button
            onClick={handleDeactivate}
            disabled={deactivateMutation.isPending}
          >
            {deactivateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Deactivate
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
