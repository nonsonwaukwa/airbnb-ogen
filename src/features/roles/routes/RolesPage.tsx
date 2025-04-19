import React, { useState } from 'react'; // Import useState
import { RoleListTable } from '@/features/roles/components/RoleListTable';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button'; // Import Button
import { RoleForm } from '@/features/roles/components/RoleForm'; // Import RoleForm
import { DeleteRoleDialog } from '@/features/roles/components/DeleteRoleDialog'; // Import DeleteRoleDialog
import { Role } from '@/features/roles/types'; // Import Role type
import { useAuth } from '@/app/AuthProvider';
import { AlertTriangle, PlusCircle } from 'lucide-react'; // Import Icon

export function RolesPage() {
  const { permissions } = useAuth();

  // Check for required permissions to view the page
  const canView = permissions['view_roles'] === true;
  const canEdit = permissions['edit_roles'] === true; // Used for Add/Edit/Delete button visibility

  // --- State Lifted Up from RoleListTable ---
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  // --- End Lifted State ---

  // --- Handlers Lifted Up ---
  const handleAddNew = () => {
    setSelectedRole(null); // Ensure no role is selected for "Add" mode
    setIsFormOpen(true);
  };

  const handleEditClick = (role: Role) => {
    setSelectedRole(role);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (role: Role) => {
    setRoleToDelete(role);
    setIsDeleteDialogOpen(true);
  };
  // --- End Lifted Handlers ---

  if (!canView && !canEdit) {
    // Optionally show an access denied message or redirect
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-yellow-500 bg-yellow-50 p-8 text-center text-yellow-700 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-400">
        <AlertTriangle className="mb-4 h-12 w-12" />
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p>You do not have permission to view or manage roles.</p>
      </div>
    );
  }

  return (
    // Using React.Fragment as Card and Dialogs are siblings now
    <>
      <Card>
        {/* Updated CardHeader: Added flex classes */}
        <CardHeader className="flex flex-row items-center justify-between pb-6">
          {/* Container for Title and Description */}
          <div>
            <CardTitle className="text-3xl font-bold">Role Management</CardTitle>
            <CardDescription className="text-base mt-2">
                Define user roles and manage their associated permissions.
            </CardDescription>
          </div>
          {/* Add Role Button Moved Here - visibility controlled by 'edit_roles' */}
          {canEdit && (
            <Button onClick={handleAddNew}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Role
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {/* Pass down the handlers to trigger state changes in this component */}
          <RoleListTable
            openEditDialog={handleEditClick}
            openDeleteDialog={handleDeleteClick}
          />
        </CardContent>
      </Card>

      {/* Render Dialogs Here - Controlled by state in this component */}
      <RoleForm
          isOpen={isFormOpen}
          setIsOpen={setIsFormOpen}
          role={selectedRole} // Pass null for create, role data for edit
      />

      <DeleteRoleDialog
          isOpen={isDeleteDialogOpen}
          setIsOpen={setIsDeleteDialogOpen}
          role={roleToDelete}
      />
    </>
  );
}
