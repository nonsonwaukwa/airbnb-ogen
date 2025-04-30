import { useAuth } from '@/app/AuthProvider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { InventoryStatusTable } from '../components/InventoryStatusTable';
import { StockAdjustmentForm } from '../components/StockAdjustmentForm';

export function InventoryPage() {
  const { permissions, loading: authLoading } = useAuth();

  if (!authLoading && !permissions?.view_inventory) {
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to view inventory.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Inventory Status</h2>
          <p className="text-muted-foreground">View and manage your inventory levels across all properties.</p>
        </div>
        {permissions?.view_catalog && (
          <Button variant="outline" asChild>
            <Link to="/inventory/catalog">Manage Catalog</Link>
          </Button>
        )}
      </div>

      <div className="grid gap-8 md:grid-cols-[1fr_300px]">
        <InventoryStatusTable />
        {permissions?.manage_stock && (
          <div className="space-y-4">
            <h3 className="font-semibold">Stock Adjustment</h3>
            <StockAdjustmentForm />
          </div>
        )}
      </div>
    </div>
  );
} 
 
 