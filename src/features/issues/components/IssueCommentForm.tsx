import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAddIssueComment } from '../hooks/useIssues';

interface IssueCommentFormProps {
    issueId: string;
}

export function IssueCommentForm({ issueId }: IssueCommentFormProps) {
    const [comment, setComment] = useState('');
    const { mutate: addComment, isPending } = useAddIssueComment();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!comment.trim()) return;

        addComment(
            { issue_id: issueId, comment: comment.trim() },
            {
                onSuccess: () => {
                    setComment('');
                },
            }
        );
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
                placeholder="Add a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={isPending}
            />
            <Button type="submit" disabled={isPending || !comment.trim()}>
                {isPending ? 'Adding Comment...' : 'Add Comment'}
            </Button>
        </form>
    );
} 