import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus } from 'lucide-react';
import { useGetProcurementOrders } from '../hooks/useProcurement';
import { CreateProcurementOrderDialog } from '../components/CreateProcurementOrderDialog';
import { useAuth } from '@/app/AuthProvider';
import type { AuthContextType } from '@/types/auth';

const getStatusBadgeVariant = (status: string): "default" | "destructive" | "outline" | "secondary" => {
  switch (status) {
    case 'Draft':
      return 'secondary';
    case 'Pending Approval':
      return 'outline';
    case 'Approved':
      return 'default';
    case 'Ordered':
      return 'default';
    case 'Partially Received':
      return 'outline';
    case 'Received':
      return 'default';
    case 'Cancelled':
      return 'destructive';
    case 'Rejected':
      return 'destructive';
    default:
      return 'secondary';
  }
};

export default function ProcurementPage() {
  const { hasPermission } = useAuth();
  const { data: orders, isLoading } = useGetProcurementOrders();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  if (!hasPermission('view_procurement')) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">
            You don't have permission to view procurement orders.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Procurement Orders</h1>
        {hasPermission('add_procurement') && (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Order
          </Button>
        )}
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Expected Delivery</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-[100px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : orders?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center h-24">
                  No procurement orders found
                </TableCell>
              </TableRow>
            ) : (
              orders?.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    {order.order_number}
                  </TableCell>
                  <TableCell>
                    {format(new Date(order.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>{order.supplier?.name || '-'}</TableCell>
                  <TableCell>{order.property?.name || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(order.status)}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{order.ordered_by?.full_name}</TableCell>
                  <TableCell>
                    {order.expected_delivery_date
                      ? format(new Date(order.expected_delivery_date), 'MMM d, yyyy')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="link"
                      asChild
                    >
                      <Link to={`/procurement/${order.id}`}>
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CreateProcurementOrderDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
} 
 
 