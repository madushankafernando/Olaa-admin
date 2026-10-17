/** Cid — each member's personal AI matchmaker. Two personas to choose from. */
export type CidPersonaId = 'aria' | 'julian';

export interface CidPersona {
  id: CidPersonaId;
  name: string;
  tagline: string;
  /** Short description shown on the "choose your Cid" screen. */
  description: string;
  /** Voice rules fed to the LLM. */
  voice: string;
  avatarColor: string;
}

export const CID_PERSONAS: Record<CidPersonaId, CidPersona> = {
  aria: {
    id: 'aria',
    name: 'Aria',
    tagline: 'Warm, curious, gently honest',
    description: 'Aria asks the questions a good friend would, remembers the little things, and tells you straight when a match looks promising.',
    voice:
      'Warm and curious. Asks one question at a time. Notices small details and reflects them back. Light humour, never sarcastic. Honest but kind.',
    avatarColor: '#F2A971',
  },
  julian: {
    id: 'julian',
    name: 'Julian',
    tagline: 'Calm, thoughtful, to the point',
    description: 'Julian keeps things relaxed and practical. Fewer questions, sharper picks, and a clear reason for every introduction.',
    voice:
      'Calm, thoughtful and concise. Asks focused questions. Explains reasoning plainly. Dry, understated humour. Never pushy.',
    avatarColor: '#1F2A44',
  },
};

/** Categories Cid files what it learns under. Stored in `user_facts.category`. */
export const FACT_CATEGORIES = [
  'hobby',
  'interest',
  'like',
  'dislike',
  'value',
  'life_event',
  'thought',
  'lifestyle',
  'looking_for',
  'dealbreaker',
] as const;
export type FactCategory = (typeof FACT_CATEGORIES)[number];

/** Kinds of message that appear in the Cid chat. Non-text kinds render as cards. */
export type CidMessageKind = 'text' | 'match_card' | 'like_received' | 'matched' | 'system';

export interface MatchCardPayload {
  suggestionId: string;
  candidateId: string;
  displayName: string;
  age: number;
  city: string | null;
  distanceKm: number | null;
  photoKey: string | null;
  reason: string;
  /** true when the other person liked you first. */
  incomingLike: boolean;
}

export interface MatchedPayload {
  matchId: string;
  conversationId: string;
  otherUserId: string;
  displayName: string;
  photoKey: string | null;
}
