import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    SortingState,
    VisibilityState,
    ColumnFiltersState,
    useReactTable
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ChevronDown,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2, // Consider changing icon for Void/Cancel
  CreditCard, // For Record Payment
  FileText, // Placeholder for Download PDF
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
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
import type { InvoiceListItem } from '../types'; // Use the list item type
import { useAuth } from '@/app/AuthProvider';
import { format } from 'date-fns';
import { RecordPaymentDialog } from './RecordPaymentDialog';
import { VoidInvoiceDialog } from './VoidInvoiceDialog';
import { downloadInvoicePDF } from '../hooks/useInvoices';
import { useGetSystemSettings } from '@/features/settings/hooks/useSystemSettings';

// --- Helper Functions ---
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
    const ccy = currency || 'NGN'; // Default currency
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

// Status variant mapping (use your updated statuses)
const getInvoiceStatusVariant = (status: InvoiceListItem['status'] | null | undefined): "default" | "secondary" | "destructive" | "outline" => {
  switch (status?.toLowerCase()) {
    case 'paid':
      return 'default'; // Greenish?
    case 'sent':
    case 'partial': // Partially paid
      return 'secondary'; // Bluish/Grayish?
    case 'draft':
    case 'pending': // If using pending
      return 'outline'; // Gray outline
    case 'overdue':
    case 'void':
    case 'refunded':
      return 'destructive'; // Reddish
    default:
      return 'outline';
  }
};

// --- Column Definition Function ---
export const invoiceColumns = (
  permissions: Record<string, boolean>,
  onView: (invoiceId: string) => void,
  onEdit: (invoiceId: string) => void,
  onVoid: (invoiceId: string) => void,
  onRecordPayment: (invoiceId: string) => void,
  onDownloadPDF: (invoiceId: string) => void
): ColumnDef<InvoiceListItem>[] => [
  // Select column (optional)
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
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
    accessorKey: 'invoice_number',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Invoice #
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="font-medium">{row.getValue('invoice_number') || 'N/A'}</div>,
  },
  {
    accessorKey: 'customer_name',
    header: 'Customer',
    cell: ({ row }) => <div>{row.getValue('customer_name')}</div>,
  },
  {
    accessorKey: 'issue_date',
    header: 'Issue Date',
    cell: ({ row }) => <div>{formatDate(row.getValue('issue_date'))}</div>,
  },
   {
    accessorKey: 'due_date',
    header: 'Due Date',
    cell: ({ row }) => <div>{formatDate(row.getValue('due_date'))}</div>,
  },
  {
    accessorKey: 'total_amount',
    header: 'Total Amount',
    cell: ({ row }) => <div className="text-right">{formatCurrency(row.getValue('total_amount'), row.original.currency)}</div>,
  },
   {
    accessorKey: 'amount_paid',
    header: 'Amount Paid',
    cell: ({ row }) => <div className="text-right">{formatCurrency(row.getValue('amount_paid'), row.original.currency)}</div>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <Badge variant={getInvoiceStatusVariant(row.getValue('status'))} className="capitalize">{row.getValue('status') || 'N/A'}</Badge>,
  },
  // Actions Column
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => {
      const invoice = row.original;
      // Permission checks based on new logic
      const canEdit = permissions.edit_invoices && invoice.status !== 'paid' && invoice.status !== 'void' && invoice.status !== 'refunded';
      const canVoid = permissions.edit_invoices && invoice.status !== 'void' && invoice.status !== 'paid' && invoice.status !== 'refunded';
      // Update permission check for recording payment
      const canRecordPayment = permissions.update_invoices && invoice.status !== 'paid' && invoice.status !== 'void' && invoice.status !== 'refunded'; 

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
             {/* View action - requires view_invoices */} 
            {permissions.view_invoices && (
                <DropdownMenuItem onClick={() => onView(invoice.id)}>
                  <Eye className="mr-2 h-4 w-4" /> View Details
                </DropdownMenuItem>
            )}
             {/* Edit action - requires edit_invoices */} 
             {canEdit && (
                <DropdownMenuItem onClick={() => onEdit(invoice.id)}>
                   <Edit className="mr-2 h-4 w-4" /> Edit Invoice
                </DropdownMenuItem>
            )}
             {/* Download action - requires view_invoices */} 
            {permissions.view_invoices && (
                <DropdownMenuItem 
                    onClick={() => onDownloadPDF(invoice.id)}
                 > 
                  <FileText className="mr-2 h-4 w-4" /> Download PDF
                </DropdownMenuItem>
            )}
            
            {/* Separator only if there are actions above AND payment/void below */} 
            {(permissions.view_invoices || canEdit) && (canRecordPayment || canVoid) && <DropdownMenuSeparator />} 

             {/* Record Payment action - requires update_invoices */} 
             {canRecordPayment && (
                <DropdownMenuItem onClick={() => onRecordPayment(invoice.id)}>
                    <CreditCard className="mr-2 h-4 w-4" /> Record Payment
                </DropdownMenuItem>
             )}
             {/* Void action - requires edit_invoices */} 
            {canVoid && (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                 onClick={() => onVoid(invoice.id)}
              >
                 <Trash2 className="mr-2 h-4 w-4" /> Void Invoice 
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

// --- Props Interface ---
interface InvoiceListTableProps {
    invoices: InvoiceListItem[];
    isLoading: boolean;
    // Add handlers for actions when implemented
    // onView: (id: string) => void;
    // onEdit: (id: string) => void;
    // onRecordPayment: (id: string) => void;
    // onVoid: (id: string) => void;
}

// --- Main Table Component ---
export function InvoiceListTable({
    invoices,
    isLoading: isLoadingInvoices,
}: InvoiceListTableProps) {
  const navigate = useNavigate();
  const { permissions } = useAuth();
  const { data: systemSettings, isLoading: isLoadingSettings } = useGetSystemSettings();

  // --- State for Dialogs ---
  const [isRecordPaymentDialogOpen, setIsRecordPaymentDialogOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<InvoiceListItem | null>(null);
  const [isVoidDialogOpen, setIsVoidDialogOpen] = useState(false);
  const [selectedInvoiceForVoid, setSelectedInvoiceForVoid] = useState<InvoiceListItem | null>(null);

  // Combine loading states
  const isLoading = isLoadingInvoices || isLoadingSettings;

  // --- Action Handlers ---
  const handleView = (id: string) => navigate(`/invoices/${id}`);
  const handleEdit = (id: string) => navigate(`/invoices/edit/${id}`);

  // Updated handler to open the dialog
  const handleRecordPayment = (id: string) => {
      const invoiceToPay = invoices.find(inv => inv.id === id);
      if (invoiceToPay) {
          setSelectedInvoiceForPayment(invoiceToPay);
          setIsRecordPaymentDialogOpen(true);
      } else {
          console.error("Could not find invoice details for ID:", id);
          // Optionally show a toast error
      }
  };
  
  // Updated handler for Void dialog
  const handleVoid = (id: string) => { 
       const invoiceToVoid = invoices.find(inv => inv.id === id);
        if (invoiceToVoid) {
            setSelectedInvoiceForVoid(invoiceToVoid);
            setIsVoidDialogOpen(true);
        } else {
            console.error("Could not find invoice details for ID:", id);
        }
  }; 

  // Handler for PDF Download
  const handleDownloadPDF = async (id: string) => { 
    // Pass systemSettings to the download function
    await downloadInvoicePDF(id, systemSettings); 
  }; 

  // --- Table Setup ---
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  const columns = useMemo(() => invoiceColumns(
      permissions || {},
      handleView,
      handleEdit,
      handleVoid,
      handleRecordPayment,
      handleDownloadPDF
  ), [permissions, invoices, systemSettings]);

  const table = useReactTable({
    data: invoices,
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
  });

  // --- Skeleton Rows ---
  const renderSkeletonRows = (count: number) => {
    return Array.from({ length: count }).map((_, index) => (
      <TableRow key={`skeleton-${index}`}>
        <TableCell><Skeleton className="h-4 w-4" /></TableCell>
        <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
        <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
        <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
        <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
        <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
        <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
        <TableCell><Skeleton className="h-8 w-8" /></TableCell>
      </TableRow>
    ));
  };

  return (
    <div className="w-full space-y-4">
      {/* Filtering & Column Visibility */}
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter by customer name..."
          value={(table.getColumn('customer_name')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('customer_name')?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        {/* Add Status Filters Here Later if desired */} 
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
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id.replace('_', ' ')}
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
            {isLoading ? (
              renderSkeletonRows(5)
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
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
                  No invoices found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* Pagination */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
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

      {/* Render Dialogs */} 
      {selectedInvoiceForPayment && (
           <RecordPaymentDialog 
              invoiceId={selectedInvoiceForPayment.id}
              invoiceNumber={selectedInvoiceForPayment.invoice_number}
              totalAmount={selectedInvoiceForPayment.total_amount}
              currentAmountPaid={selectedInvoiceForPayment.amount_paid}
              currency={selectedInvoiceForPayment.currency}
              isOpen={isRecordPaymentDialogOpen}
              onOpenChange={setIsRecordPaymentDialogOpen}
           />
      )}
      {/* Render Void Dialog */}
       {selectedInvoiceForVoid && (
           <VoidInvoiceDialog 
              invoiceId={selectedInvoiceForVoid.id}
              invoiceNumber={selectedInvoiceForVoid.invoice_number}
              isOpen={isVoidDialogOpen}
              onOpenChange={setIsVoidDialogOpen}
           />
      )}
    </div>
  );
} 
 
 
 
 
 
 