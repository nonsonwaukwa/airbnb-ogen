import { Badge } from '@/components/ui/badge';

interface IssueStatusBadgeProps {
    status: string;
}

export function IssueStatusBadge({ status }: IssueStatusBadgeProps) {
    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'open':
                return 'default';
            case 'in_progress':
                return 'secondary';
            case 'resolved':
                return 'outline';
            case 'closed':
                return 'secondary';
            default:
                return 'secondary';
        }
    };

    return (
        <Badge variant={getStatusBadgeVariant(status)}>
            {status.replace('_', ' ')}
        </Badge>
    );
} 