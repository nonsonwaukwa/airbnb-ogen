import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useAuth } from '@/app/AuthProvider';
import { useGetIssues } from '../hooks/useIssues';
import { IssueListTable } from '../components/IssueListTable';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGetUsers } from '@/features/users/hooks/useGetUsers';
import type { IssueStatus } from '../types';
import type { User } from '@/features/users/types';

export function IssueListPage() {
    const navigate = useNavigate();
    const { user, hasPermission } = useAuth();
    const [statusFilter, setStatusFilter] = useState<IssueStatus | 'all'>('all');
    const [assigneeFilter, setAssigneeFilter] = useState<string | 'all'>('all');

    // Check permissions
    const canViewIssues = hasPermission('view_issues');
    const canCreateIssues = hasPermission('add_issues');
    const canEditIssues = hasPermission('edit_issues');
    const canDeleteIssues = hasPermission('delete_issues');
    const canAssignIssues = hasPermission('assign_issues');

    // Fetch users only if the current user can assign issues
    const { data: usersData, isLoading: isLoadingUsers } = useGetUsers();

    // Get issues with filters
    const { data: issues, isLoading: isLoadingIssues } = useGetIssues({
        status: statusFilter === 'all' ? undefined : statusFilter,
        assignedUserId: assigneeFilter === 'all' 
            ? undefined 
            : assigneeFilter === 'unassigned' 
                ? null 
                : assigneeFilter,
    });

    // Only consider users loading state if we actually need the user data
    const isLoading = isLoadingIssues || (canAssignIssues && isLoadingUsers);

    if (!canViewIssues) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">You don't have permission to view issues.</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Issues</h1>
                {canCreateIssues && (
                    <Button onClick={() => navigate('/issues/new')}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Issue
                    </Button>
                )}
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle>Filters</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Status</label>
                            <Select
                                value={statusFilter}
                                onValueChange={(value) => setStatusFilter(value as IssueStatus | 'all')}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Filter by status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="open">Open</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="resolved">Resolved</SelectItem>
                                    <SelectItem value="closed">Closed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Assigned To</label>
                            <Select
                                value={assigneeFilter}
                                onValueChange={setAssigneeFilter}
                                disabled={isLoading}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Filter by assignee" />
                                </SelectTrigger>
                                <SelectContent>
                                    {canAssignIssues ? (
                                        <>
                                            <SelectItem value="all">All Assignees</SelectItem>
                                            {user?.id && <SelectItem value={user.id}>My Issues</SelectItem>}
                                            <SelectItem value="unassigned">Unassigned</SelectItem>
                                            {usersData?.map((assignee: User) => (
                                                <SelectItem key={assignee.id} value={assignee.id}>
                                                    {assignee.full_name}
                                                </SelectItem>
                                            ))}
                                        </>
                                    ) : (
                                        <>
                                            <SelectItem value="all">All Viewable Issues</SelectItem>
                                            {user?.id && <SelectItem value={user.id}>My Issues</SelectItem>}
                                        </>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Issues Table */}
            <IssueListTable 
                issues={issues || []} 
                isLoading={isLoading}
                canEdit={canEditIssues}
                canDelete={canDeleteIssues}
                canAssign={canAssignIssues}
            />
        </div>
    );
} 