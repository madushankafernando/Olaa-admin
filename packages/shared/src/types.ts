/** Domain types shared across apps. Mirrors the Supabase schema (see supabase/migrations). */
import type { CidPersonaId } from './cid';
import type { PlanId } from './plans';

export type Gender = 'man' | 'woman' | 'nonbinary';

/**
 * Profile review lifecycle:
 *   draft → pending_review → approved
 *                         ↘ changes_requested → (edit) → pending_review
 *                         ↘ rejected (data purged within 30 days)
 */
export type ProfileStatus = 'draft' | 'pending_review' | 'changes_requested' | 'approved' | 'rejected' | 'suspended';

export type ReviewDecision = 'approve' | 'request_changes' | 'reject';

export interface Profile {
  id: string;
  display_name: string | null;
  birthdate: string | null;
  gender: Gender | null;
  seeking: Gender[];
  age_min: number;
  age_max: number;
  max_distance_km: number;
  city: string | null;
  bio: string | null;
  status: ProfileStatus;
  review_note: string | null;
  cid_persona: CidPersonaId | null;
  approved_at: string | null;
  created_at: string;
}

export interface Photo {
  id: string;
  user_id: string;
  storage_key: string;
  position: number;
  moderation_status: 'pending' | 'approved' | 'rejected';
}

export type SuggestionStatus = 'suggested' | 'liked' | 'passed' | 'expired';

export interface Conversation {
  id: string;
  match_id: string;
  status: 'open' | 'closed';
  closed_by: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export interface MeResponse {
  profile: Profile;
  photos: Photo[];
  answers: Record<string, string | string[]>;
  plan: { id: PlanId; matchesPerDay: number; trialEndsAt: string | null; currentPeriodEnd: string | null };
}

export function ageFromBirthdate(birthdate: string, now: Date = new Date()): number {
  const b = new Date(birthdate);
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}
