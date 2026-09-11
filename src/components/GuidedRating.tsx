import React, { useState } from 'react';
import { Check, RotateCcw, SlidersHorizontal } from 'lucide-react';
import {
  RatingAnswers,
  RatingQuestion,
  isComplete,
  scoreAnswers,
} from '../lib/ratingQuestions';
import { MAX_RATING, formatRating, ratingColor, ratingLabel } from '../lib/rating';
import { RatingControl } from './Rating';
import { Button } from './ui';
import { cn } from '../lib/cn';

interface GuidedRatingProps {
  questions: RatingQuestion[];
  value: number;
  onChange: (next: number) => void;
  /** Shown under the slider once a score exists. */
  description?: string;
}

/**
 * Scores a game by asking about it instead of demanding a number.
 *
 * The questionnaire runs until every question is answered, then hands over to
 * the ordinary slider with the computed score already in place — the suggestion
 * is a starting point, not a verdict, so disagreeing with it costs one drag.
 */
export const GuidedRating: React.FC<GuidedRatingProps> = ({
  questions,
  value,
  onChange,
  description,
}) => {
  const [answers, setAnswers] = useState<RatingAnswers>({});
  // A score that already exists skips straight to the slider, so reopening a
  // rated game does not ask it all again.
  const [asking, setAsking] = useState(value === 0);

  const answered = isComplete(questions, answers);

  const submit = () => {
    onChange(scoreAnswers(questions, answers));
    setAsking(false);
  };

  if (!asking) {
    return (
      <div className="space-y-1.5">
        <RatingControl value={value} onChange={onChange} />
        <div className="flex items-center justify-between gap-2">
          {description ? <p className="text-50 text-gray-600">{description}</p> : <span />}
          <Button
            buttonStyle="subtle"
            size="s"
            onClick={() => {
              setAnswers({});
              setAsking(true);
            }}
          >
            <RotateCcw size={12} />
            Answer questions
          </Button>
        </div>
      </div>
    );
  }

  const preview = scoreAnswers(questions, answers);

  return (
    <div className="space-y-3 rounded-md border border-gray-300 bg-gray-75 p-3">
      {questions.map((question) => (
        <fieldset key={question.id}>
          <legend className="mb-1.5 text-75 font-semibold text-gray-800">{question.prompt}</legend>
          <div className="flex flex-wrap gap-1.5">
            {question.choices.map((choice) => {
              const selected = answers[question.id] === choice.id;
              return (
                <button
                  key={choice.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: choice.id }))}
                  className={cn(
                    'rounded-sm border px-2.5 py-1.5 text-75 font-medium transition-colors',
                    selected
                      ? 'border-accent-700 bg-accent-100 text-accent-900'
                      : 'border-gray-300 bg-gray-100 text-gray-700 hover:border-gray-400 hover:text-gray-900',
                  )}
                >
                  {choice.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 pt-3">
        <span className="text-75 text-gray-700">
          {answered ? (
            <>
              That works out to{' '}
              <span className="font-bold tabular-nums" style={{ color: ratingColor(preview) }}>
                {formatRating(preview)} / {MAX_RATING}
              </span>{' '}
              — {ratingLabel(preview)}
            </>
          ) : (
            'Answer each question for a suggested score.'
          )}
        </span>

        <div className="flex items-center gap-2">
          {value > 0 && (
            <Button buttonStyle="subtle" size="s" onClick={() => setAsking(false)}>
              <SlidersHorizontal size={12} />
              Set it myself
            </Button>
          )}
          <Button variant="accent" size="s" onClick={submit} disabled={!answered}>
            <Check size={12} />
            Use this score
          </Button>
        </div>
      </div>
    </div>
  );
};
