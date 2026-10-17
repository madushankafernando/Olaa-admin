/**
 * Profile questions asked during onboarding (before admin review).
 * Answers are stored in `profile_answers` keyed by `key`, and are part of the text
 * that gets embedded for AI matching. Add or reword freely — keys must stay stable.
 */
export type QuestionType = 'text' | 'single' | 'multi';

export interface ProfileQuestion {
  key: string;
  prompt: string;
  type: QuestionType;
  options?: string[];
  required: boolean;
  maxLength?: number;
}

export const PROFILE_QUESTIONS: ProfileQuestion[] = [
  { key: 'about_me', prompt: 'Describe yourself in a few sentences.', type: 'text', required: true, maxLength: 500 },
  {
    key: 'relationship_goal',
    prompt: 'What are you looking for?',
    type: 'single',
    options: ['A long-term relationship', 'Something serious, open to see', 'Getting to know people', 'Not sure yet'],
    required: true,
  },
  { key: 'perfect_weekend', prompt: 'What does a perfect weekend look like?', type: 'text', required: true, maxLength: 300 },
  {
    key: 'interests',
    prompt: 'Pick a few things you love.',
    type: 'multi',
    options: ['Travel', 'Cooking', 'Fitness', 'Music', 'Art', 'Books', 'Outdoors', 'Gaming', 'Film', 'Food & wine', 'Pets', 'Faith', 'Volunteering', 'Tech', 'Fashion', 'Sport'],
    required: true,
  },
  { key: 'kids', prompt: 'Kids?', type: 'single', options: ['Want someday', "Don't want", 'Have and want more', "Have, don't want more", 'Open'], required: true },
  { key: 'smoking', prompt: 'Do you smoke?', type: 'single', options: ['No', 'Sometimes', 'Yes'], required: true },
  { key: 'drinking', prompt: 'Do you drink?', type: 'single', options: ['No', 'Socially', 'Yes'], required: true },
  { key: 'values', prompt: 'What matters most to you in a partner?', type: 'text', required: true, maxLength: 300 },
  { key: 'dealbreakers', prompt: 'Any deal-breakers?', type: 'text', required: false, maxLength: 300 },
];

export const MIN_PHOTOS = 2;
export const MAX_PHOTOS = 6;
export const MIN_AGE = 18;
