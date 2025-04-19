import { RoleListTable } from '@/features/roles/components/RoleListTable';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useAuth } from '@/app/AuthProvider';
import { AlertTriangle } from 'lucide-react';

export function RolesPage() {
  const { permissions } = useAuth();

  // Check for required permissions to view the page
  const canView = permissions['view_roles'] === true;
  const canEdit = permissions['edit_roles'] === true;

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
    <Card>
      <CardHeader>
        <CardTitle>Role Management</CardTitle>
        <CardDescription>
            Define user roles and manage their associated permissions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RoleListTable />
      </CardContent>
    </Card>
  );
} 