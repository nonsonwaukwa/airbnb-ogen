import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useGetIssueComments } from '../hooks/useIssues';
import { Skeleton } from '@/components/ui/skeleton';

interface IssueCommentListProps {
    issueId: string;
}

export function IssueCommentList({ issueId }: IssueCommentListProps) {
    const { data: comments, isLoading } = useGetIssueComments(issueId);

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start gap-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-[100px]" />
                            <Skeleton className="h-4 w-full" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (!comments?.length) {
        return (
            <div className="text-center text-muted-foreground py-8">
                No comments yet. Be the first to comment!
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {comments.map((comment) => (
                <div key={comment.id} className="flex items-start gap-4">
                    <Avatar>
                        <AvatarImage src={comment.user?.avatar_url} />
                        <AvatarFallback>
                            {comment.user?.full_name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <span className="font-medium">
                                {comment.user?.full_name}
                            </span>
                            <span className="text-sm text-muted-foreground">
                                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                            </span>
                        </div>
                        <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">
                            {comment.comment}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
} 