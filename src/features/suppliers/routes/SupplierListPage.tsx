import { SupplierListTable } from '@/features/suppliers/components/SupplierListTable';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useAuth } from '@/app/AuthProvider';
import { AlertTriangle } from 'lucide-react';

export function SupplierListPage() {
  const { permissions } = useAuth();

  // Check for required permission to view the page
  const canView = permissions.view_suppliers === true;

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-yellow-500 bg-yellow-50 p-8 text-center text-yellow-700 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-400">
        <AlertTriangle className="mb-4 h-12 w-12" />
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p>You do not have permission to view suppliers.</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-3xl font-bold">Suppliers</CardTitle>
        <CardDescription className="text-base mt-2">
            Manage your list of suppliers and vendors.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SupplierListTable />
      </CardContent>
    </Card>
  );
} 