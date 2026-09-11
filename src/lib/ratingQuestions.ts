import { MAX_RATING, snapRating } from './rating';

export interface RatingChoice {
  id: string;
  label: string;
  /** What this answer alone would score the game, out of 10. */
  score: number;
}

export interface RatingQuestion {
  id: string;
  prompt: string;
  /** Relative pull on the result. Enjoyment moves the needle most. */
  weight: number;
  choices: RatingChoice[];
}

/**
 * The guided questionnaires.
 *
 * Each answer is a score out of 10 in its own right, and the result is their
 * weighted mean — so a set of "it was fine" answers lands mid-scale rather than
 * anywhere surprising. Weights say which questions matter more, not how many
 * points they add.
 */
export const GAME_RATING_QUESTIONS: RatingQuestion[] = [
  {
    id: 'enjoyment',
    prompt: 'How much did you enjoy it?',
    weight: 3,
    choices: [
      { id: 'loved', label: 'Loved every minute', score: 10 },
      { id: 'liked', label: 'Really enjoyed it', score: 8 },
      { id: 'fine', label: 'It was fine', score: 6 },
      { id: 'mixed', label: 'Mixed feelings', score: 4 },
      { id: 'disliked', label: 'Did not enjoy it', score: 2 },
    ],
  },
  {
    id: 'recommend',
    prompt: 'Would you recommend it to a friend?',
    weight: 2,
    choices: [
      { id: 'everyone', label: 'To anyone', score: 10 },
      { id: 'right-person', label: 'To the right person', score: 7 },
      { id: 'doubt', label: 'Probably not', score: 4 },
      { id: 'never', label: 'No', score: 1 },
    ],
  },
  {
    id: 'attention',
    prompt: 'Did it hold your attention?',
    weight: 2,
    choices: [
      { id: 'throughout', label: 'All the way through', score: 9 },
      { id: 'mostly', label: 'Mostly', score: 7 },
      { id: 'dragged', label: 'It dragged in places', score: 4 },
      { id: 'gave-up', label: 'I lost interest', score: 2 },
    ],
  },
  {
    id: 'replay',
    prompt: 'Would you play it again?',
    weight: 1,
    choices: [
      { id: 'definitely', label: 'Definitely', score: 9 },
      { id: 'someday', label: 'Maybe one day', score: 6 },
      { id: 'no', label: 'No', score: 3 },
    ],
  },
];

export const ACHIEVEMENT_RATING_QUESTIONS: RatingQuestion[] = [
  {
    id: 'fairness',
    prompt: 'How reasonable were the requirements?',
    weight: 3,
    choices: [
      { id: 'fair', label: 'Fair throughout', score: 9 },
      { id: 'mostly-fair', label: 'Mostly fair', score: 7 },
      { id: 'some-unfair', label: 'A few unreasonable ones', score: 4 },
      { id: 'unfair', label: 'Punishing', score: 2 },
    ],
  },
  {
    id: 'grind',
    prompt: 'How much grinding did they ask for?',
    weight: 2,
    choices: [
      { id: 'none', label: 'Almost none', score: 9 },
      { id: 'some', label: 'A reasonable amount', score: 7 },
      { id: 'lots', label: 'A lot', score: 4 },
      { id: 'excessive', label: 'Excessive', score: 1 },
    ],
  },
  {
    id: 'value',
    prompt: 'Did chasing them add anything to the game?',
    weight: 2,
    choices: [
      { id: 'better', label: 'Showed me more of it', score: 9 },
      { id: 'neutral', label: 'Neither here nor there', score: 6 },
      { id: 'worse', label: 'Made it worse', score: 3 },
    ],
  },
  {
    id: 'missable',
    prompt: 'Were any missable or down to luck?',
    weight: 1,
    choices: [
      { id: 'none', label: 'None', score: 9 },
      { id: 'few', label: 'One or two', score: 6 },
      { id: 'many', label: 'Plenty', score: 2 },
    ],
  },
];

export type RatingAnswers = Record<string, string>;

/** True once every question has an answer. */
export const isComplete = (questions: RatingQuestion[], answers: RatingAnswers) =>
  questions.every((q) => answers[q.id]);

/**
 * The weighted mean of the chosen answers, snapped to the half-point grid.
 * Unanswered questions are left out rather than counted as zero, so a partly
 * filled form still reads sensibly.
 */
export function scoreAnswers(questions: RatingQuestion[], answers: RatingAnswers): number {
  let weighted = 0;
  let totalWeight = 0;

  for (const question of questions) {
    const choice = question.choices.find((c) => c.id === answers[question.id]);
    if (!choice) continue;
    weighted += choice.score * question.weight;
    totalWeight += question.weight;
  }

  if (totalWeight === 0) return 0;
  return snapRating(Math.min(MAX_RATING, weighted / totalWeight));
}
