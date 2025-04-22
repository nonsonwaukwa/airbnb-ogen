import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel, // Keep if using filters here
    getPaginationRowModel,
    getSortedRowModel,
    SortingState,
    VisibilityState, // Keep if using column visibility here
    ColumnFiltersState, // Keep if using filters here
    useReactTable
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ChevronDown,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Booking } from '../types';
import { useAuth } from '@/app/AuthProvider';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useUpdateBooking } from '../hooks/useBookings';
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
import { toast } from 'sonner';
import { Banknote } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// --- Helper Functions (Keep these) ---
const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'N/A';
  try {
    return format(new Date(dateString), 'PP'); // Example: Sep 14, 2024
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

const formatCurrency = (amount: number | null | undefined, currency: string | null | undefined) => {
    if (amount === null || amount === undefined) return '--';
    const ccy = currency || 'NGN'; // Default currency if null
    const options: Intl.NumberFormatOptions = {
        style: 'currency',
        currency: ccy,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    };
    try {
        return amount.toLocaleString(undefined, options);
    } catch (e) {
        console.error("Currency formatting error", e);
        return `${ccy} ${amount.toFixed(2)}`; // Fallback
    }
};

const getStatusVariant = (status: string | null | undefined): "default" | "secondary" | "destructive" | "outline" => {
  switch (status?.toLowerCase()) {
    case 'paid':
    case 'confirmed':
      return 'default';
    case 'partially_paid':
    case 'pending':
      return 'secondary';
    case 'refunded':
    case 'cancelled':
      return 'destructive';
    default:
      return 'outline';
  }
};

// Helper function for Booking Status variants
const getBookingStatusVariant = (status: string | null | undefined): "default" | "secondary" | "destructive" | "outline" => {
  switch (status?.toLowerCase()) {
    case 'confirmed':
      return 'default'; // Or maybe a success color if defined
    case 'pending':
      return 'secondary';
    case 'completed':
      return 'secondary'; // Using secondary again, adjust if needed
    case 'cancelled':
    case 'no-show':
      return 'destructive';
    default:
      return 'outline';
  }
};

// --- Constants for Status Filters ---
const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed', 'no-show'];
const PAYMENT_STATUSES = ['pending', 'paid', 'partially_paid', 'refunded', 'cancelled'];

// --- Column Definition Function ---
export const bookingColumns = (
  permissions: Record<string, boolean>,
  onEdit: (bookingId: string) => void,
  onDelete: (bookingId: string) => void,
  navigate: ReturnType<typeof useNavigate>,
  updateBookingMutation: ReturnType<typeof useUpdateBooking>,
): ColumnDef<Booking>[] => [
  // Select column
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'booking_number',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Booking #
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="lowercase">{row.getValue('booking_number') || 'N/A'}</div>,
  },
  {
    accessorKey: 'guest_name',
    header: 'Guest Name',
    cell: ({ row }) => <div>{row.getValue('guest_name')}</div>,
  },
  {
    accessorFn: (row) => row.property?.name,
    id: 'propertyName',
    header: 'Property',
    cell: ({ row }) => <div>{row.original.property?.name || 'N/A'}</div>,
  },
  {
    accessorKey: 'checkin_datetime',
    header: 'Check-in',
    cell: ({ row }) => <div>{formatDate(row.getValue('checkin_datetime'))}</div>,
  },
  {
    accessorKey: 'checkout_datetime',
    header: 'Check-out',
    cell: ({ row }) => <div>{formatDate(row.getValue('checkout_datetime'))}</div>,
  },
   {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => <div>{formatCurrency(row.getValue('amount'), row.original.currency)}</div>,
  },
  {
    accessorKey: 'payment_status',
    header: 'Payment Status',
    cell: ({ row }) => <Badge variant={getStatusVariant(row.getValue('payment_status'))} className="capitalize">{row.getValue('payment_status') || 'N/A'}</Badge>,
  },
  {
    accessorKey: 'booking_status',
    header: 'Booking Status',
    cell: ({ row }) => <Badge variant={getBookingStatusVariant(row.getValue('booking_status'))} className="capitalize">{row.getValue('booking_status') || 'N/A'}</Badge>,
  },
  // Actions Column
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => {
      const booking = row.original;

      // Handler for marking as paid
      const handleMarkAsPaid = () => {
        updateBookingMutation.mutate(
          { id: booking.id, payment_status: 'paid' },
          {
            onSuccess: () => {
              toast.success(`Booking #${booking.booking_number} marked as paid.`);
              // Invalidation happens within the hook, no need to call here
            },
            onError: (error) => {
              toast.error(`Failed to mark as paid: ${error.message}`);
            },
          }
        );
      };

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {permissions.view_bookings && (
                <DropdownMenuItem onClick={() => navigate(`/bookings/${booking.id}`)}>
                  <Eye className="mr-2 h-4 w-4" /> View Details
                </DropdownMenuItem>
            )}
             {permissions.edit_bookings && (
                <DropdownMenuItem onClick={() => onEdit(booking.id)} disabled={booking.booking_status === 'cancelled' || booking.booking_status === 'no-show' || booking.booking_status === 'completed'}>
                   <Edit className="mr-2 h-4 w-4" /> Edit Booking
                </DropdownMenuItem>
            )}

            {/* Mark as Paid Action */}
            {permissions.edit_bookings && booking.payment_status === 'pending' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} disabled={updateBookingMutation.isPending}>
                          <Banknote className="mr-2 h-4 w-4" /> Mark as Paid
                      </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                      <AlertDialogHeader>
                      <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
                      <AlertDialogDescription>
                          Are you sure you want to mark booking #{booking.booking_number} as 'Paid'?
                          This action may automatically confirm the booking.
                      </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleMarkAsPaid}>Confirm Paid</AlertDialogAction>
                      </AlertDialogFooter>
                  </AlertDialogContent>
                 </AlertDialog>
            )}

            {/* Separator only needed if delete/cancel is possible */}
            {(permissions.delete_bookings && !['cancelled', 'no-show', 'completed'].includes(booking.booking_status)) && (
                <DropdownMenuSeparator />
            )}

            {permissions.delete_bookings && !['cancelled', 'no-show', 'completed'].includes(booking.booking_status) && (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                 onClick={() => onDelete(booking.id)}
              >
                 <Trash2 className="mr-2 h-4 w-4" /> Cancel Booking
              </DropdownMenuItem>
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
    isLoading: boolean; // <--- ADD THIS LINE
    onView: (id: string) => void;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
  }

// --- Main Table Component ---
export function BookingListTable({ bookings, onEdit, onDelete }: BookingListTableProps) {
  const navigate = useNavigate();
  const { permissions } = useAuth();
  const updateBookingMutation = useUpdateBooking();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<any[]>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  // Memoize columns
  const columns = useMemo(
      () => bookingColumns(permissions, onEdit, onDelete, navigate, updateBookingMutation),
      [permissions, onEdit, onDelete, navigate, updateBookingMutation]
  );

  // Ensure data passed to useReactTable is always an array
  const tableData = useMemo(() => bookings ?? [], [bookings]);

  const table = useReactTable({
    data: tableData, // <-- Use the guaranteed array
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    initialState: {
        pagination: {
            pageSize: 10,
        },
    }
  });

  // Removed loading/error handling - parent component (BookingList) handles this

  return (
    <div className="w-full">
      {/* Filtering & Column Visibility */}
      <div className="flex flex-wrap items-center gap-4 py-4">
        <Input
          placeholder="Filter by guest name..."
          value={(table.getColumn('guest_name')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('guest_name')?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        {/* Payment Status Filter */}
        <Select
          value={(table.getColumn('payment_status')?.getFilterValue() as string) ?? ''}
          onValueChange={(value) =>
            table.getColumn('payment_status')?.setFilterValue(value === 'all' ? '' : value)
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Payment Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payment Statuses</SelectItem>
            {PAYMENT_STATUSES.map((status) => (
              <SelectItem key={status} value={status} className="capitalize">
                {status.replace('_',' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Booking Status Filter */}
        <Select
          value={(table.getColumn('booking_status')?.getFilterValue() as string) ?? ''}
          onValueChange={(value) =>
             table.getColumn('booking_status')?.setFilterValue(value === 'all' ? '' : value)
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Booking Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Booking Statuses</SelectItem>
            {BOOKING_STATUSES.map((status) => (
              <SelectItem key={status} value={status} className="capitalize">
                {status.replace('_',' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                const columnLabel = column.id.replace(/_/g, ' ');
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {columnLabel}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.original.id} // Use booking ID as key
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
