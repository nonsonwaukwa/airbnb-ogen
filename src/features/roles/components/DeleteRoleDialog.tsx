import { toast } from 'sonner';
import { Loader2, Trash2 } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useDeleteRole } from '@/features/roles/hooks/useRoles';
import type { Role } from '@/features/roles/types';

interface DeleteRoleDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  role: Role | null;
}

export function DeleteRoleDialog({ isOpen, setIsOpen, role }: DeleteRoleDialogProps) {
  const deleteMutation = useDeleteRole();

  // Prevent deleting core roles (adjust names if needed)
  const isProtectedRole = role?.name === 'SuperAdmin' || role?.name === 'Basic Staff';

  const handleDelete = async () => {
    if (!role || isProtectedRole) return;

    try {
      await deleteMutation.mutateAsync({ id: role.id });
      toast.success(`Role "${role.name}" deleted successfully.`);
      setIsOpen(false);
    } catch (error: any) {
      console.error("Delete role error:", error);
      toast.error(error.message || 'Failed to delete role.');
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Role?</AlertDialogTitle>
          <AlertDialogDescription>
            {isProtectedRole ? (
                `The role "${role?.name}" is protected and cannot be deleted.`
            ) : (
                <>
                    Are you sure you want to delete the role "{' '}
                    <span className="font-semibold">{role?.name || 'this role'}</span>"?
                    This action cannot be undone. Any users assigned this role will need to be reassigned.
                </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending || isProtectedRole} // Disable if pending or protected
          >
            {deleteMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Delete Role
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 