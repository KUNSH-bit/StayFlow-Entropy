import type { FormEvent } from 'react';
import { useHotel, type BookingForm } from '@/store/HotelStore';

const INPUT = 'w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none text-xs';
const LABEL = 'block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1';

/** Prototype `#event-modal` (Booking / Event Modal, `openAddModal`, `closeModal`, `#event-form` submit). */
export function BookingModal() {
  const { modalHidden, modalShown, editingBookingId, bookingForm, setBookingForm, rooms, closeModal, submitBooking, dataLoading } = useHotel();

  const set = (k: keyof BookingForm) => (e: { target: { value: string } }) => setBookingForm((f) => ({ ...f, [k]: e.target.value }));
  const availableRooms = rooms.filter((room) => room.status === 'Available' || room.status === 'Reserved');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submitBooking();
  };

  return (
    <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4${modalHidden ? ' hidden' : ''}${modalShown ? '' : ' opacity-0'} transition-opacity duration-200`}>
      <div className={`bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl border border-gray-200 dark:border-gray-700 transform ${modalShown ? 'scale-100' : 'scale-95'} transition-transform duration-200`}>
        <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">{editingBookingId ? 'Edit reservation' : 'Create reservation'}</h3>
          <button type="button" onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" aria-label="Close">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <div>
            <label htmlFor="event-guest-name" className={LABEL}>Guest Full Name</label>
            <input type="text" id="event-guest-name" required placeholder="e.g. John Smith" value={bookingForm.guest} onChange={set('guest')} className={INPUT} />
          </div>

          <div>
            <label htmlFor="event-guest-email" className={LABEL}>Guest Email</label>
            <input type="email" id="event-guest-email" required maxLength={255} placeholder="guest@example.com" value={bookingForm.email} onChange={set('email')} className={INPUT} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="event-room-select" className={LABEL}>Assign Room</label>
              <select id="event-room-select" required value={bookingForm.room || availableRooms[0]?.roomNumber || ''} onChange={set('room')} className={INPUT}>
                {availableRooms.map((r) => (
                  <option key={r.id} value={r.roomNumber}>{`Room ${r.roomNumber} (${r.type} - ${r.rate}/night)`}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="event-guests-count" className={LABEL}>Guests Count</label>
              <input type="number" id="event-guests-count" min="1" max="6" value={bookingForm.guestsCount} onChange={set('guestsCount')} className={INPUT} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="event-checkin-date" className={LABEL}>Check-in Date</label>
              <input type="date" id="event-checkin-date" required value={bookingForm.checkIn} onChange={set('checkIn')} className={INPUT} />
            </div>
            <div>
              <label htmlFor="event-checkout-date" className={LABEL}>Check-out Date</label>
              <input type="date" id="event-checkout-date" required value={bookingForm.checkOut} onChange={set('checkOut')} className={INPUT} />
            </div>
          </div>

          <div>
            <label htmlFor="event-special-req" className={LABEL}>Special Requirements / Notes</label>
            <textarea id="event-special-req" rows={2} placeholder="e.g. Late check-in, quiet room..." value={bookingForm.specialReq} onChange={set('specialReq')} className={INPUT}></textarea>
          </div>

          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-[11px] text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
            <i className="fa-brands fa-google text-xs"></i>
            <span>Availability is checked on the server. A folio is created with the reservation.</span>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button type="button" onClick={closeModal} className="px-3 py-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs font-medium transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={dataLoading || availableRooms.length === 0} className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-colors">
              {availableRooms.length === 0 ? 'No bookable rooms' : editingBookingId ? 'Save changes' : 'Confirm reservation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
