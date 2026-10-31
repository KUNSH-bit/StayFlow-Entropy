import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/api';
import { useHotel } from '@/store/HotelStore';

export function BookingsTab() {
  const { reservations, openAddModal, openEditBooking, cancelBooking, currentSession, dataLoading } = useHotel();
  const canOperate = ['OWNER', 'MANAGER', 'FRONT_DESK'].includes(currentSession?.membershipRole ?? '');
  const canManageIntegrations = ['OWNER', 'MANAGER'].includes(currentSession?.membershipRole ?? '');
  return (
    <div className="h-full flex-col gap-3 overflow-y-auto pr-1 flex">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex justify-between items-center gap-3">
        <div><h2 className="text-sm font-bold text-gray-900 dark:text-white">Reservations</h2><p className="text-xs text-gray-400">Room availability is checked for each stay before it is saved.</p></div>
        {canOperate && <button type="button" onClick={() => openAddModal()} className="bg-brand-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium">+ Add booking</button>}
      </div>
      <CalendarSettings canManage={canManageIntegrations} />
      {dataLoading && reservations.length === 0 && <p className="text-xs text-gray-500 p-4">Loading reservations…</p>}
      {!dataLoading && reservations.length === 0 && <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 text-center text-sm text-gray-500">No bookings yet. Add a room and create your first reservation.</div>}
      <div className="space-y-2">
        {reservations.map((reservation) => {
          const active = ['Confirmed', 'Pending'].includes(reservation.status);
          const badge = reservation.status === 'Checked In' ? 'bg-blue-100 text-blue-800' : reservation.status === 'Cancelled' ? 'bg-gray-100 text-gray-600' : reservation.status === 'Checked Out' ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800';
          return <div key={reservation.id} className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between gap-3 text-xs">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap"><span className="font-bold text-gray-900 dark:text-white">{reservation.guest}</span><span className="text-gray-400">{reservation.id.slice(0, 8)}</span></div>
              <p className="text-[11px] text-gray-400">Room {reservation.room} · {reservation.checkIn} to {reservation.checkOut} · {reservation.guestsCount} guest(s)</p>
              {reservation.specialReq && <p className="text-[10px] text-gray-500 mt-1">Note: {reservation.specialReq}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${badge}`}>{reservation.status}</span>{canOperate && active && <><button type="button" onClick={() => openEditBooking(reservation.id)} className="px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 text-[10px]">Edit</button><button type="button" onClick={() => void cancelBooking(reservation.id)} className="px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 text-[10px]">Cancel</button></>}</div>
          </div>;
        })}
      </div>
    </div>
  );
}

function CalendarSettings({ canManage }: { canManage: boolean }) {
  const { showToast } = useHotel();
  const [googleConfigured, setGoogleConfigured] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [feedUrl, setFeedUrl] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    apiGet<{ configured: boolean; connected: boolean }>('/integrations/google-calendar').then((status) => {
      if (active) { setGoogleConfigured(status.configured); setGoogleConnected(status.connected); }
    }).catch((error: unknown) => { if (active) showToast(error instanceof Error ? error.message : 'Could not load calendar status.'); });
    return () => { active = false; };
  }, [showToast]);
  async function connectGoogle() {
    setBusy(true);
    try {
      const result = await apiPost<{ authorizationUrl: string }>('/integrations/google-calendar/connect');
      window.location.assign(result.authorizationUrl);
    } catch (error) { showToast(error instanceof Error ? error.message : 'Could not start Google Calendar authorization.'); }
    finally { setBusy(false); }
  }
  async function syncGoogle() {
    setBusy(true);
    try {
      const result = await apiPost<{ synced: number; removed: number }>('/integrations/google-calendar/sync');
      showToast(`Calendar synced: ${result.synced} reservation(s), ${result.removed} cancelled event(s) removed.`);
    } catch (error) { showToast(error instanceof Error ? error.message : 'Calendar sync failed.'); }
    finally { setBusy(false); }
  }
  async function createFeed() {
    setBusy(true);
    try {
      const result = await apiPost<{ url: string }>('/integrations/calendar/feed-token');
      setFeedUrl(result.url);
      showToast('A new private iCalendar feed link was created.');
    } catch (error) { showToast(error instanceof Error ? error.message : 'Could not create the calendar feed.'); }
    finally { setBusy(false); }
  }
  return <section className="bg-white dark:bg-gray-800 p-3 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
    <div><h3 className="font-bold text-gray-800 dark:text-gray-100">Calendar integrations</h3><p className="text-[10px] text-gray-400">{googleConnected ? 'Google Calendar connected' : googleConfigured ? 'Google Calendar ready to connect' : 'Google OAuth credentials are not configured'} · iCalendar feed available</p>
      {feedUrl && <p className="mt-1 max-w-xl break-all text-[10px] text-blue-700 dark:text-blue-300">Private feed: <a className="underline" href={feedUrl} target="_blank" rel="noreferrer">{feedUrl}</a><button type="button" onClick={() => {
        if (!navigator.clipboard) { showToast('Copy the private feed link from this field.'); return; }
        void navigator.clipboard.writeText(feedUrl).then(() => showToast('Feed link copied.')).catch(() => showToast('Copy the private feed link from this field.'));
      }} className="ml-2 underline">Copy</button></p>}
    </div>
    {canManage && <div className="flex flex-wrap gap-2"><button type="button" disabled={busy || !googleConfigured} onClick={() => void (googleConnected ? syncGoogle() : connectGoogle())} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white disabled:opacity-50">{googleConnected ? 'Sync Google Calendar' : 'Connect Google Calendar'}</button><button type="button" disabled={busy} onClick={() => void createFeed()} className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 disabled:opacity-50">Create / rotate iCalendar link</button></div>}
  </section>;
}
