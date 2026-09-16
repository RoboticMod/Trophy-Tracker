import React, { useId, useState } from 'react';
import { Check, MessageCircleQuestionMark, SlidersHorizontal } from 'lucide-react';
import {
  RatingAnswers,
  RatingQuestion,
  isComplete,
  scoreAnswers,
} from '../lib/ratingQuestions';
import { MAX_RATING, formatRating, ratingColor } from '../lib/rating';
import { RatingControl } from './Rating';
import { Button } from './ui';
import { cn } from '../lib/cn';

interface GuidedRatingProps {
  /** The field label, set in the same row style as every other field. */
  label: string;
  questions: RatingQuestion[];
  value: number;
  onChange: (next: number) => void;
  /** Help text under the control, where every other field keeps its own. */
  description?: string;
}

/**
 * A rating field that can also be answered as a questionnaire.
 *
 * The slider is what shows by default: most of the time you know the number,
 * and a form that insists on six questions first is in the way. "Answer
 * questions" sits in the label row, where a field keeps its one action, and
 * hands back to the slider with the computed score already in place — the
 * suggestion is a starting point, so disagreeing with it costs one drag.
 */
export const GuidedRating: React.FC<GuidedRatingProps> = ({
  label,
  questions,
  value,
  onChange,
  description,
}) => {
  const id = useId();
  const helpId = `${id}-help`;
  const [answers, setAnswers] = useState<RatingAnswers>({});
  const [asking, setAsking] = useState(false);

  const answered = isComplete(questions, answers);
  const preview = scoreAnswers(questions, answers);

  const submit = () => {
    onChange(preview);
    setAsking(false);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="eyebrow text-gray-700">
          {label}
        </label>
        {/* Text-sized rather than a full button, so this label row stays the
            same height as the plain label in the column beside it. */}
        <button
          type="button"
          onClick={() => {
            if (asking) {
              setAsking(false);
            } else {
              setAnswers({});
              setAsking(true);
            }
          }}
          className="eyebrow flex items-center gap-1 text-accent-900 transition-colors hover:text-accent-1000"
        >
          {asking ? <SlidersHorizontal size={11} /> : <MessageCircleQuestionMark size={11} />}
          {asking ? 'Set it myself' : 'Answer questions'}
        </button>
      </div>

      {asking ? (
        <div className="space-y-3 rounded-md border border-gray-300 bg-black/25 p-3">
          {questions.map((question) => (
            <fieldset key={question.id}>
              <legend className="mb-1.5 text-75 font-semibold text-gray-800">
                {question.prompt}
              </legend>
              <div className="flex flex-wrap gap-1.5">
                {question.choices.map((choice) => {
                  const selected = answers[question.id] === choice.id;
                  return (
                    <button
                      key={choice.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        setAnswers((prev) => ({ ...prev, [question.id]: choice.id }))
                      }
                      className={cn(
                        'rounded-sm border px-2.5 py-1.5 text-75 font-medium transition-colors',
                        selected
                          ? 'border-accent-700/60 bg-accent-700/16 text-accent-900'
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
                  </span>
                </>
              ) : (
                'Answer each question for a suggested score.'
              )}
            </span>

            <Button variant="accent" size="s" onClick={submit} disabled={!answered}>
              <Check size={12} />
              Use this score
            </Button>
          </div>
        </div>
      ) : (
        <RatingControl
          id={id}
          value={value}
          onChange={onChange}
          aria-describedby={description ? helpId : undefined}
        />
      )}

      {description ? (
        <p id={helpId} className="text-50 text-gray-600">
          {description}
        </p>
      ) : null}
    </div>
  );
};
