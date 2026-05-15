import './DateChipList.css';
import { toDateKey } from '~/ui/helpers/utils/scheduleUtils';

interface DateChipListProps {
  labels: string[];
  todayKey?: string;
  emptyText?: string;
  className?: string;
}

const DateChipList = ({ labels, todayKey, emptyText = 'No time selected', className = '' }: DateChipListProps) => {
  const activeTodayKey = todayKey || toDateKey(new Date());

  if (labels.length === 0) {
    return <span className={`date-chip-empty ${className}`}>{emptyText}</span>;
  }

  return (
    <div className={`date-chip-list ${className}`}>
      {labels.map((label) => (
        <span key={label} className={`date-chip ${label === activeTodayKey ? 'today' : ''}`}>
          {label}
        </span>
      ))}
    </div>
  );
};

export default DateChipList;
