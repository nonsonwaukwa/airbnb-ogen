import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import {
  AlertCircle,
  Send,
  Loader2,
  Trash2,
  Pencil,
  XCircle,
  ShoppingCart,
  ArchiveRestore, // Assuming ArchiveRestore is used for Cancelled? Might want PackageX
  PackageCheck,
  PackageX, // Use this for Cancelled
  CheckCircle,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  useGetProcurementOrder,
  useSendForApproval,
  useApproveOrder,
  useRejectOrder,
  useDeleteOrder,
  useUpdateOrderStatus,
  ProcurementOrder,
  ProcurementLineItem, // Use the base type, details are nested
} from '../hooks/useProcurement';
import { useAuth } from '@/app/AuthProvider';
import { EditProcurementOrderDialog } from '../components/EditProcurementOrderDialog';
import { ReceiveOrderDialog } from '../components/ReceiveOrderDialog';
import { formatCurrency } from '@/lib/utils';

// Define the type for the data returned by useGetProcurementOrder
interface ProcurementOrderViewData {
    order: ProcurementOrder & {
        supplier: { name: string } | null;
        property: { name: string } | null;
        ordered_by: { full_name: string } | null;
        approved_by: { full_name: string } | null;
    };
    lineItems: ProcurementLineItem[]; // Use ProcurementLineItem
}

const getStatusBadgeVariant = (status: string): "default" | "destructive" | "outline" | "secondary" => {
  switch (status) {
    case 'Draft':
      return 'secondary';
    case 'Pending Approval':
      return 'outline';
    case 'Approved':
    case 'Ordered': // Group similar visual styles
    case 'Received':
      return 'default'; // Use default (likely primary color) for positive/complete statuses
    case 'Partially Received':
      return 'outline'; // Keep outline for in-progress
    case 'Cancelled':
    case 'Rejected':
      return 'destructive';
    default:
      return 'secondary';
  }
};

// Define the expected type for the order prop in EditProcurementOrderDialog
type OrderForEditDialog = {
    id: string;
    supplier_id: string;
    property_id: string;
    expected_delivery_date: string;
    notes?: string;
    line_items: Array<{ // This needs to exactly match EditProcurementOrderDialog's expectation
        id: string; // Ensure ID is always string
        item_id: string;
        quantity_ordered: number;
        unit_price?: number;
        currency?: string;
    }>;
};

export default function ProcurementViewPage() {
  const { id } = useParams<{ id: string }>();
  const { hasPermission } = useAuth();
  const { data, isLoading, error } = useGetProcurementOrder(id as string);
  const sendForApproval = useSendForApproval();
  const approveOrder = useApproveOrder();
  const rejectOrder = useRejectOrder();
  const deleteOrder = useDeleteOrder();
  const updateStatus = useUpdateOrderStatus();
  const navigate = useNavigate();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isReceiveDialogOpen, setReceiveDialogOpen] = useState(false);

  // --- Permission Checks ---
  // Use optional chaining and default to false if permissions object is loading/undefined
  const canView = hasPermission('view_procurement') ?? false;
  const canAdd = hasPermission('add_procurement') ?? false;
  const canEdit = hasPermission('edit_procurement') ?? false;
  const canDelete = hasPermission('delete_procurement') ?? false;
  const canApprove = hasPermission('approve_procurement') ?? false;

  // Derived permissions based on status
  const orderStatus = data?.order?.status;
  const canEditDraft = canAdd && orderStatus === 'Draft';
  const canDeleteDraft = canAdd && orderStatus === 'Draft';
  // User needs add or edit permission to send for approval (based on trigger logic)
  const canSendDraftForApproval = canAdd && orderStatus === 'Draft';
  const canApproveOrRejectPending = canApprove && orderStatus === 'Pending Approval';
  const canUpdateApproved = canEdit && orderStatus === 'Approved';
  const canUpdateOrdered = canEdit && orderStatus === 'Ordered';
  const canUpdatePartiallyReceived = canEdit && orderStatus === 'Partially Received';
  const canCancelApproved = canEdit && orderStatus === 'Approved';
  const canCancelOrdered = canEdit && orderStatus === 'Ordered';
  const canCancelPartiallyReceived = canEdit && orderStatus === 'Partially Received';

  if (!canView && !isLoading) { // Check permission only after loading state is resolved
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Alert variant="destructive" className="w-full max-w-md">
           <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don't have permission to view procurement orders.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container py-6 space-y-6">
        <Skeleton className="h-8 w-1/2 mb-4" />
        <div className="grid grid-cols-3 gap-6">
             <Skeleton className="h-10 w-full" />
             <Skeleton className="h-10 w-full" />
             <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-20 w-full" /> {/* For notes */}
        <Skeleton className="h-8 w-1/4 mb-2" /> {/* For Line items title */}
        <Skeleton className="h-[200px] w-full" /> {/* For table */}
         <div className="flex justify-end gap-3">
             <Skeleton className="h-10 w-24" />
             <Skeleton className="h-10 w-24" />
         </div>
      </div>
    );
  }

  // Handle order not found or fetch error after loading
  if (error || !data?.order) {
    return (
      <div className="container py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error?.message || 'Procurement order not found.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { order, lineItems } = data; // Destructure after ensuring data exists

  // --- Action Handlers ---
  const handleSendForApproval = async () => {
    if (!order) return;
    await sendForApproval.mutateAsync(order.id);
  };

  const handleApprove = async () => {
    if (!order) return;
    await approveOrder.mutateAsync(order.id);
  };

  const handleReject = async () => {
    if (!order) return;
    // Consider adding a confirmation dialog or reason input here
    await rejectOrder.mutateAsync(order.id);
  };

  const handleDelete = () => {
    if (!order || order.status !== 'Draft') return; // Extra safety check
    if (window.confirm('Are you sure you want to delete this draft order? This action cannot be undone.')) {
      deleteOrder.mutate(order.id, {
        onSuccess: () => navigate('/procurement', { replace: true }), // Navigate back on success
        // onError handled by the hook
      });
    }
  };

  const handleUpdateStatus = async (status: ProcurementOrder['status']) => {
    if (!order) return;
    await updateStatus.mutateAsync({ id: order.id, status });
  };

  // Prepare data for dialogs safely
  // Check if required fields for editing exist AND lineItems is not null
  const canPrepareEditData = 
      order.status === 'Draft' && 
      order.supplier_id !== null && 
      order.property_id !== null && 
      order.expected_delivery_date !== null &&
      lineItems !== null; // Ensure lineItems array exists

  const orderForEditDialog: OrderForEditDialog | null = canPrepareEditData
      ? {
          id: order.id,
          supplier_id: order.supplier_id as string, // Cast non-null confirmed values
          property_id: order.property_id as string,
          expected_delivery_date: order.expected_delivery_date as string,
          notes: order.notes ?? undefined,
          // Filter line items to ensure `id` is present and map
          line_items: (lineItems || []) 
            .filter(item => item.id !== undefined) // Ensure item.id is defined
            .map(item => ({
              id: item.id as string, // Cast id to string after filtering
              item_id: item.item_id,
              quantity_ordered: item.quantity_ordered,
              unit_price: item.unit_price ?? undefined,
              currency: item.currency ?? undefined,
            })),
        }
      : null;

   // Prepare data for ReceiveOrderDialog, ensuring lineItems is always an array
   const orderForReceiveDialog = { ...order, lineItems: lineItems || [] };


  return (
    <div className="container py-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">
            Procurement Order #{order.order_number}
          </h1>
          <div className="space-y-1 text-sm text-muted-foreground mb-4">
            <p>Created on: {format(new Date(order.created_at), 'PPP')}</p> {/* More readable date */}
            <p>Created by: {order.ordered_by?.full_name ?? 'System'}</p>
            {order.approved_by_user_id && order.approved_by && (
              <p>
                {order.status === 'Rejected' ? 'Rejected' : 'Approved'} by: {order.approved_by.full_name}
                {/* Assuming approved_at exists and is timestamp */}
                {/* {order.approved_at && ( <> on {format(new Date(order.approved_at), 'PPP')}</> )} */}
              </p>
            )}
          </div>
           {/* Edit/Delete Buttons - Only show for Draft */}
           <div className="flex items-center gap-2">
             {canEditDraft && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        if (orderForEditDialog) { 
                           setEditDialogOpen(true);
                        } else {
                            alert("Cannot edit: Missing required order details or line items.");
                        }
                    }}
                    disabled={!orderForEditDialog} 
                >
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit Draft
                </Button>
             )}
             {canDeleteDraft && (
                <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={deleteOrder.isPending}
                >
                    {deleteOrder.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                    Delete Draft
                </Button>
             )}
          </div>
        </div>
        <Badge variant={getStatusBadgeVariant(order.status)} className="text-sm px-3 py-1">
          {order.status}
        </Badge>
      </div>

      {/* Details Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border rounded-lg p-4 bg-muted/40">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">SUPPLIER</p>
          <p className="text-sm font-medium">
            {order.supplier?.name || <span className="text-muted-foreground italic">Not set</span>}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">PROPERTY</p>
          <p className="text-sm font-medium">
            {order.property?.name || <span className="text-muted-foreground italic">Not set</span>}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">EXPECTED DELIVERY</p>
          <p className="text-sm font-medium">
            {order.expected_delivery_date
              ? format(new Date(order.expected_delivery_date + 'T00:00:00'), 'PPP') // Add time to avoid timezone issues
              : <span className="text-muted-foreground italic">Not set</span>}
          </p>
        </div>
      </div>

      {/* Notes Section */}
      {order.notes && (
        <div className="space-y-2 border rounded-lg p-4">
          <h3 className="text-sm font-medium">Notes</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.notes}</p>
        </div>
      )}

      {/* Line Items Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Line Items</h3>
        <div className="border rounded-lg overflow-hidden"> {/* Added overflow-hidden */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Qty Ordered</TableHead>
                <TableHead className="text-right">Qty Received</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems && lineItems.length > 0 ? (
                 lineItems.map((item) => (
                   <TableRow key={item.id}>
                     <TableCell className="font-medium">{item.item_catalog?.name ?? 'Unknown Item'}</TableCell>
                     <TableCell className="text-right">
                       {item.quantity_ordered} {item.item_catalog?.unit_of_measure ?? ''}
                     </TableCell>
                      <TableCell className="text-right">
                       {item.quantity_received} {item.item_catalog?.unit_of_measure ?? ''}
                     </TableCell>
                     <TableCell className="text-right">
                       {formatCurrency(item.unit_price, item.currency)}
                     </TableCell>
                     <TableCell className="text-right font-medium">
                       {formatCurrency((item.unit_price ?? 0) * item.quantity_ordered, item.currency)}
                     </TableCell>
                   </TableRow>
                 ))
              ) : (
                 <TableRow>
                   <TableCell colSpan={5} className="h-24 text-center">
                     No line items added yet.
                   </TableCell>
                 </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Action Buttons Section */}
      <div className="flex justify-end gap-3 flex-wrap pt-4 border-t">
        {/* Send for Approval */}
        {order.status === 'Draft' && canSendDraftForApproval && (
          <Button
            onClick={handleSendForApproval}
            disabled={sendForApproval.isPending}
            size="sm"
          >
            {sendForApproval.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Send for Approval
          </Button>
        )}

        {/* Approve / Reject */}
        {order.status === 'Pending Approval' && canApproveOrRejectPending && (
          <>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectOrder.isPending}
              size="sm"
            >
              {rejectOrder.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
              Reject
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approveOrder.isPending}
              size="sm"
            >
               {approveOrder.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Approve
            </Button>
          </>
        )}

        {/* Mark as Ordered */}
        {order.status === 'Approved' && canUpdateApproved && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleUpdateStatus('Ordered')}
            disabled={updateStatus.isPending && updateStatus.variables?.status === 'Ordered'}
          >
            {(updateStatus.isPending && updateStatus.variables?.status === 'Ordered') ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShoppingCart className="w-4 h-4 mr-2" />}
            Mark as Ordered
          </Button>
        )}

        {/* Receive Items */}
        {(order.status === 'Ordered' || order.status === 'Partially Received') && canEdit && ( // Use general edit perm for receiving
          <Button
            variant="default" // Make receive primary action
            size="sm"
            onClick={() => setReceiveDialogOpen(true)}
            // Disable if status is already changing
            disabled={updateStatus.isPending}
          >
            <PackageCheck className="w-4 h-4 mr-2" />
            Receive Items
          </Button>
        )}

        {/* Cancel Order */}
        {(order.status === 'Approved' || order.status === 'Ordered' || order.status === 'Partially Received') && canEdit && ( // Use general edit perm for cancelling
          <Button
            variant="outline" // Make cancel less prominent
            size="sm"
            onClick={() => {
                 if (window.confirm('Are you sure you want to cancel this order?')) {
                    handleUpdateStatus('Cancelled');
                 }
            }}
            disabled={updateStatus.isPending && updateStatus.variables?.status === 'Cancelled'}
          >
            {(updateStatus.isPending && updateStatus.variables?.status === 'Cancelled') ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PackageX className="w-4 h-4 mr-2" />}
            Cancel Order
          </Button>
        )}
      </div>

      {/* Edit Dialog - Conditionally render based on status and valid data */}
      {canPrepareEditData && orderForEditDialog && (
          <EditProcurementOrderDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            order={orderForEditDialog} // Pass correctly typed object
          />
      )}

      {/* Receive Dialog - Render if status allows receiving */}
      {(orderStatus === 'Ordered' || orderStatus === 'Partially Received') && (
         <ReceiveOrderDialog
            open={isReceiveDialogOpen}
            onOpenChange={setReceiveDialogOpen}
            order={orderForReceiveDialog} // Pass order with line items
         />
      )}

    </div> // This is the closing div for the main container (around line 400 originally)
  ); // This is the closing parenthesis for the component's return statement
} // This is the closing brace for the component function
