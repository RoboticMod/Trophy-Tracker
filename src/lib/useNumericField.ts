import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';

/** An empty box means zero to the model, which is what lets it stay empty. */
const parseDraft = (draft: string): number => (draft.trim() === '' ? 0 : Number(draft));

/**
 * Props for a controlled number input that can actually be emptied.
 *
 * Binding a number straight to an `<input type="number">` makes clearing it
 * impossible: the empty string parses to 0, which is written back to state and
 * redrawn as "0". Entering 12 then means typing "012" and deleting the leading
 * zero afterwards — painful anywhere, worse on a phone keyboard.
 *
 * The draft string is what the field shows. It is only replaced when the
 * incoming value disagrees with what the draft already means, so an emptied box
 * stays empty while outside changes — the steppers, "Set to 100%" — still land.
 * Deliberately not keyed on focus: a field can be written to without ever
 * receiving a focus event, and a missed one would bring the stray zero back.
 */
export function useNumericField(value: number, onValueChange: (next: number) => void) {
  const [draft, setDraft] = useState(() => String(value));

  useEffect(() => {
    setDraft((current) => (parseDraft(current) === value ? current : String(value)));
  }, [value]);

  return {
    value: draft,
    onBlur: () => setDraft(String(value)),
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value;
      setDraft(raw);

      const parsed = parseDraft(raw);
      if (!Number.isNaN(parsed)) onValueChange(parsed);
    },
  };
}
