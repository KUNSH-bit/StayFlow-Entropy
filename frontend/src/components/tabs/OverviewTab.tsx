import { useHotel } from '@/store/HotelStore';

function money(value: number, currency: string) {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(value); }
  catch { return `${currency} ${value.toFixed(0)}`; }
}

export function OverviewTab() {
  const { rooms, reservations, invoices, staffMembers, dashboard, switchTab, openAddModal, dataLoading } = useHotel();
  const stats = dashboard?.stats;
  const currency = dashboard?.hotel.currency ?? 'INR';
  const available = rooms.filter((room) => room.status === 'Available').length;
  const occupied = rooms.filter((room) => room.status === 'Occupied').length;
  const cleaning = rooms.filter((room) => room.status === 'Cleaning').length;
  const upcoming = reservations.filter((booking) => booking.status === 'Confirmed' || booking.status === 'Checked In').slice(0, 6);

  return (
    <div className="h-full flex-col gap-3 overflow-y-auto pr-1 flex">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="text-sm font-bold text-gray-900 dark:text-white">Hotel dashboard</h2><p className="text-xs text-gray-400">Live figures for {dashboard?.hotel.name ?? 'your property'}{dashboard?.hotel.today ? ` · ${dashboard.hotel.today}` : ''}</p></div>
        <button type="button" onClick={() => void openAddModal()} className="px-3 py-2 rounded-lg bg-brand-600 text-white text-xs font-semibold">+ New reservation</button>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 shrink-0">
        <Metric label="Occupancy" value={`${stats?.occupancyRate ?? 0}%`} detail={`${occupied} of ${rooms.length} rooms occupied`} icon="fa-bed" tone="text-brand-500" />
        <Metric label="Payments this month" value={money(stats?.revenueThisMonth ?? 0, currency)} detail="Recorded payments" icon="fa-hand-holding-dollar" tone="text-emerald-500" />
        <Metric label="Outstanding balance" value={money(stats?.outstandingBalance ?? 0, currency)} detail={`${invoices.filter((invoice) => invoice.balance > 0).length} invoice(s) with a balance`} icon="fa-file-invoice-dollar" tone="text-amber-500" />
        <Metric label="Today's arrivals" value={String(stats?.arrivals ?? 0)} detail={`${stats?.departures ?? 0} departure(s) today`} icon="fa-calendar-check" tone="text-indigo-500" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <div className="xl:col-span-2 bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex justify-between items-center mb-3"><div><h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Reservations</h3><p className="text-[10px] text-gray-400 mt-0.5">Current and upcoming stays from the hotel database.</p></div><button type="button" onClick={() => switchTab('bookings')} className="text-xs text-brand-600 dark:text-brand-300 font-semibold">View all →</button></div>
          {upcoming.length === 0 ? <p className="py-6 text-center text-xs text-gray-400">No reservations yet. Create one after adding rooms.</p> : <div className="space-y-2">
            {upcoming.map((booking) => <div key={booking.id} className="flex items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700 last:border-0 pb-2 last:pb-0 text-xs">
              <div className="min-w-0"><p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{booking.guest} <span className="text-gray-400 font-normal">· Room {booking.room}</span></p><p className="text-[10px] text-gray-400">{booking.checkIn} → {booking.checkOut}</p></div>
              <span className="shrink-0 px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-[10px] text-gray-600 dark:text-gray-300">{booking.status}</span>
            </div>)}
          </div>}
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Room status</h3>
          <StatusLine label="Available" count={available} color="bg-emerald-500" total={rooms.length} />
          <StatusLine label="Occupied" count={occupied} color="bg-blue-500" total={rooms.length} />
          <StatusLine label="Housekeeping" count={cleaning} color="bg-amber-500" total={rooms.length} />
          <p className="text-[10px] text-gray-400 mt-auto pt-3">{stats?.openHousekeepingTasks ?? 0} open housekeeping task(s) · {staffMembers.filter((staff) => staff.status === 'Active').length} active staff</p>
          <button type="button" onClick={() => switchTab('rooms')} className="w-full py-2 bg-brand-50 dark:bg-brand-900/40 text-brand-600 dark:text-brand-300 rounded-xl text-xs font-bold hover:bg-brand-100 transition-colors mt-3">View room inventory →</button>
        </div>
      </div>
      {dataLoading && <p className="text-[10px] text-gray-400 text-right">Refreshing…</p>}
    </div>
  );
}

function Metric({ label, value, detail, icon, tone }: { label: string; value: string; detail: string; icon: string; tone: string }) {
  return <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm"><div className="flex justify-between items-center text-xs font-medium text-gray-400 mb-1"><span>{label}</span><i className={`fa-solid ${icon} ${tone}`}></i></div><p className="text-xl font-bold text-gray-900 dark:text-white truncate">{value}</p><span className="text-[10px] text-gray-400">{detail}</span></div>;
}

function StatusLine({ label, count, color, total }: { label: string; count: number; color: string; total: number }) {
  return <div className="flex items-center justify-between text-xs py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"><span className="flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-full ${color}`}></span>{label}</span><span className="font-bold text-gray-800 dark:text-gray-200">{count} / {total}</span></div>;
}
