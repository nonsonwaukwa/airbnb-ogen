import { Database } from '@/types/supabase';

export enum IssueCategory {
  Plumbing = "Plumbing",
  Electrical = "Electrical",
  Appliance_Repair = "Appliance Repair",
  Cleaning = "Cleaning",
  Guest_Complaint = "Guest Complaint",
  Maintenance = "Maintenance",
  Other = "Other"
}


export type IssuePriority = "low" | "medium" | "high";

export type IssueStatus = "open" | "in_progress" | "resolved" | "closed";

export interface Issue {
  id: string;
  issue_number: string;
  title: string;
  description: string | null;
  category: IssueCategory | null;
  status: IssueStatus;
  priority: IssuePriority;
  property_id: string | null;
  booking_id: string | null;
  reported_by_user_id: string | null;
  assigned_to_user_id: string | null;
  estimated_cost: number | null;
  date_reported: string;
  date_resolved: string | null;
  resolution_summary: string | null;
  associated_expense_id: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined fields from related tables
  property?: {
      id: string;
      name: string;
  } | null;
  booking?: {
      id: string;
      guest_name: string;
      check_in: string;
      check_out: string;
  } | null;
  reported_by_user?: {
      id: string;
      full_name: string;
  } | null;
  assigned_to_user?: {
      id: string;
      full_name: string;
  } | null;
  expense?: {
      id: string;
      amount: number;
      currency: string;
  } | null;
}

export interface IssueImage {
    id: string;
    issue_id: string;
    image_url: string;
    cloudinary_public_id: string;
    uploaded_at: string;
}

export interface IssueComment {
    id: string;
    issue_id: string;
    user_id: string;
    comment: string;
    created_at: string;
    updated_at: string;
    
    // Joined fields
    user?: {
        id: string;
        full_name: string;
        avatar_url?: string;
    };
}

// Form payload types
export interface CreateIssuePayload {
    title: string;
    description: string | null;
    category: IssueCategory | null;
    priority: IssuePriority;
    property_id: string | null;
    booking_id: string | null;
    assigned_to_user_id: string | null;
    reported_by_user_id: string | null;
    estimated_cost: number | null;
}

export interface UpdateIssuePayload extends Partial<CreateIssuePayload> {
    id: string;
    status?: IssueStatus;
}

export interface CreateIssueCommentPayload {
    issue_id: string;
    content: string;
    user_id: string;
} 