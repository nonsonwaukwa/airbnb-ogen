import { useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
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
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react'; // Removed PlusCircle
import { useGetRoles } from '@/features/roles/hooks/useRoles';
import { Role } from '@/features/roles/types';
import { useAuth } from '@/app/AuthProvider';
// Removed imports for RoleForm and DeleteRoleDialog as they are rendered in parent

// --- Column Definitions ---
// Updated to accept handler props from parent
const getColumns = (
    openEditDialog: (role: Role) => void,
    openDeleteDialog: (role: Role) => void,
    canEdit: boolean // 'edit_roles' permission covers edit and delete
): ColumnDef<Role>[] => [
    {
        accessorKey: 'name',
        header: 'Role Name',
        cell: ({ row }) => <div className="font-medium">{row.getValue('name')}</div>,
    },
    {
        accessorKey: 'description',
        header: 'Description',
        cell: ({ row }) => row.getValue('description') || <span className="text-muted-foreground">N/A</span>,
    },
    {
        id: 'actions',
        enableHiding: false,
        cell: ({ row }) => {
            const role = row.original;
            // Disable actions for SuperAdmin/Basic Staff? Maybe add check later if needed.
            const isProtectedRole = ['SuperAdmin', 'Basic Staff'].includes(role.name);

            // Only show dropdown if user can edit roles
            if (!canEdit) return null;

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0" disabled={isProtectedRole && role.name === 'SuperAdmin'}> {/* Example: Disable trigger for SuperAdmin */}
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        {/* Call prop function onClick */}
                        <DropdownMenuItem onClick={() => openEditDialog(role)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit Role
                        </DropdownMenuItem>
                         {/* Call prop function onClick, disable delete for protected roles */}
                        <DropdownMenuItem
                            onClick={() => openDeleteDialog(role)}
                            className="text-red-600 focus:text-red-600"
                            disabled={isProtectedRole} // Disable delete for SuperAdmin & Basic Staff
                        >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Role
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];


// --- Main Table Component ---
// Updated props interface
interface RoleListTableProps {
    openEditDialog: (role: Role) => void;
    openDeleteDialog: (role: Role) => void;
}

export function RoleListTable({ openEditDialog, openDeleteDialog }: RoleListTableProps) {
    const { data: roles = [], isLoading, error } = useGetRoles();
    const { permissions } = useAuth();
    const [sorting, setSorting] = useState<SortingState>([]);

    // Removed local state for dialogs - managed by parent (RolesPage)

    // 'edit_roles' permission grants ability to add, edit, and delete roles
    const canManageRoles = permissions['edit_roles'] === true;

    // Removed local handler functions (handleAddNew, handleEdit, handleDelete)

    // Pass handlers down to column definition function
    const columns = getColumns(openEditDialog, openDeleteDialog, canManageRoles);

    const table = useReactTable({
        data: roles,
        columns,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        state: {
            sorting,
        },
        initialState: {
            pagination: { pageSize: 10 }
        }
    });

    console.log('[RoleListTable] State:', { isLoading, error: error?.message, rolesCount: roles.length });

    if (isLoading) {
        console.log('[RoleListTable] Rendering Loading State');
        return <div>Loading roles...</div>; // Add Skeleton later
    }
    if (error) {
        console.log('[RoleListTable] Rendering Error State:', error.message);
        return <div className="text-red-600">Error loading roles: {error.message}</div>;
    }

    console.log('[RoleListTable] Rendering Table Content');

    return (
        <div className="w-full">
            {/* --- Add Role Button Div REMOVED From Here --- */}

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
                        No roles found.
                        </TableCell>
                    </TableRow>
                    )}
                </TableBody>
                </Table>
            </div>
            {/* Pagination */}
            <div className="flex items-center justify-end space-x-2 py-4">
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

            {/* --- Dialogs REMOVED From Here - Rendered in Parent (RolesPage) --- */}
        </div>
    );
}
