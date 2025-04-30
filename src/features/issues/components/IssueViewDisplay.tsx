import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger
} from '@/components/ui/dropdown-menu';
import { formatCurrency, formatRelativeDate, formatDate } from '@/lib/utils';
import { IssueCommentList } from './IssueCommentList';
import { IssueCommentForm } from './IssueCommentForm';
import { IssueStatusBadge } from './IssueStatusBadge';
import { IssuePriorityBadge } from './IssuePriorityBadge';
import { useGetIssueImages, useDeleteIssueImage, useUpdateIssue } from '../hooks/useIssues';
import type { Issue, IssueImage, IssueStatus } from '../types';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Trash2, X, ChevronsUpDown } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface IssueViewDisplayProps {
    issue: Issue;
    onEdit?: () => void;
    canEdit?: boolean;
}

export function IssueViewDisplay({ issue, onEdit, canEdit }: IssueViewDisplayProps) {
    const { data: images, isLoading: isLoadingImages } = useGetIssueImages(issue.id);
    const { mutate: deleteImage } = useDeleteIssueImage();
    const { toast } = useToast();
    const { mutate: updateIssue, isPending: isUpdatingStatus } = useUpdateIssue();
    
    // State for lightbox
    const [selectedImage, setSelectedImage] = useState<IssueImage | null>(null);

    // Define the order of statuses for the dropdown
    const statusOptions: IssueStatus[] = ['open', 'in_progress', 'resolved', 'closed'];

    const handleStatusChange = (status: IssueStatus) => {
        updateIssue({ id: issue.id, status });
    };

    // Handle image deletion
    const handleDeleteImage = async (image: IssueImage) => {
        if (!window.confirm('Are you sure you want to delete this image?')) {
            return;
        }

        deleteImage(
            {
                imageId: image.id,
                issueId: issue.id,
                imageUrl: image.image_url
            },
            {
                onSuccess: () => {
                    toast({
                        title: "Image deleted",
                        description: "The image was successfully deleted.",
                    });
                },
                onError: (error) => {
                    toast({
                        title: "Error",
                        description: `Failed to delete image: ${error.message}`,
                        variant: "destructive",
                    });
                },
            }
        );
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span>#{issue.issue_number} - {issue.title}</span>
                            
                            {canEdit ? (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="flex items-center gap-1 px-2 py-0.5 h-auto" disabled={isUpdatingStatus}>
                                            <IssueStatusBadge status={issue.status} />
                                            <ChevronsUpDown className="h-3 w-3 text-muted-foreground" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start">
                                        {statusOptions.map((status) => (
                                            <DropdownMenuItem
                                                key={status}
                                                disabled={issue.status === status || isUpdatingStatus}
                                                onClick={() => handleStatusChange(status)}
                                            >
                                                {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            ) : (
                                <IssueStatusBadge status={issue.status} />
                            )}
                            
                            <IssuePriorityBadge priority={issue.priority} />
                        </div>
                        <div className="text-sm font-normal text-muted-foreground">
                            Reported {formatRelativeDate(issue.date_reported)}
                            {issue.date_resolved && ` | Resolved ${formatRelativeDate(issue.date_resolved)}`}
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {issue.description && (
                        <div>
                            <h3 className="mb-2 font-medium">Description</h3>
                            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                                {issue.description}
                            </p>
                        </div>
                    )}

                    <Separator />

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        <div>
                            <h3 className="mb-1 text-sm font-medium">Category</h3>
                            <Badge variant="outline">{issue.category || 'N/A'}</Badge>
                        </div>
                        <div>
                            <h3 className="mb-1 text-sm font-medium">Property</h3>
                            {issue.property ? (
                                <Link to={`/properties/${issue.property.id}`}>
                                    <Badge variant="secondary">{issue.property.name}</Badge>
                                </Link>
                            ) : (
                                <Badge variant="outline">N/A</Badge>
                            )}
                        </div>
                        <div>
                            <h3 className="mb-1 text-sm font-medium">Booking</h3>
                            {issue.booking ? (
                                <Link to={`/bookings/${issue.booking.id}`}>
                                    <Badge variant="secondary">
                                        {issue.booking.guest_name} ({formatDate(issue.booking.check_in)} - {formatDate(issue.booking.check_out)})
                                    </Badge>
                                </Link>
                            ) : (
                                <Badge variant="outline">N/A</Badge>
                            )}
                        </div>
                        <div>
                            <h3 className="mb-1 text-sm font-medium">Assigned To</h3>
                            <Badge variant="outline">
                                {issue.assigned_to_user?.full_name || 'Unassigned'}
                            </Badge>
                        </div>
                        <div>
                            <h3 className="mb-1 text-sm font-medium">Reported By</h3>
                            <Badge variant="outline">
                                {issue.reported_by_user?.full_name || 'N/A'}
                            </Badge>
                        </div>
                        <div>
                            <h3 className="mb-1 text-sm font-medium">Estimated Cost</h3>
                            <Badge variant="outline">
                                {issue.estimated_cost != null ? formatCurrency(issue.estimated_cost) : 'N/A'}
                            </Badge>
                        </div>
                        {issue.expense && (
                            <div>
                                <h3 className="mb-1 text-sm font-medium">Linked Expense</h3>
                                <Link to={`/expenses/${issue.expense.id}`}>
                                    <Badge variant="secondary">
                                        {formatCurrency(issue.expense.amount, issue.expense.currency)}
                                    </Badge>
                                </Link>
                            </div>
                        )}
                        {issue.date_resolved && (
                            <div>
                                <h3 className="mb-1 text-sm font-medium">Date Resolved</h3>
                                <Badge variant="outline">{formatDate(issue.date_resolved)}</Badge>
                            </div>
                        )}
                    </div>

                    {(issue.status === 'resolved' || issue.status === 'closed') && issue.resolution_summary && (
                        <>
                            <Separator />
                            <div>
                                <h3 className="mb-2 font-medium">Resolution Summary</h3>
                                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                                    {issue.resolution_summary}
                                </p>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Images Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Images</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoadingImages ? (
                        <div className="text-center text-muted-foreground">Loading images...</div>
                    ) : !images?.length ? (
                        <div className="text-center text-muted-foreground">No images attached</div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {images.map((image) => (
                                <Card key={image.id} className="relative group">
                                    <img
                                        src={image.image_url}
                                        alt="Issue attachment"
                                        className="w-full h-32 object-cover rounded-lg cursor-pointer"
                                        onClick={() => setSelectedImage(image)}
                                    />
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => handleDeleteImage(image)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Comments Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Comments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <IssueCommentForm issueId={issue.id} />
                    <IssueCommentList issueId={issue.id} />
                </CardContent>
            </Card>

            {/* Image Lightbox */}
            <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
                <DialogContent className="max-w-4xl p-0">
                    {selectedImage && (
                        <div className="relative">
                            <img
                                src={selectedImage.image_url}
                                alt="Issue attachment"
                                className="w-full h-auto max-h-[80vh] object-contain"
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2"
                                onClick={() => setSelectedImage(null)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-12"
                                onClick={() => {
                                    handleDeleteImage(selectedImage);
                                    setSelectedImage(null);
                                }}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
} 