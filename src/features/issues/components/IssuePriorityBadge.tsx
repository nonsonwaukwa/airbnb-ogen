import { Badge } from '@/components/ui/badge';

interface IssuePriorityBadgeProps {
    priority: string;
}

export function IssuePriorityBadge({ priority }: IssuePriorityBadgeProps) {
    const getPriorityBadgeVariant = (priority: string) => {
        switch (priority) {
            case 'low':
                return 'secondary';
            case 'medium':
                return 'default';
            case 'high':
                return 'destructive';
            default:
                return 'secondary';
        }
    };

    return (
        <Badge variant={getPriorityBadgeVariant(priority)}>
            {priority}
        </Badge>
    );
} 