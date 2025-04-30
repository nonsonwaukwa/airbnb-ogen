import { useNavigate, useParams } from 'react-router-dom';
import { useGetIssue } from '../hooks/useIssues';
import { IssueViewDisplay } from '../components/IssueViewDisplay';
import { useAuth } from '@/app/AuthProvider';

export function IssueViewPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { hasPermission } = useAuth();
    const { data: issue, isLoading } = useGetIssue(id);

    const canEditPermission = hasPermission('edit_issues');
    
    const canEditIssue = canEditPermission && issue?.status === 'open';

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (!issue) {
        return <div>Issue not found</div>;
    }

    return (
        <div className="container mx-auto py-6">
            <IssueViewDisplay
                issue={issue}
                onEdit={canEditIssue ? () => navigate(`/issues/${issue.id}/edit`) : undefined}
                canEdit={canEditPermission}
            />
        </div>
    );
} 