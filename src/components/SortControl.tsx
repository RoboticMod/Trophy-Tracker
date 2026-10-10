import { ArrowUpDown } from 'lucide-react';
import { GameSortOption, SORT_LABELS } from '../lib/sortGames';
import { PhoneHeaderAction } from '../lib/phoneHeader';
import { useIsPhone } from '../lib/useMediaQuery';
import { Select } from './ui';

/**
 * Every page's sort, in one place on every page.
 *
 * It sat somewhere different on each list — beside the title, in a row of
 * filters, under a "Sort" label, inside a list's own card — and on Playing a
 * phone had none at all. A phone now gets it as an icon in the fixed header,
 * opening a sheet; a wide screen as a pill at the trailing edge of the page
 * header. Pages render it in `PageHeader`'s `action` from md up, and anywhere
 * on a phone, where it portals into the header.
 */
export function SortControl<T extends GameSortOption>({
  id,
  value,
  onChange,
  options,
}: {
  id: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly T[];
}) {
  const phone = useIsPhone();
  const choices = options.map((option) => ({ value: option, label: SORT_LABELS[option] }));

  if (phone) {
    return (
      <PhoneHeaderAction>
        <Select
          id={id}
          aria-label="Sort by"
          value={value}
          onChange={onChange}
          options={choices}
          iconTrigger
          leading={<ArrowUpDown size={19} />}
        />
      </PhoneHeaderAction>
    );
  }

  return (
    <Select
      id={id}
      aria-label="Sort by"
      value={value}
      onChange={onChange}
      options={choices}
      leading={<ArrowUpDown size={15} className="text-accent-900" />}
      className="w-40"
    />
  );
}
