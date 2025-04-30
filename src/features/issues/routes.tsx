import { RouteObject } from 'react-router-dom';
import { PermissionGuard } from '@/components/auth/PermissionGuard';

export const issueRoutes: RouteObject[] = [
    {
        path: 'issues',
        children: [
            {
                index: true,
                lazy: async () => {
                    const { IssueListPage } = await import('./pages/IssueListPage');
                    return {
                        element: (
                            <PermissionGuard permission="view_issues">
                                <IssueListPage />
                            </PermissionGuard>
                        ),
                    };
                },
            },
            {
                path: 'new',
                lazy: async () => {
                    const { IssueFormPage } = await import('./pages/IssueFormPage');
                    return {
                        element: (
                            <PermissionGuard permission="add_issues">
                                <IssueFormPage />
                            </PermissionGuard>
                        ),
                    };
                },
            },
            {
                path: ':id',
                lazy: async () => {
                    const { IssueViewPage } = await import('./pages/IssueViewPage');
                    return {
                        element: (
                            <PermissionGuard permission="view_issues">
                                <IssueViewPage />
                            </PermissionGuard>
                        ),
                    };
                },
            },
            {
                path: ':id/edit',
                lazy: async () => {
                    const { IssueFormPage } = await import('./pages/IssueFormPage');
                    return {
                        element: (
                            <PermissionGuard permission="edit_issues">
                                <IssueFormPage />
                            </PermissionGuard>
                        ),
                    };
                },
            },
        ],
    },
]; 