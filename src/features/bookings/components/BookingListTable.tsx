import { useState, useMemo } from 'react';
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    SortingState,
    VisibilityState,
    useReactTable
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  XCircle, // For Cancel Icon
  Banknote, // For Mark Paid Icon
  CheckCheck, // For Completed
  UserX, // For No Show
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  // DropdownMenuSub, // Removing sub-menu
  // DropdownMenuSubContent, // Removing sub-menu
  // DropdownMenuSubTrigger, // Removing sub-menu
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Booking, BookingStatus } from '../types'; // Ensure BookingStatus is imported
import { useAuth } from '@/app/AuthProvider';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
// Import necessary hooks if actions are triggered directly here
// import { useUpdateBookingStatus, useCancelBookingRPC, useDeleteBooking, useMarkBookingPaid } from '../hooks/useBookings';

// --- Helper Functions (Keep these) ---
const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        const dateParts = dateString.split('-');
        if (dateParts.length === 3) {
            const parsedDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
            if (!isNaN(parsedDate.getTime())) {
                 return format(parsedDate, 'PP');
            }
        }
        throw new Error('Invalid date format');
    }
    return format(date, 'PP');
  } catch (error) {
    console.error('Error formatting date:', dateString, error);
    return 'Invalid Date';
  }
};

const formatCurrency = (amount: number | null | undefined, currency: string | null | undefined) => {
    if (amount === null || amount === undefined) return '--';
    const ccy = currency || 'NGN';
    const options: Intl.NumberFormatOptions = {
        style: 'currency',
        currency: ccy,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    };
    try {
        const locale = ccy === 'NGN' ? 'en-NG' : undefined;
        return amount.toLocaleString(locale, options);
    } catch (e) {
        console.error("Currency formatting error", e);
        return `${ccy} ${amount.toFixed(2)}`;
    }
};

const getPaymentStatusVariant = (status: string | null | undefined): "default" | "secondary" | "destructive" | "outline" => {
  switch (status?.toLowerCase()) {
    case 'paid': return 'default';
    case 'pending': return 'secondary';
    case 'refunded': case 'cancelled': return 'destructive';
    default: return 'outline';
  }
};

const getBookingStatusVariant = (status: string | null | undefined): "default" | "secondary" | "destructive" | "outline" => {
  switch (status?.toLowerCase()) {
    case 'confirmed': return 'default';
    case 'pending': return 'secondary';
    case 'completed': return 'secondary';
    case 'cancelled': case 'no-show': return 'destructive';
    default: return 'outline';
  }
};

// --- Column Definition Function ---
// Added onUpdateStatus prop which should call useUpdateBookingStatus hook
export const bookingColumns = (
  permissions: Record<string, boolean>,
  onView: (bookingId: string) => void,
  onEdit: (bookingId: string) => void,
  onCancelOrDelete: (booking: Booking) => void, // Combined handler prop
  onMarkAsPaid: (booking: Booking) => void, // Handler for marking paid
  onUpdateStatus: (id: string, newStatus: BookingStatus) => void // Handler for status change
): ColumnDef<Booking>[] => [
  // Select column (optional)
   { id: 'select', header: ({ table }) => (<Checkbox checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')} onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)} aria-label="Select all"/>), cell: ({ row }) => (<Checkbox checked={row.getIsSelected()} onCheckedChange={(value) => row.toggleSelected(!!value)} aria-label="Select row"/>), enableSorting: false, enableHiding: false },
  { accessorKey: 'booking_number', header: ({ column }) => (<Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>Booking #<ArrowUpDown className="ml-2 h-4 w-4" /></Button>), cell: ({ row }) => <div className="lowercase font-medium">{row.getValue('booking_number') || 'N/A'}</div> },
  { accessorKey: 'guest_name', header: 'Guest Name', cell: ({ row }) => <div>{row.getValue('guest_name')}</div> },
  { accessorFn: (row) => row.property?.name, id: 'propertyName', header: 'Property', cell: ({ row }) => <div>{row.original.property?.name || 'N/A'}</div> },
  { accessorKey: 'checkin_datetime', header: 'Check-in', cell: ({ row }) => <div>{formatDate(row.getValue('checkin_datetime'))}</div> },
  { accessorKey: 'checkout_datetime', header: 'Check-out', cell: ({ row }) => <div>{formatDate(row.getValue('checkout_datetime'))}</div> },
  { accessorKey: 'amount', header: () => <div className="text-right">Amount</div>, cell: ({ row }) => <div className="text-right">{formatCurrency(row.getValue('amount'), row.original.currency)}</div> },
  { accessorKey: 'payment_status', header: 'Payment Status', cell: ({ row }) => <Badge variant={getPaymentStatusVariant(row.getValue('payment_status'))} className="capitalize">{row.getValue('payment_status') || 'N/A'}</Badge> },
  { accessorKey: 'booking_status', header: 'Booking Status', cell: ({ row }) => <Badge variant={getBookingStatusVariant(row.getValue('booking_status'))} className="capitalize">{row.getValue('booking_status') || 'N/A'}</Badge> },
  // Actions Column
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => {
      const booking = row.original;
      // Get specific permissions from the passed object
      const canView = permissions?.view_bookings ?? false;
      const canEdit = permissions?.edit_bookings ?? false;
      const canAdd = permissions?.add_bookings ?? false;
      const canDelete = permissions?.delete_bookings ?? false;
      const canMarkPaid = (canEdit || canAdd); // Use combined permission
      const canCancel = (canEdit || canAdd);
      const canUpdateStatus = (canEdit || canAdd); // General permission to update status

      // Determine state flags
      const isPending = booking.booking_status === 'pending' && booking.payment_status === 'pending';
      const isPaymentPending = booking.payment_status === 'pending';
      const isConfirmed = booking.booking_status === 'confirmed';
      const isCancellable = !['cancelled', 'completed', 'no-show'].includes(booking.booking_status ?? '');

      // Determine permission flags for actions
      const showEdit = (canEdit || canAdd) && isPending;
      const showDelete = canDelete && isPending;
      // Show Cancel if user has permission AND it's not pending/pending AND it's cancellable
      const showCancel = canCancel && !isPending && isCancellable;
      // Show Mark Paid if user has permission AND payment is pending AND booking is cancellable (not final)
      const showMarkPaid = canMarkPaid && isPaymentPending && isCancellable;
      // Show Completed/NoShow if user has permission AND booking is confirmed
      const showMarkCompleted = canUpdateStatus && isConfirmed;
      const showMarkNoShow = canUpdateStatus && isConfirmed;


      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* View Details */}
            {canView && (
                <DropdownMenuItem onClick={() => onView(booking.id)}>
                  <Eye className="mr-2 h-4 w-4" /> View Details
                </DropdownMenuItem>
            )}
             {/* Edit Booking (Only if Pending/Pending) */}
             {showEdit && (
                 <DropdownMenuItem onClick={() => onEdit(booking.id)}>
                   <Edit className="mr-2 h-4 w-4" /> Edit Booking
                 </DropdownMenuItem>
             )}

            {/* Mark as Paid (Only if Payment Pending and Cancellable) */}
            {showMarkPaid && (
                 <DropdownMenuItem onClick={() => onMarkAsPaid(booking)}>
                     <Banknote className="mr-2 h-4 w-4" /> Mark as Paid
                 </DropdownMenuItem>
             )}

            {/* Cancel Booking (Only if NOT Pending/Pending and Cancellable) */}
            {showCancel && (
              <DropdownMenuItem
                onClick={() => onCancelOrDelete(booking)} // Uses combined handler which calls RPC
                className={'text-orange-600 focus:text-orange-700 focus:bg-orange-50'}
              >
                <XCircle className="mr-2 h-4 w-4" /> Cancel Booking
              </DropdownMenuItem>
            )}

            {/* Mark Completed (Only if Confirmed) */}
            {showMarkCompleted && (
                 <DropdownMenuItem onClick={() => onUpdateStatus(booking.id, 'completed')}>
                     <CheckCheck className="mr-2 h-4 w-4" /> Mark Completed
                 </DropdownMenuItem>
            )}
             {/* Mark No-Show (Only if Confirmed) */}
             {showMarkNoShow && (
                 <DropdownMenuItem onClick={() => onUpdateStatus(booking.id, 'no-show')}>
                     <UserX className="mr-2 h-4 w-4" /> Mark No-Show
                 </DropdownMenuItem>
            )}

            {/* Separator if needed before Delete */}
            {(showEdit || showMarkPaid || showCancel || showMarkCompleted || showMarkNoShow) && showDelete && <DropdownMenuSeparator />}

            {/* Delete Booking (Only if Pending/Pending) */}
            {showDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()} // prevent closing dropdown
                    className="text-red-600 focus:text-red-700 focus:bg-red-50"
                    // disabled={!isPending} // Redundant check, already handled by showDelete
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Booking
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete this pending booking record.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                       className="bg-red-600 hover:bg-red-700"
                       onClick={() => onCancelOrDelete(booking)} // Use the combined handler
                    >
                      Yes, delete booking
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

// --- Props Interface for the Table Component ---
interface BookingListTableProps {
    bookings: Booking[];
    isLoading: boolean;
    onView: (id: string) => void;
    onEdit: (id: string) => void;
    onCancelOrDelete: (booking: Booking) => void; // Combined handler
    onMarkAsPaid: (booking: Booking) => void; // Handler for marking paid
    onUpdateStatus: (id: string, newStatus: BookingStatus) => void; // Handler for status change
    // Pass permissions explicitly
    canEdit: boolean;
    canDelete: boolean;
    canCancel: boolean;
    canView: boolean;
    canMarkPaid: boolean;
  }

// --- Main Table Component ---
export function BookingListTable({
    bookings,
    onView,
    onEdit,
    onCancelOrDelete,
    onMarkAsPaid, // Receive handler
    onUpdateStatus}: BookingListTableProps) {
  const { permissions } = useAuth(); // Keep permissions if needed by columns directly

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  // Memoize columns
  const columns = useMemo(
      () => bookingColumns(
          permissions ?? {}, // Pass permissions object
          onView,
          onEdit,
          onCancelOrDelete,
          onMarkAsPaid, // Pass handler
          onUpdateStatus // Pass handler
      ),
      // Update dependencies
      [permissions, onView, onEdit, onCancelOrDelete, onMarkAsPaid, onUpdateStatus]
  );

  const tableData = useMemo(() => bookings ?? [], [bookings]);

  const table = useReactTable({
    data: tableData,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
    },
    initialState: {
        pagination: {
            pageSize: 10,
        },
    }
  });

  // Loading state handled by parent

  return (
    <div className="w-full">
      {/* Remove Filtering & Column Visibility UI if handled in parent */}
      {/* <div className="flex flex-wrap items-center gap-4 py-4"> ... </div> */}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.original.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No bookings found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

       {/* Pagination */}
       <div className="flex items-center justify-end space-x-2 py-4">
         <div className="flex-1 text-sm text-muted-foreground">
           {table.getFilteredSelectedRowModel().rows.length} of{' '}
           {table.getFilteredRowModel().rows.length} row(s) selected.
         </div>
         <div className="space-x-2">
           <Button
             variant="outline"
             size="sm"
             onClick={() => table.previousPage()}
             disabled={!table.getCanPreviousPage()}
           >
             Previous
           </Button>
           <Button
             variant="outline"
             size="sm"
             onClick={() => table.nextPage()}
             disabled={!table.getCanNextPage()}
           >
             Next
           </Button>
         </div>
       </div>
    </div>
  );
}
