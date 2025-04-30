import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Edit, Trash, RefreshCw, UserPlus } from 'lucide-react';
import { useDeleteIssue, useUpdateIssue } from '../hooks/useIssues';
import { IssueStatusBadge } from './IssueStatusBadge';
import { IssuePriorityBadge } from './IssuePriorityBadge';
import { formatRelativeDate } from '@/lib/utils';
import type { Issue, IssueStatus } from '../types';
import { useAuth } from '@/app/AuthProvider';
import { AssignIssueDialog } from './AssignIssueDialog';

interface IssueListTableProps {
    issues: Issue[];
    isLoading?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
    canAssign?: boolean;
}

export function IssueListTable({ issues, isLoading, canEdit, canDelete, canAssign }: IssueListTableProps) {
    const navigate = useNavigate();
    const { mutate: deleteIssue } = useDeleteIssue();
    const { mutate: updateIssue, isPending: isUpdatingStatus } = useUpdateIssue();

    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
    const [selectedIssueForAssignment, setSelectedIssueForAssignment] = useState<Issue | null>(null);

    const canChangeStatus = canEdit;

    const handleStatusChange = (issueId: string, status: IssueStatus) => {
        updateIssue({ id: issueId, status });
    };

    const handleDelete = async (issue: Issue) => {
        if (!window.confirm('Are you sure you want to delete this issue?')) {
            return;
        }
        deleteIssue(issue.id);
    };

    const handleOpenAssignDialog = (issue: Issue) => {
        setSelectedIssueForAssignment(issue);
        setIsAssignDialogOpen(true);
    };

    const handleAssignSubmit = (userId: string) => {
        if (!selectedIssueForAssignment) return;
        updateIssue({ id: selectedIssueForAssignment.id, assigned_to_user_id: userId });
    };

    if (isLoading) {
        return <div className="text-center py-4">Loading issues...</div>;
    }

    const statusOptions: IssueStatus[] = ['open', 'in_progress', 'resolved', 'closed'];

    return (
        <>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Issue #</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Property</TableHead>
                            <TableHead>Reported</TableHead>
                            <TableHead>Assigned To</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {issues.map((issue) => {
                            const showDeleteOption = canDelete && issue.status === 'open';
                            const showAssignReassignOption = canAssign;
                            const isAssigned = !!issue.assigned_to_user_id;

                            return (
                                <TableRow key={issue.id}>
                                    <TableCell className="font-medium">
                                        {issue.issue_number}
                                    </TableCell>
                                    <TableCell>{issue.title}</TableCell>
                                    <TableCell>
                                        {issue.category && (
                                            <Badge variant="outline">
                                                {issue.category}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <IssueStatusBadge status={issue.status} />
                                    </TableCell>
                                    <TableCell>
                                        <IssuePriorityBadge priority={issue.priority} />
                                    </TableCell>
                                    <TableCell>
                                        {issue.property?.name || 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                        {formatRelativeDate(issue.date_reported)}
                                    </TableCell>
                                    <TableCell>
                                        {issue.assigned_to_user?.full_name || 'Unassigned'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                    onClick={() => navigate(`/issues/${issue.id}`)}
                                                >
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    View
                                                </DropdownMenuItem>
                                                {canEdit && (
                                                    <DropdownMenuItem
                                                        onClick={() => navigate(`/issues/${issue.id}/edit`)}
                                                        disabled={issue.status !== 'open'}
                                                    >
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                )}
                                                {showAssignReassignOption && (
                                                    <DropdownMenuItem onClick={() => handleOpenAssignDialog(issue)}>
                                                        <UserPlus className="mr-2 h-4 w-4" />
                                                        {isAssigned ? "Reassign Issue" : "Assign Issue"}
                                                    </DropdownMenuItem>
                                                )}
                                                {canChangeStatus && (
                                                    <DropdownMenuSub>
                                                        <DropdownMenuSubTrigger>
                                                            <RefreshCw className="mr-2 h-4 w-4" />
                                                            Change Status
                                                        </DropdownMenuSubTrigger>
                                                        <DropdownMenuSubContent>
                                                            {statusOptions.map((status) => (
                                                                <DropdownMenuItem
                                                                    key={status}
                                                                    disabled={issue.status === status || isUpdatingStatus}
                                                                    onClick={() => handleStatusChange(issue.id, status)}
                                                                >
                                                                    {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                                                                </DropdownMenuItem>
                                                            ))}
                                                        </DropdownMenuSubContent>
                                                    </DropdownMenuSub>
                                                )}
                                                {showDeleteOption && (
                                                    <>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => handleDelete(issue)}
                                                            className="text-destructive"
                                                            disabled={isUpdatingStatus}
                                                        >
                                                            <Trash className="mr-2 h-4 w-4" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {issues.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center text-muted-foreground">
                                    No issues found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {selectedIssueForAssignment && (
                <AssignIssueDialog 
                    isOpen={isAssignDialogOpen}
                    onOpenChange={setIsAssignDialogOpen}
                    issueId={selectedIssueForAssignment.id}
                    currentAssigneeId={selectedIssueForAssignment.assigned_to_user_id}
                    onSubmit={handleAssignSubmit}
                    isSubmitting={isUpdatingStatus}
                />
            )}
        </>
    );
} 