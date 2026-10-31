import { CompactCalendar } from './CompactCalendar';
import { TodayGuests } from './TodayGuests';

/** Prototype `#staff-left-col` (Calendar + Today's Guests). Hidden after a guest login. */
export function StaffLeftColumn() {
  return (
    <div className="w-full lg:w-[420px] xl:w-[450px] flex flex-col gap-3 shrink-0 h-full overflow-hidden">
      <CompactCalendar />
      <TodayGuests />
    </div>
  );
}
