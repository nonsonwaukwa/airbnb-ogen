import { useState } from 'react';
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
  useReactTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { MoreHorizontal, PlusCircle, Settings2, Edit, Trash2 } from 'lucide-react';
import { useGetStaffList } from '@/features/staff/hooks/useStaff';
import { StaffMember } from '@/features/staff/types';
import { useAuth } from '@/app/AuthProvider';
import { StaffForm } from './StaffForm'; // To be created
import { DeactivateStaffDialog } from './DeactivateStaffDialog'; // To be created
import { format } from 'date-fns'; // For formatting dates if needed

// --- Helper function to define columns ---
export const getColumns = (
  onEdit: (staff: StaffMember) => void,
  onDeactivate: (staff: StaffMember) => void,
  canEdit: boolean,
  canDelete: boolean // canDelete maps to 'deactivate' permission conceptually
): ColumnDef<StaffMember>[] => [
  // Optional: Add Checkbox column if needed for bulk actions
  // {
  //   id: 'select',
  //   header: ({ table }) => ( /* ... checkbox logic */ ),
  //   cell: ({ row }) => ( /* ... checkbox logic */ ),
  //   enableSorting: false,
  //   enableHiding: false,
  // },
  {
    accessorKey: 'full_name',
    header: 'Name',
    cell: ({ row }) => <div className="font-medium">{row.getValue('full_name')}</div>,
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
     cell: ({ row }) => row.getValue('phone') || '-',
  },
  {
    accessorFn: (row) => row.role?.name, // Access nested role name
    id: 'roleName',
    header: 'Role',
    cell: ({ row }) => row.original.role?.name || <span className="text-muted-foreground">N/A</span>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      const variant: 'default' | 'secondary' | 'destructive' | 'outline' =
        status === 'active' ? 'default' : status === 'inactive' ? 'secondary' : 'outline';
      return <Badge variant={variant} className="capitalize">{status}</Badge>;
    },
  },
    {
    accessorKey: 'employment_date',
    header: 'Employment Date',
    cell: ({ row }) => {
        const date = row.getValue('employment_date') as string | null;
        return date ? format(new Date(date), 'PP') : '-'; // Format date using date-fns
    },
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => {
      const staff = row.original;
      // Only show actions if user has relevant permissions
      if (!canEdit && !canDelete) return null;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            {canEdit && (
              <DropdownMenuItem onClick={() => onEdit(staff)}>
                 <Edit className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
            )}
            {canDelete && staff.status === 'active' && ( // Only show deactivate for active users
              <DropdownMenuItem onClick={() => onDeactivate(staff)} className="text-red-600 focus:text-red-600">
                <Trash2 className="mr-2 h-4 w-4" /> Deactivate
              </DropdownMenuItem>
            )}
             {/* Add Reactivate option if needed later based on status */}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];


// --- Main Table Component ---
export function StaffListTable() {
  const { data: staffList = [], isLoading, error } = useGetStaffList();
  const { permissions } = useAuth();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [staffToDeactivate, setStaffToDeactivate] = useState<StaffMember | null>(null);

  const canAdd = permissions['add_staff'] === true;
  const canEdit = permissions['edit_staff'] === true;
  const canDelete = permissions['delete_staff'] === true; // Using delete permission for deactivate action

  const handleAddNew = () => {
    setSelectedStaff(null); // Ensure no staff is selected for adding
    setIsFormOpen(true);
  };

  const handleEdit = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setIsFormOpen(true);
  };

  const handleDeactivate = (staff: StaffMember) => {
    setStaffToDeactivate(staff);
    setIsDeactivateOpen(true);
  };

  const columns = getColumns(handleEdit, handleDeactivate, canEdit, canDelete);

  const table = useReactTable({
    data: staffList,
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
        pageSize: 10, // Default page size
      }
    }
  });

  if (isLoading) {
      return <div>Loading staff...</div>; // Add a proper Skeleton loader later
  }

  if (error) {
      return <div className="text-red-600">Error loading staff: {error.message}</div>;
  }


  return (
    <div className="w-full">
      <div className="flex items-center justify-between py-4">
        {/* Filtering Input */}
        <Input
          placeholder="Filter by name..." // Adjust filter target as needed
          value={(table.getColumn('full_name')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('full_name')?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <div className="flex items-center gap-2">
            {/* Column Visibility Toggle */}
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-auto">
                <Settings2 className="mr-2 h-4 w-4" /> View
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
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
                        {column.id}
                    </DropdownMenuCheckboxItem>
                    );
                })}
            </DropdownMenuContent>
            </DropdownMenu>

            {/* Add New Button */}
            {canAdd && (
                <Button onClick={handleAddNew}>
                   <PlusCircle className="mr-2 h-4 w-4" /> Invite Staff
                </Button>
            )}
        </div>

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
                  key={row.id}
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
                  No staff members found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* Pagination */}
      <div className="flex items-center justify-end space-x-2 py-4">
         {/* Optional: Row selection count */}
         {/* <div className="flex-1 text-sm text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length} of{' '}
            {table.getFilteredRowModel().rows.length} row(s) selected.
        </div> */}
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

       {/* Dialogs/Sheets for Forms */}
        <StaffForm
            isOpen={isFormOpen}
            setIsOpen={setIsFormOpen}
            staffMember={selectedStaff} // Pass null for invite, staff data for edit
        />

        <DeactivateStaffDialog
            isOpen={isDeactivateOpen}
            setIsOpen={setIsDeactivateOpen}
            staffMember={staffToDeactivate}
        />
    </div>
  );
} 