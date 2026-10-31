import { useEffect, useState, type FormEvent } from 'react';
import { apiGet, apiPatch } from '@/api';
import { useHotel } from '@/store/HotelStore';

const INPUT = 'px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs';

export function RoomsTab() {
  const { rooms, roomsFilter, filterRooms, updateRoomStatus, createRoom, currentSession, memberships, activeHotelId, dataLoading, refreshData, showToast } = useHotel();
  const [showForm, setShowForm] = useState(false);
  const [roomNumber, setRoomNumber] = useState('');
  const [type, setType] = useState('Standard');
  const [rate, setRate] = useState('2500');
  const [capacity, setCapacity] = useState('2');
  const list = roomsFilter !== 'all' ? rooms.filter((room) => room.status === roomsFilter) : rooms;
  const canManage = ['OWNER', 'MANAGER', 'FRONT_DESK'].includes(currentSession?.membershipRole ?? '');
  const canManageRoomTypes = ['OWNER', 'MANAGER'].includes(currentSession?.membershipRole ?? '');
  const currency = memberships.find((membership) => membership.hotelId === activeHotelId)?.currency ?? 'INR';

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void createRoom({ roomNumber: roomNumber.trim(), type: type.trim(), rate: Number(rate), maxCapacity: Number(capacity) });
    setRoomNumber('');
    setShowForm(false);
  }

  return (
    <div className="h-full flex-col gap-3 overflow-y-auto pr-1 flex">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Room Inventory &amp; Status</h2>
          <p className="text-xs text-gray-400">Manage rooms, room types, nightly pricing, and housekeeping status.</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {['all', 'Available', 'Occupied', 'Cleaning', 'Maintenance'].map((status) => (
            <button key={status} type="button" onClick={() => filterRooms(status)} className={`text-xs px-2.5 py-1 rounded-lg font-medium ${roomsFilter === status ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
              {status === 'all' ? 'All' : status}
            </button>
          ))}
          {canManage && <button type="button" onClick={() => setShowForm((visible) => !visible)} className="text-xs px-3 py-1.5 rounded-lg bg-brand-600 text-white font-semibold">{showForm ? 'Cancel' : '+ Add room'}</button>}
        </div>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
          <label className="text-[11px] text-gray-500">Room number<input required maxLength={50} value={roomNumber} onChange={(event) => setRoomNumber(event.target.value)} className={`${INPUT} block w-full mt-1`} /></label>
          <label className="text-[11px] text-gray-500">Room type<input required maxLength={100} value={type} onChange={(event) => setType(event.target.value)} className={`${INPUT} block w-full mt-1`} /></label>
          <label className="text-[11px] text-gray-500">Nightly rate<input required type="number" min="0.01" step="0.01" value={rate} onChange={(event) => setRate(event.target.value)} className={`${INPUT} block w-full mt-1`} /></label>
          <label className="text-[11px] text-gray-500">Max guests<input required type="number" min="1" max="20" value={capacity} onChange={(event) => setCapacity(event.target.value)} className={`${INPUT} block w-full mt-1`} /></label>
          <button disabled={dataLoading} type="submit" className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold disabled:opacity-50">Save room</button>
        </form>
      )}

      <RoomTypePricing canManage={canManageRoomTypes} onRefresh={refreshData} onError={showToast} />

      {dataLoading && rooms.length === 0 && <p className="text-sm text-gray-500 p-4">Loading room inventory…</p>}
      {!dataLoading && list.length === 0 && <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 text-center text-sm text-gray-500">{rooms.length === 0 ? 'No rooms yet. Add the first room to start taking reservations.' : 'No rooms match this filter.'}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {list.map((room) => {
          let badgeClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300';
          if (room.status === 'Occupied') badgeClass = 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300';
          if (room.status === 'Cleaning') badgeClass = 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300';
          if (room.status === 'Maintenance') badgeClass = 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300';
          return (
            <div key={room.id} className="bg-white dark:bg-gray-800 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2"><span className="text-base font-bold text-gray-900 dark:text-white">Room {room.roomNumber}</span><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>{room.status}</span></div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{room.type}</p>
                <p className="text-xs font-bold text-brand-600 dark:text-brand-400 mt-1">{currency} {room.rate.toLocaleString()} / night</p>
                {room.guest && <p className="text-xs text-gray-700 dark:text-gray-300 mt-2"><i className="fa-solid fa-user text-xs mr-1 text-gray-400"></i>{room.guest}</p>}
              </div>
              <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <span className="text-[10px] text-gray-400">Clean: {room.cleanStatus}</span>
                {canManage ? <select value={room.status} aria-label={`Status of room ${room.roomNumber}`} onChange={(event) => void updateRoomStatus(room.id, event.target.value)} className="text-[11px] bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded px-1.5 py-0.5 border-none">
                  {['Available', 'Reserved', 'Occupied', 'Cleaning', 'Maintenance'].map((status) => <option key={status} value={status}>{status}</option>)}
                </select> : <span className="text-[10px] text-gray-400">Read only</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface RoomTypeRow { id: string; name: string; basePrice: number; maxCapacity: number; roomCount: number }

function RoomTypePricing({ canManage, onRefresh, onError }: { canManage: boolean; onRefresh: () => Promise<void>; onError: (message: string) => void }) {
  const [types, setTypes] = useState<RoomTypeRow[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    apiGet<{ roomTypes: RoomTypeRow[] }>('/room-types').then((result) => { if (active) setTypes(result.roomTypes); }).catch((error: unknown) => { if (active) onError(error instanceof Error ? error.message : 'Could not load room types.'); });
    return () => { active = false; };
  }, [onError]);
  async function save(typeId: string, changes: { basePrice: number; maxCapacity: number }) {
    setLoading(true);
    try {
      const result = await apiPatch<{ roomType: RoomTypeRow }>(`/room-types/${encodeURIComponent(typeId)}`, changes);
      setTypes((current) => current.map((type) => type.id === typeId ? { ...type, ...result.roomType } : type));
      await onRefresh();
      onError('Room type pricing and capacity updated.');
    } catch (error) { onError(error instanceof Error ? error.message : 'Could not update the room type.'); }
    finally { setLoading(false); }
  }
  return <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
    <button type="button" onClick={() => setIsOpen((open) => !open)} className="w-full p-3 flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-200"><span>Shared room types &amp; pricing ({types.length})</span><i className={`fa-solid ${isOpen ? 'fa-chevron-up' : 'fa-chevron-down'} text-gray-400`}></i></button>
    {isOpen && <div className="px-3 pb-3 space-y-2">{types.length === 0 ? <p className="text-[11px] text-gray-400">Room types are created when you add a room.</p> : types.map((type) => <RoomTypePriceCard key={type.id} type={type} canManage={canManage} disabled={loading} onSave={(changes) => void save(type.id, changes)} />)}</div>}
  </section>;
}

function RoomTypePriceCard({ type, canManage, disabled, onSave }: { type: RoomTypeRow; canManage: boolean; disabled: boolean; onSave: (changes: { basePrice: number; maxCapacity: number }) => void }) {
  const [basePrice, setBasePrice] = useState(String(type.basePrice));
  const [maxCapacity, setMaxCapacity] = useState(String(type.maxCapacity));
  useEffect(() => { setBasePrice(String(type.basePrice)); setMaxCapacity(String(type.maxCapacity)); }, [type.basePrice, type.maxCapacity]);
  return <form onSubmit={(event) => { event.preventDefault(); onSave({ basePrice: Number(basePrice), maxCapacity: Number(maxCapacity) }); }} className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end border-t border-gray-100 dark:border-gray-700 pt-2">
    <div className="text-xs font-semibold text-gray-800 dark:text-gray-100">{type.name}<p className="text-[10px] text-gray-400 font-normal">{type.roomCount} room(s)</p></div>
    <label className="text-[10px] text-gray-500">Nightly rate<input disabled={!canManage} required type="number" min="0.01" step="0.01" value={basePrice} onChange={(event) => setBasePrice(event.target.value)} className="block w-full mt-1 px-2 py-1.5 rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-70" /></label>
    <label className="text-[10px] text-gray-500">Max guests<input disabled={!canManage} required type="number" min="1" max="20" value={maxCapacity} onChange={(event) => setMaxCapacity(event.target.value)} className="block w-full mt-1 px-2 py-1.5 rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-70" /></label>
    {canManage ? <button disabled={disabled} type="submit" className="col-span-2 md:col-span-1 px-2 py-1.5 rounded bg-brand-600 text-white text-[10px] disabled:opacity-50">Save type</button> : <span className="col-span-2 md:col-span-1 text-[10px] text-gray-400">Read only</span>}
  </form>;
}
