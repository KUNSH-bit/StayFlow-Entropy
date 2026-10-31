import { useHotel } from '@/store/HotelStore';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Prototype "Compact Calendar Card" (`renderCalendar`, `createCompactDayCell`, month navigation). */
export function CompactCalendar() {
  const { currentDate, reservations, dashboard, prevMonth, nextMonth, goToday, openAddModal } = useHotel();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();
  const todayKey = dashboard?.hotel.today ?? new Date().toISOString().slice(0, 10);

  const cells = [];
  for (let x = firstDayIndex; x > 0; x--) {
    cells.push(
      <button key={`p${x}`} type="button" className="h-8 rounded-xl flex flex-col items-center justify-center relative transition-all text-gray-300 dark:text-gray-600 cursor-default">
        <span className="text-xs leading-none">{prevMonthDays - x + 1}</span>
      </button>,
    );
  }
  for (let day = 1; day <= totalDaysInMonth; day++) {
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = dateString === todayKey;
    const hasRes = reservations.some((reservation) => reservation.status !== 'Cancelled' && reservation.checkIn <= dateString && reservation.checkOut >= dateString);
    cells.push(
      <button
        key={dateString}
        type="button"
        onClick={() => openAddModal(dateString)}
        className={`h-8 rounded-xl flex flex-col items-center justify-center relative transition-all ${
          isToday ? 'bg-brand-600 text-white font-bold shadow-md shadow-brand-500/20' : 'hover:bg-gray-100 dark:hover:bg-gray-700/60 text-gray-700 dark:text-gray-200'
        }`}
      >
        <span className="text-xs leading-none">{day}</span>
        {hasRes && <span className={`w-1.5 h-1.5 rounded-full mt-1 ${isToday ? 'bg-white' : 'bg-brand-500'}`}></span>}
      </button>,
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-3.5 shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col shrink-0">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-base font-bold tracking-tight text-gray-900 dark:text-white">
            {MONTH_NAMES[month]} {year}
          </h1>
        </div>

        <div className="flex items-center space-x-1.5">
          <button type="button" onClick={goToday} className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-brand-50 dark:bg-brand-900/40 text-brand-600 dark:text-brand-300 border border-brand-200 dark:border-brand-700/50 hover:bg-brand-100 transition-colors">
            Today
          </button>
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-md p-0.5">
            <button type="button" onClick={prevMonth} className="p-1 hover:bg-white dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-200 text-xs transition-all" title="Previous Month">
              <i className="fa-solid fa-chevron-left"></i>
            </button>
            <button type="button" onClick={nextMonth} className="p-1 hover:bg-white dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-200 text-xs transition-all" title="Next Month">
              <i className="fa-solid fa-chevron-right"></i>
            </button>
          </div>
          <button
            type="button"
            onClick={() => openAddModal(todayKey)}
            className="bg-brand-600 hover:bg-brand-700 text-white px-2 py-1 rounded-md flex items-center gap-1 text-xs font-semibold transition-all shadow-sm"
            title="New Reservation"
          >
            <i className="fa-solid fa-plus"></i> Booking
          </button>
        </div>
      </div>

      {/* Days Header */}
      <div className="grid grid-cols-7 text-center py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
        <div>Su</div>
        <div>Mo</div>
        <div>Tu</div>
        <div>We</div>
        <div>Th</div>
        <div>Fr</div>
        <div>Sa</div>
      </div>

      {/* Compact Days Grid */}
      <div className="grid grid-cols-7 gap-1 text-xs">{cells}</div>
    </div>
  );
}
