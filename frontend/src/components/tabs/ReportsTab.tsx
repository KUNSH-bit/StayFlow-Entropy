import { useEffect, useState } from 'react';
import { apiGet } from '@/api';
import { useHotel } from '@/store/HotelStore';

interface ReportPayload {
  occupancy: Array<{ date: string; occupiedRooms: number; occupancyRate: number }>;
  revenue: Array<{ date: string; amount: number }>;
  totals: { bookings: number; roomNights: number; revenue: number };
}

function dateKey(date: Date) { return date.toISOString().slice(0, 10); }

export function ReportsTab() {
  const { dashboard, showToast } = useHotel();
  const today = dashboard?.hotel.today ?? dateKey(new Date());
  const [to, setTo] = useState(today);
  const [from, setFrom] = useState(() => {
    const start = new Date(`${today}T00:00:00.000Z`);
    start.setUTCDate(start.getUTCDate() - 6);
    return dateKey(start);
  });
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const currency = dashboard?.hotel.currency ?? 'INR';
  useEffect(() => {
    let active = true;
    setLoading(true);
    apiGet<ReportPayload>(`/reports?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`).then((result) => { if (active) setReport(result); }).catch((error: unknown) => { if (active) showToast(error instanceof Error ? error.message : 'Could not load the report.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [from, showToast, to]);
  const maximumRevenue = Math.max(1, ...(report?.revenue.map((item) => item.amount) ?? [0]));
  const maximumOccupancy = Math.max(1, ...(report?.occupancy.map((item) => item.occupancyRate) ?? [0]));
  function money(value: number) {
    try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(value); }
    catch { return `${currency} ${value.toFixed(0)}`; }
  }
  return <div className="h-full flex-col gap-3 overflow-y-auto pr-1 flex">
    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-wrap items-end justify-between gap-3">
      <div><h2 className="text-sm font-bold text-gray-900 dark:text-white">Revenue &amp; occupancy reports</h2><p className="text-xs text-gray-400">Payments received and rooms reserved by day.</p></div>
      <div className="flex gap-2"><label className="text-[10px] text-gray-500">From<input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} className="block mt-1 px-2 py-1.5 rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></label><label className="text-[10px] text-gray-500">To<input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} className="block mt-1 px-2 py-1.5 rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></label></div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><ReportMetric title="Payments received" value={money(report?.totals.revenue ?? 0)} /><ReportMetric title="Room nights" value={String(report?.totals.roomNights ?? 0)} /><ReportMetric title="Reservations in range" value={String(report?.totals.bookings ?? 0)} /></div>
    {loading && !report && <p className="p-4 text-xs text-gray-400">Loading report…</p>}
    {report && <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      <section className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm"><h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Daily revenue</h3><div className="space-y-2">{report.revenue.map((item) => <div key={item.date} className="grid grid-cols-[84px_1fr_90px] gap-2 items-center text-[10px]"><span className="text-gray-500">{item.date.slice(5)}</span><div className="h-2 rounded bg-gray-100 dark:bg-gray-700 overflow-hidden"><div className="h-full bg-emerald-500 rounded" style={{ width: `${Math.min(100, item.amount / maximumRevenue * 100)}%` }} /></div><span className="text-right text-gray-600 dark:text-gray-300">{money(item.amount)}</span></div>)}</div></section>
      <section className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm"><h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Daily occupancy</h3><div className="space-y-2">{report.occupancy.map((item) => <div key={item.date} className="grid grid-cols-[84px_1fr_70px] gap-2 items-center text-[10px]"><span className="text-gray-500">{item.date.slice(5)}</span><div className="h-2 rounded bg-gray-100 dark:bg-gray-700 overflow-hidden"><div className="h-full bg-brand-500 rounded" style={{ width: `${Math.min(100, item.occupancyRate / maximumOccupancy * 100)}%` }} /></div><span className="text-right text-gray-600 dark:text-gray-300">{item.occupancyRate}%</span></div>)}</div></section>
    </div>}
    {loading && report && <p className="text-[10px] text-gray-400 text-right">Refreshing…</p>}
  </div>;
}

function ReportMetric({ title, value }: { title: string; value: string }) {
  return <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm"><p className="text-xs text-gray-400">{title}</p><p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{value}</p></div>;
}
