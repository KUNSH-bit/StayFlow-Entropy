import { useHotel } from '@/store/HotelStore';

/** Prototype "Today's Reservations Widget" (`renderTodayGuests`, `filterTodayGuests`, check-in/out buttons). */
export function TodayGuests() {
  const { reservations, dashboard, todayFilter, filterTodayGuests, handleCheckIn, handleCheckOut } = useHotel();
  const today = dashboard?.hotel.today;
  const arrivals = reservations.filter((reservation) => reservation.checkIn === today && ['Confirmed', 'Pending'].includes(reservation.status));
  const departures = reservations.filter((reservation) => reservation.checkOut === today && reservation.status === 'Checked In');
  const filtered = todayFilter === 'checkin' ? arrivals : todayFilter === 'checkout' ? departures : [...arrivals, ...departures.filter((item) => !arrivals.some((arrival) => arrival.id === item.id))];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-3.5 shadow-sm border border-gray-200 dark:border-gray-700 flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
          <i className="fa-solid fa-clipboard-check text-brand-500"></i>
          <span>Today's Arrivals &amp; Departures</span>
        </h3>
      </div>

      <div className="flex gap-1.5 mb-2 border-b border-gray-100 dark:border-gray-700 pb-2">
        <button type="button" onClick={() => filterTodayGuests('all')} className="text-[11px] px-2 py-0.5 rounded bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300 font-medium">
          All
        </button>
        <button type="button" onClick={() => filterTodayGuests('checkin')} className="text-[11px] px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-200">
          Check-In
        </button>
        <button type="button" onClick={() => filterTodayGuests('checkout')} className="text-[11px] px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-200">
          Check-Out
        </button>
      </div>

      <div className="space-y-2 overflow-y-auto flex-1 pr-1">
        {filtered.length === 0 && <p className="text-[11px] text-gray-400 text-center py-5">No arrivals or departures scheduled for today.</p>}
        {filtered.map((res) => {
          const isCheckedIn = res.status === 'Checked In';
          const isArrival = res.checkIn === today && !isCheckedIn;
          const isDeparture = res.checkOut === today && isCheckedIn;
          return (
            <div key={res.id} className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2.5">
                <div className={`w-2 h-8 ${isCheckedIn ? 'bg-blue-500' : 'bg-emerald-500'} rounded-full`}></div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-100">
                    {res.guest} <span className="text-gray-400 font-normal">(Rm {res.room})</span>
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    {res.checkIn} &rarr; {res.checkOut}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                {isArrival ? (
                  <button type="button" onClick={() => handleCheckIn(res.id)} className="px-2 py-1 bg-emerald-600 text-white text-[10px] rounded font-bold hover:bg-emerald-700">
                    Check-In
                  </button>
                ) : isDeparture ? (
                  <button type="button" onClick={() => handleCheckOut(res.id)} className="px-2 py-1 bg-amber-600 text-white text-[10px] rounded font-bold hover:bg-amber-700">
                    Check-Out
                  </button>
                ) : <span className="text-[10px] text-gray-400">In house</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
