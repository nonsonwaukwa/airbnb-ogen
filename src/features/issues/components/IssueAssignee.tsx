import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface IssueAssigneeProps {
    assignee: {
        name: string;
        avatarUrl?: string;
    } | null;
}

export function IssueAssignee({ assignee }: IssueAssigneeProps) {
    if (!assignee) {
        return <div className="text-muted-foreground text-sm">Unassigned</div>;
    }

    return (
        <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
                <AvatarImage src={assignee.avatarUrl} alt={assignee.name} />
                <AvatarFallback>{assignee.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="text-sm">{assignee.name}</span>
        </div>
    );
} 