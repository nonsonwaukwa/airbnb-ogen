import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAddIssueComment } from '../hooks/useIssues';

interface AddIssueCommentFormProps {
    issueId: string;
}

export function AddIssueCommentForm({ issueId }: AddIssueCommentFormProps) {
    const [comment, setComment] = useState('');
    const { mutate: addComment, isLoading } = useAddIssueComment();

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
                disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !comment.trim()}>
                {isLoading ? 'Adding Comment...' : 'Add Comment'}
            </Button>
        </form>
    );
} 