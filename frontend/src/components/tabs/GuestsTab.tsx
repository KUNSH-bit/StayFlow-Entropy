import { useMemo, useState, type FormEvent } from 'react';
import { useHotel } from '@/store/HotelStore';

const INPUT = 'px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs';

export function GuestsTab() {
  const { guests, guestRequests, currentSession, createGuest, updateGuest, deleteGuest, createGuestRequest, sendGuestEmail, updateGuestRequest, dataLoading } = useHotel();
  const [query, setQuery] = useState('');
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [guestId, setGuestId] = useState('');
  const [kind, setKind] = useState('General query');
  const [details, setDetails] = useState('');
  const canOperate = ['OWNER', 'MANAGER', 'FRONT_DESK'].includes(currentSession?.membershipRole ?? '');
  const canManageGuests = ['OWNER', 'MANAGER'].includes(currentSession?.membershipRole ?? '');
  const filteredGuests = useMemo(() => guests.filter((guest) => `${guest.name} ${guest.email}`.toLowerCase().includes(query.toLowerCase())), [guests, query]);

  function submitGuest(event: FormEvent) {
    event.preventDefault();
    void createGuest({ name: name.trim(), email: email.trim(), ...(phone.trim() ? { phone: phone.trim() } : {}) });
    setName(''); setEmail(''); setPhone(''); setShowGuestForm(false);
  }
  function submitRequest(event: FormEvent) {
    event.preventDefault();
    const guest = guests.find((item) => item.id === guestId);
    if (!guest) return;
    void createGuestRequest({ guestName: guest.name, guestEmail: guest.email, kind, ...(details.trim() ? { details: details.trim() } : {}) });
    setDetails('');
  }

  return <div className="h-full flex-col gap-3 overflow-y-auto pr-1 flex">
    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-sm font-bold text-gray-900 dark:text-white">Guests &amp; customer requests</h2><p className="text-xs text-gray-400">Guest records and service requests are scoped to this hotel.</p></div>
      {canOperate && <button type="button" onClick={() => setShowGuestForm((visible) => !visible)} className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-semibold">{showGuestForm ? 'Cancel' : '+ Add guest'}</button>}
    </div>

    {showGuestForm && <form onSubmit={submitGuest} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
      <label className="text-[11px] text-gray-500">Full name<input required minLength={2} maxLength={255} value={name} onChange={(event) => setName(event.target.value)} className={`${INPUT} block w-full mt-1`} /></label>
      <label className="text-[11px] text-gray-500">Email<input required type="email" maxLength={255} value={email} onChange={(event) => setEmail(event.target.value)} className={`${INPUT} block w-full mt-1`} /></label>
      <label className="text-[11px] text-gray-500">Phone (optional)<input maxLength={50} value={phone} onChange={(event) => setPhone(event.target.value)} className={`${INPUT} block w-full mt-1`} /></label>
      <button type="submit" disabled={dataLoading} className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold disabled:opacity-50">Save guest</button>
    </form>}

    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 min-h-0">
      <section className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-3"><h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Guest directory ({guests.length})</h3><input type="search" aria-label="Search guests" placeholder="Search name or email" value={query} onChange={(event) => setQuery(event.target.value)} className={`${INPUT} w-44`} /></div>
        {filteredGuests.length === 0 ? <p className="text-xs text-gray-400 text-center py-5">{guests.length ? 'No guests match this search.' : 'Guest records are added when you create a reservation.'}</p> : <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {filteredGuests.map((guest) => <GuestCard key={guest.id} guest={guest} canManage={canOperate} canDelete={canManageGuests} onSave={(changes) => updateGuest(guest.id, changes)} onDelete={() => deleteGuest(guest.id)} onEmail={(subject, text) => sendGuestEmail(guest.id, subject, text)} />)}
        </div>}
      </section>

      <section className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Customer queries</h3>
        {canOperate && guests.length > 0 && <form onSubmit={submitRequest} className="mb-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 grid grid-cols-2 gap-2">
          <label className="text-[10px] text-gray-500">Guest<select required value={guestId} onChange={(event) => setGuestId(event.target.value)} className={`${INPUT} block w-full mt-1`}><option value="">Select guest</option>{guests.map((guest) => <option key={guest.id} value={guest.id}>{guest.name}</option>)}</select></label>
          <label className="text-[10px] text-gray-500">Category<select value={kind} onChange={(event) => setKind(event.target.value)} className={`${INPUT} block w-full mt-1`}><option>General query</option><option>Housekeeping</option><option>Room service</option><option>Transport</option><option>Billing</option><option>Late checkout</option></select></label>
          <label className="col-span-2 text-[10px] text-gray-500">Request details<textarea maxLength={4000} rows={2} value={details} onChange={(event) => setDetails(event.target.value)} className={`${INPUT} block w-full mt-1`} /></label>
          <button type="submit" disabled={!guestId || dataLoading} className="col-span-2 px-3 py-2 rounded-lg bg-brand-600 text-white text-xs font-semibold disabled:opacity-50">Log customer request</button>
        </form>}
        {guestRequests.length === 0 ? <p className="text-xs text-gray-400 text-center py-5">No customer requests have been recorded.</p> : <div className="space-y-2 max-h-[48vh] overflow-y-auto">
          {guestRequests.map((request) => <div key={request.id} className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 flex items-start justify-between gap-3 text-xs"><div><p className="font-semibold text-gray-800 dark:text-gray-100">{request.kind} · {request.guest.name}</p><p className="text-[10px] text-gray-400">{request.guest.email} · {new Date(request.createdAt).toLocaleString()}</p>{request.details && <p className="mt-1 text-gray-500">{request.details}</p>}</div>{canOperate && request.status !== 'COMPLETED' && request.status !== 'CANCELLED' ? <button type="button" onClick={() => void updateGuestRequest(request.id, request.status === 'OPEN' ? 'IN_PROGRESS' : 'COMPLETED')} className="shrink-0 px-2 py-1 rounded bg-brand-600 text-white text-[10px]">{request.status === 'OPEN' ? 'Start' : 'Complete'}</button> : <span className="shrink-0 text-[10px] text-gray-500">{request.status.replace(/_/g, ' ')}</span>}</div>)}
        </div>}
      </section>
    </div>
  </div>;
}

function GuestCard({ guest, canManage, canDelete, onSave, onDelete, onEmail }: { guest: { id: string; name: string; email: string; phone: string | null }; canManage: boolean; canDelete: boolean; onSave: (changes: { name: string; email: string; phone: string | null }) => void; onDelete: () => void; onEmail: (subject: string, text: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [name, setName] = useState(guest.name);
  const [email, setEmail] = useState(guest.email);
  const [phone, setPhone] = useState(guest.phone ?? '');
  function submit(event: FormEvent) { event.preventDefault(); onSave({ name: name.trim(), email: email.trim(), phone: phone.trim() || null }); setEditing(false); }
  function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const subject = String(form.get('subject') ?? '').trim();
    const text = String(form.get('text') ?? '').trim();
    onEmail(subject, text);
    setEmailOpen(false);
  }
  if (editing) return <form onSubmit={submit} className="p-3 rounded-xl border border-brand-200 dark:border-brand-800 grid grid-cols-1 gap-2"><input required value={name} onChange={(event) => setName(event.target.value)} className={INPUT} aria-label="Guest name" /><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={INPUT} aria-label="Guest email" /><input value={phone} onChange={(event) => setPhone(event.target.value)} className={INPUT} aria-label="Guest phone" /><div className="flex justify-end gap-2"><button type="button" onClick={() => setEditing(false)} className="px-2 py-1 text-xs text-gray-500">Cancel</button><button className="px-2 py-1 rounded bg-brand-600 text-white text-xs">Save</button></div></form>;
  return <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 text-xs"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{guest.name}</p><p className="text-[10px] text-gray-400 truncate">{guest.email}{guest.phone ? ` · ${guest.phone}` : ''}</p></div>{(canManage || canDelete) && <div className="flex gap-2 shrink-0">{canManage && <><button type="button" onClick={() => setEmailOpen((open) => !open)} className="text-indigo-600 text-[10px]">Email</button><button type="button" onClick={() => setEditing(true)} className="text-brand-600 text-[10px]">Edit</button></>}{canDelete && <button type="button" onClick={() => { if (window.confirm('Delete this guest record?')) onDelete(); }} className="text-red-600 text-[10px]">Delete</button>}</div>}</div>{emailOpen && canManage && <form onSubmit={submitEmail} className="mt-3 grid grid-cols-1 gap-2"><input name="subject" required maxLength={500} placeholder="Subject" className={INPUT} /><textarea name="text" required maxLength={20000} rows={3} placeholder="Message" className={INPUT} /><div className="flex justify-end gap-2"><button type="button" onClick={() => setEmailOpen(false)} className="px-2 py-1 text-xs text-gray-500">Cancel</button><button className="px-2 py-1 rounded bg-indigo-600 text-white text-xs">Send email</button></div></form>}</div>;
}
