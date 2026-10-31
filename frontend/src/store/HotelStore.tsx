import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ApiError, apiDelete, apiGet, apiPatch, apiPost, setActiveHotelId } from '@/api';
import type { ChatMessage, HotelMembership, HousekeepingTask, Reservation, Role, Room, Session, StaffMember, TabId, Toast, TodayFilter } from '@/types';

export interface BookingForm {
  guest: string;
  email: string;
  room: string;
  guestsCount: string;
  checkIn: string;
  checkOut: string;
  specialReq: string;
}

interface UserPayload { id: string; name: string; email: string }
interface AuthPayload { user: UserPayload; memberships: HotelMembership[]; activeHotelId: string | null }
interface ApiRoom { id: string; roomNumber: string; type: string; rate: number; status: string; guest: string; cleanStatus: string; maxCapacity?: number }
interface ApiBooking { id: string; guest: string; guestEmail?: string; room: string; guestsCount: number; checkIn: string; checkOut: string; status: string; paid: boolean; specialReq?: string }
interface ApiTask { id: string; room: string; staff: string; status: string; priority: string; task: string }
interface ApiEmployee { id: string; name: string; department: string; email: string; isActive: boolean; status: string; schedules?: Array<{ shiftDate: string; startTime: string; endTime: string }> }
interface ApiInvoice { id: string; bookingId: string; guest: string; room: string; totalDue: number; amountPaid: number; balance: number; status: string }
interface ApiGuest { id: string; name: string; email: string; phone: string | null }
interface ApiRequest { id: string; kind: string; details: string | null; status: string; createdAt: string; guest: { name: string; email: string } }
interface DashboardPayload { hotel: { id: string; name: string; currency: string; timeZone: string; today: string }; stats: Record<string, number> }

const EMPTY_FORM: BookingForm = { guest: '', email: '', room: '', guestsCount: '1', checkIn: '', checkOut: '', specialReq: '' };
const statusLabels: Record<string, string> = { PENDING: 'Pending', IN_PROGRESS: 'In Progress', COMPLETED: 'Completed', CANCELLED: 'Cancelled' };
const roleTitle: Record<string, string> = { OWNER: 'Owner', MANAGER: 'Manager', FRONT_DESK: 'Front Desk', HOUSEKEEPING: 'Housekeeping', VIEWER: 'Read Only' };

function displayBookingStatus(status: string): string {
  return ({ PENDING: 'Pending', CONFIRMED: 'Confirmed', CHECKED_IN: 'Checked In', CHECKED_OUT: 'Checked Out', CANCELLED: 'Cancelled' } as Record<string, string>)[status] ?? status;
}

function createSession(user: UserPayload, membership: HotelMembership): Session {
  return { role: 'employee', name: user.name, email: user.email, title: roleTitle[membership.role] ?? 'Hotel Staff', userId: user.id, hotelId: membership.hotelId, hotelName: membership.hotelName, membershipRole: membership.role };
}

function displayPriority(priority: string): string {
  return priority.charAt(0) + priority.slice(1).toLowerCase();
}

function toRoomStatus(value: string): string {
  return ({ Available: 'AVAILABLE', Reserved: 'RESERVED', Occupied: 'OCCUPIED', Cleaning: 'CLEANING', Maintenance: 'MAINTENANCE' } as Record<string, string>)[value] ?? value.toUpperCase();
}

function asErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The request could not be completed.';
}

function useStoreValue() {
  const [currentSession, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Session | null>(null);
  const [memberships, setMemberships] = useState<HotelMembership[]>([]);
  const [activeHotelId, setCurrentHotelId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [dataLoading, setDataLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [currentTab, setCurrentTab] = useState<TabId>('overview');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [housekeepingTasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [staffMembers, setStaff] = useState<StaffMember[]>([]);
  const [invoices, setInvoices] = useState<ApiInvoice[]>([]);
  const [guests, setGuests] = useState<ApiGuest[]>([]);
  const [guestRequests, setGuestRequests] = useState<ApiRequest[]>([]);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [todayFilter, setTodayFilter] = useState<TodayFilter>('all');
  const [roomsFilter, setRoomsFilter] = useState<string>('all');
  const [chatRole, setChatRole] = useState<Role | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isDark, setIsDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [overlayHidden, setOverlayHidden] = useState(true);
  const [overlayTransparent, setOverlayTransparent] = useState(true);
  const [modalHidden, setModalHidden] = useState(true);
  const [modalShown, setModalShown] = useState(false);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [bookingForm, setBookingForm] = useState<BookingForm>(EMPTY_FORM);
  const sequence = useRef(0);
  const activeHotelRef = useRef<string | null>(null);
  const dataRequestSequence = useRef(0);

  const showToast = useCallback((message: string) => {
    const id = ++sequence.current;
    setToasts((current) => [...current, { id, message, visible: false }]);
    window.setTimeout(() => setToasts((current) => current.map((toast) => toast.id === id ? { ...toast, visible: true } : toast)), 10);
    window.setTimeout(() => {
      setToasts((current) => current.map((toast) => toast.id === id ? { ...toast, visible: false } : toast));
      window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 300);
    }, 3500);
  }, []);

  const appendChatMessage = useCallback((sender: 'ai' | 'user', text: string) => {
    const id = ++sequence.current;
    setChatMessages((current) => [...current, { id, sender, text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
  }, []);

  const loadHotelData = useCallback(async (hotelId: string) => {
    if (activeHotelRef.current !== hotelId) return;
    const requestSequence = ++dataRequestSequence.current;
    setActiveHotelId(hotelId);
    setDataLoading(true);
    try {
      const [roomResult, bookingResult, taskResult, staffResult, invoiceResult, guestResult, requestResult, dashboardResult] = await Promise.all([
        apiGet<{ rooms: ApiRoom[] }>('/rooms'),
        apiGet<{ bookings: ApiBooking[] }>('/bookings'),
        apiGet<{ tasks: ApiTask[] }>('/housekeeping'),
        apiGet<{ employees: ApiEmployee[] }>('/staff'),
        apiGet<{ invoices: ApiInvoice[] }>('/invoices'),
        apiGet<{ guests: ApiGuest[] }>('/guests'),
        apiGet<{ requests: ApiRequest[] }>('/requests'),
        apiGet<DashboardPayload>('/dashboard'),
      ]);
      if (requestSequence !== dataRequestSequence.current || activeHotelRef.current !== hotelId) return;
      setRooms(roomResult.rooms.map((room) => ({ ...room, id: room.id, roomNumber: room.roomNumber, guest: room.guest || '', cleanStatus: room.cleanStatus || 'Clean' })));
      setReservations(bookingResult.bookings.map((booking) => ({ ...booking, status: displayBookingStatus(booking.status), paid: booking.paid })));
      setTasks(taskResult.tasks.map((task) => ({ ...task, status: statusLabels[task.status] ?? task.status, priority: displayPriority(task.priority) })));
      setStaff(staffResult.employees.map((employee) => {
        const shift = employee.schedules?.[0];
        return { id: employee.id, name: employee.name, role: employee.department, shift: shift ? `${shift.shiftDate.slice(0, 10)} ${shift.startTime}-${shift.endTime}` : 'No shift scheduled', status: employee.isActive ? 'Active' : 'Inactive' };
      }));
      setInvoices(invoiceResult.invoices);
      setGuests(guestResult.guests);
      setGuestRequests(requestResult.requests);
      setDashboard(dashboardResult);
    } finally {
      if (requestSequence === dataRequestSequence.current && activeHotelRef.current === hotelId) setDataLoading(false);
    }
  }, []);

  const applyAuth = useCallback(async (payload: AuthPayload, preferredHotelId?: string | null) => {
    setMemberships(payload.memberships);
    const chosen = payload.memberships.find((membership) => membership.hotelId === (preferredHotelId ?? payload.activeHotelId)) ?? payload.memberships[0];
    if (!chosen) {
      activeHotelRef.current = null;
      dataRequestSequence.current += 1;
      setSession(null);
      setProfile(null);
      setCurrentHotelId(null);
      setActiveHotelId(null);
      setAuthError('This account does not have access to a hotel. Accept a hotel invitation or register a property.');
      return;
    }
    const session = createSession(payload.user, chosen);
    activeHotelRef.current = chosen.hotelId;
    dataRequestSequence.current += 1;
    setCurrentHotelId(chosen.hotelId);
    setActiveHotelId(chosen.hotelId);
    setSession(session);
    setProfile(session);
    setAuthError('');
    setCurrentTab('overview');
    setChatRole('employee');
    setChatMessages([{ id: ++sequence.current, sender: 'ai', text: `Welcome, ${payload.user.name}. I can answer read-only questions about this hotel's rooms, arrivals, occupancy, housekeeping, balances, and revenue.`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    try {
      await loadHotelData(chosen.hotelId);
    } catch (error) {
      showToast(asErrorMessage(error));
    }
  }, [loadHotelData, showToast]);

  useEffect(() => {
    let mounted = true;
    apiGet<AuthPayload>('/auth/me').then(async (payload) => {
      if (mounted) await applyAuth(payload, payload.activeHotelId);
    }).catch((error: unknown) => {
      if (mounted && !(error instanceof ApiError && error.status === 401)) setAuthError(asErrorMessage(error));
    }).finally(() => {
      if (mounted) setIsInitializing(false);
    });
    const expired = () => {
      activeHotelRef.current = null;
      dataRequestSequence.current += 1;
      setDataLoading(false);
      setSession(null);
      setProfile(null);
      setCurrentHotelId(null);
      setActiveHotelId(null);
      setMemberships([]);
      setRooms([]);
      setReservations([]);
      setTasks([]);
      setStaff([]);
      setInvoices([]);
      setGuests([]);
      setGuestRequests([]);
      setAuthError('Your session expired. Sign in again to continue.');
    };
    window.addEventListener('stayflow:session-expired', expired);
    return () => {
      mounted = false;
      window.removeEventListener('stayflow:session-expired', expired);
    };
  }, [applyAuth]);

  const executeLogin = useCallback(async (input: { mode: 'login' | 'register'; name?: string; hotelName?: string; email: string; password: string; inviteToken?: string }) => {
    setAuthLoading(true);
    setAuthError('');
    try {
      let payload = await apiPost<AuthPayload>(input.mode === 'register' ? '/auth/register' : '/auth/login', input);
      if (input.mode === 'login' && input.inviteToken) {
        const accepted = await apiPost<{ memberships: HotelMembership[]; activeHotelId: string }>('/auth/accept-invite', { token: input.inviteToken });
        payload = { ...payload, memberships: accepted.memberships, activeHotelId: accepted.activeHotelId };
      }
      await applyAuth(payload, payload.activeHotelId);
      showToast(`Signed in to ${payload.memberships.find((membership) => membership.hotelId === payload.activeHotelId)?.hotelName ?? 'StayFlow'}.`);
    } catch (error) {
      setAuthError(asErrorMessage(error));
    } finally {
      setAuthLoading(false);
    }
  }, [applyAuth, showToast]);

  const logoutSession = useCallback(async () => {
    try { await apiPost<void>('/auth/logout'); } catch { /* local session state is cleared even if the cookie already expired */ }
    activeHotelRef.current = null;
    dataRequestSequence.current += 1;
    setDataLoading(false);
    setSession(null);
    setProfile(null);
    setMemberships([]);
    setCurrentHotelId(null);
    setActiveHotelId(null);
    setRooms([]);
    setReservations([]);
    setTasks([]);
    setStaff([]);
    setInvoices([]);
    setGuests([]);
    setGuestRequests([]);
    setDashboard(null);
    setChatMessages([]);
    setAuthError('');
  }, []);

  const selectHotel = useCallback(async (hotelId: string) => {
    const membership = memberships.find((item) => item.hotelId === hotelId);
    if (!membership) return;
    activeHotelRef.current = hotelId;
    dataRequestSequence.current += 1;
    setRooms([]);
    setReservations([]);
    setTasks([]);
    setStaff([]);
    setInvoices([]);
    setGuests([]);
    setGuestRequests([]);
    setDashboard(null);
    setToasts([]);
    setCurrentTab('overview');
    setTodayFilter('all');
    setRoomsFilter('all');
    setBookingForm(EMPTY_FORM);
    setEditingBookingId(null);
    setModalShown(false);
    setModalHidden(true);
    setSidebarOpen(false);
    setChatOpen(false);
    setOverlayHidden(true);
    setOverlayTransparent(true);
    setCurrentDate(new Date());
    setChatMessages([{ id: ++sequence.current, sender: 'ai', text: `Read-only assistant context switched to ${membership.hotelName}.`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    setCurrentHotelId(hotelId);
    setActiveHotelId(hotelId);
    const user = currentSession ? { id: currentSession.userId, name: currentSession.name, email: currentSession.email } : null;
    if (user) {
      const session = createSession(user, membership);
      setSession(session);
      setProfile(session);
    }
    try { await loadHotelData(hotelId); } catch (error) { showToast(asErrorMessage(error)); }
  }, [currentSession, loadHotelData, memberships, showToast]);

  const refreshData = useCallback(async () => {
    if (activeHotelId) {
      try { await loadHotelData(activeHotelId); } catch (error) { showToast(asErrorMessage(error)); }
    }
  }, [activeHotelId, loadHotelData, showToast]);

  const switchTab = useCallback((tabId: TabId) => setCurrentTab(tabId), []);
  const filterRooms = useCallback((status: string) => setRoomsFilter(status), []);
  const filterTodayGuests = useCallback((filter: TodayFilter) => setTodayFilter(filter), []);

  const updateRoomStatus = useCallback(async (roomId: string, status: string) => {
    try {
      await apiPatch(`/rooms/${encodeURIComponent(roomId)}/status`, { status: toRoomStatus(status) });
      await refreshData();
      showToast(`Room status changed to ${status}.`);
    } catch (error) { showToast(asErrorMessage(error)); }
  }, [refreshData, showToast]);

  const createRoom = useCallback(async (input: { roomNumber: string; type: string; rate: number; maxCapacity: number }) => {
    try {
      await apiPost('/rooms', input);
      await refreshData();
      showToast(`Room ${input.roomNumber} was added.`);
    } catch (error) { showToast(asErrorMessage(error)); }
  }, [refreshData, showToast]);

  const toggleTaskStatus = useCallback(async (taskId: string) => {
    const current = housekeepingTasks.find((task) => task.id === taskId);
    if (!current) return;
    const status = current.status === 'In Progress' ? 'COMPLETED' : current.status === 'Pending' ? 'IN_PROGRESS' : 'COMPLETED';
    try {
      await apiPatch(`/housekeeping/${encodeURIComponent(taskId)}`, { status });
      await refreshData();
      showToast('Housekeeping task updated.');
    } catch (error) { showToast(asErrorMessage(error)); }
  }, [housekeepingTasks, refreshData, showToast]);

  const createHousekeepingTask = useCallback(async (input: { roomNumber: string; title: string; priority: 'LOW' | 'MEDIUM' | 'HIGH'; employeeId?: string }) => {
    try {
      await apiPost('/housekeeping', input);
      await refreshData();
      showToast('Housekeeping task created.');
    } catch (error) { showToast(asErrorMessage(error)); }
  }, [refreshData, showToast]);

  const handleCheckIn = useCallback(async (bookingId: string) => {
    try {
      await apiPost(`/bookings/${encodeURIComponent(bookingId)}/check-in`);
      await refreshData();
      showToast('Guest checked in.');
    } catch (error) { showToast(asErrorMessage(error)); }
  }, [refreshData, showToast]);

  const handleCheckOut = useCallback(async (bookingId: string) => {
    try {
      await apiPost(`/bookings/${encodeURIComponent(bookingId)}/check-out`);
      await refreshData();
      showToast('Guest checked out. A housekeeping task was created for the room.');
    } catch (error) { showToast(asErrorMessage(error)); }
  }, [refreshData, showToast]);

  const cancelBooking = useCallback(async (bookingId: string) => {
    try {
      await apiDelete(`/bookings/${encodeURIComponent(bookingId)}`);
      await refreshData();
      showToast('Reservation cancelled.');
    } catch (error) { showToast(asErrorMessage(error)); }
  }, [refreshData, showToast]);

  const createStaffMember = useCallback(async (input: { name: string; department: string; email: string }) => {
    try {
      await apiPost('/staff', input);
      await refreshData();
      showToast('Staff member added.');
    } catch (error) { showToast(asErrorMessage(error)); }
  }, [refreshData, showToast]);

  const createStaffSchedule = useCallback(async (employeeId: string, input: { shiftDate: string; startTime: string; endTime: string; notes?: string }) => {
    try {
      await apiPost(`/staff/${encodeURIComponent(employeeId)}/schedules`, input);
      await refreshData();
      showToast('Staff shift scheduled.');
    } catch (error) { showToast(asErrorMessage(error)); }
  }, [refreshData, showToast]);

  const updateStaffMember = useCallback(async (employeeId: string, isActive: boolean) => {
    try {
      await apiPatch(`/staff/${encodeURIComponent(employeeId)}`, { isActive });
      await refreshData();
      showToast(isActive ? 'Staff member reactivated.' : 'Staff member deactivated.');
    } catch (error) { showToast(asErrorMessage(error)); }
  }, [refreshData, showToast]);

  const recordPayment = useCallback(async (invoiceId: string, amount: number, method: string) => {
    try {
      await apiPost(`/invoices/${encodeURIComponent(invoiceId)}/payments`, { amount, method });
      await refreshData();
      showToast('Payment recorded.');
    } catch (error) { showToast(asErrorMessage(error)); }
  }, [refreshData, showToast]);

  const createGuest = useCallback(async (input: { name: string; email: string; phone?: string }) => {
    try { await apiPost('/guests', input); await refreshData(); showToast('Guest record saved.'); }
    catch (error) { showToast(asErrorMessage(error)); }
  }, [refreshData, showToast]);

  const updateGuest = useCallback(async (guestId: string, input: { name?: string; email?: string; phone?: string | null }) => {
    try { await apiPatch(`/guests/${encodeURIComponent(guestId)}`, input); await refreshData(); showToast('Guest details updated.'); }
    catch (error) { showToast(asErrorMessage(error)); }
  }, [refreshData, showToast]);

  const deleteGuest = useCallback(async (guestId: string) => {
    try { await apiDelete(`/guests/${encodeURIComponent(guestId)}`); await refreshData(); showToast('Guest record deleted.'); }
    catch (error) { showToast(asErrorMessage(error)); }
  }, [refreshData, showToast]);

  const createGuestRequest = useCallback(async (input: { guestName: string; guestEmail: string; kind: string; details?: string }) => {
    try { await apiPost('/requests', input); await refreshData(); showToast('Guest request logged.'); }
    catch (error) { showToast(asErrorMessage(error)); }
  }, [refreshData, showToast]);

  const sendGuestEmail = useCallback(async (guestId: string, subject: string, text: string) => {
    try { await apiPost('/emails/outbound', { guestId, subject, text }); showToast('Email sent through the configured SMTP provider.'); }
    catch (error) { showToast(asErrorMessage(error)); }
  }, [showToast]);

  const updateGuestRequest = useCallback(async (requestId: string, status: string) => {
    try { await apiPatch(`/requests/${encodeURIComponent(requestId)}`, { status }); await refreshData(); showToast('Guest request updated.'); }
    catch (error) { showToast(asErrorMessage(error)); }
  }, [refreshData, showToast]);

  const handleAiResponse = useCallback(async (userQuery: string) => {
    const requestHotelId = activeHotelRef.current;
    if (!requestHotelId) return;
    try {
      const result = await apiPost<{ answer: string }>('/assistant', { question: userQuery });
      if (activeHotelRef.current !== requestHotelId) return;
      appendChatMessage('ai', result.answer);
    } catch (error) {
      if (activeHotelRef.current === requestHotelId) appendChatMessage('ai', asErrorMessage(error));
    }
  }, [appendChatMessage]);

  const sendChatMessage = useCallback((text: string) => {
    appendChatMessage('user', text);
    void handleAiResponse(text);
  }, [appendChatMessage, handleAiResponse]);

  const sendChip = useCallback((text: string) => {
    appendChatMessage('user', text);
    void handleAiResponse(text);
  }, [appendChatMessage, handleAiResponse]);

  const setupChatForRole = useCallback((role: Role, name?: string) => {
    setChatRole(role);
    setChatMessages([{ id: ++sequence.current, sender: 'ai', text: `Hello ${name ?? currentSession?.name ?? 'there'}. Ask me a read-only question about hotel operations.`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
  }, [currentSession?.name]);

  const simulateInboundEmail = useCallback(() => {
    const body = window.prompt('Paste the booking email text to extract details for staff review. The parser will not create a reservation automatically.');
    if (!body?.trim()) return;
    const sender = window.prompt('Enter the sender email address for this message.');
    if (!sender?.trim()) return;
    const requestHotelId = activeHotelRef.current;
    if (!requestHotelId) return;
    void apiPost<{ extractedBooking: { guestName: string | null; checkIn: string | null; checkOut: string | null; roomType: string | null; complete: boolean } }>('/emails/inbound', { sender, body })
      .then(({ extractedBooking }) => {
        if (activeHotelRef.current === requestHotelId) appendChatMessage('ai', `Email saved for staff review. Extracted guest: ${extractedBooking.guestName ?? 'not found'}, stay: ${extractedBooking.checkIn ?? '?'} to ${extractedBooking.checkOut ?? '?'}, room type: ${extractedBooking.roomType ?? 'not found'}. No reservation was created.`);
      })
      .catch((error: unknown) => { if (activeHotelRef.current === requestHotelId) appendChatMessage('ai', asErrorMessage(error)); });
  }, [appendChatMessage]);

  const prevMonth = useCallback(() => setCurrentDate((date) => new Date(date.getFullYear(), date.getMonth() - 1, 1)), []);
  const nextMonth = useCallback(() => setCurrentDate((date) => new Date(date.getFullYear(), date.getMonth() + 1, 1)), []);
  const goToday = useCallback(() => setCurrentDate(new Date()), []);

  const openAddModal = useCallback((defaultDateStr = '') => {
    setEditingBookingId(null);
    if (defaultDateStr) {
      const checkout = new Date(`${defaultDateStr}T00:00:00.000Z`);
      checkout.setUTCDate(checkout.getUTCDate() + 1);
      setBookingForm({ ...EMPTY_FORM, checkIn: defaultDateStr, checkOut: checkout.toISOString().slice(0, 10) });
    } else {
      setBookingForm(EMPTY_FORM);
    }
    setModalHidden(false);
    window.setTimeout(() => setModalShown(true), 10);
  }, []);

  const openEditBooking = useCallback((bookingId: string) => {
    const booking = reservations.find((item) => item.id === bookingId);
    if (!booking) return;
    setEditingBookingId(booking.id);
    setBookingForm({ guest: booking.guest, email: booking.guestEmail ?? '', room: booking.room, guestsCount: String(booking.guestsCount), checkIn: booking.checkIn, checkOut: booking.checkOut, specialReq: booking.specialReq ?? '' });
    setModalHidden(false);
    window.setTimeout(() => setModalShown(true), 10);
  }, [reservations]);

  const closeModal = useCallback(() => {
    setModalShown(false);
    window.setTimeout(() => { setModalHidden(true); setBookingForm(EMPTY_FORM); }, 200);
  }, []);

  const submitBooking = useCallback(async () => {
    const requestHotelId = activeHotelRef.current;
    if (!requestHotelId) return;
    try {
      const payload = {
        guestName: bookingForm.guest,
        guestEmail: bookingForm.email,
        roomNumber: bookingForm.room || rooms[0]?.roomNumber || '',
        guestsCount: Number(bookingForm.guestsCount),
        checkIn: bookingForm.checkIn,
        checkOut: bookingForm.checkOut,
        specialReq: bookingForm.specialReq,
      };
      const result = editingBookingId
        ? await apiPatch<{ booking: ApiBooking }>(`/bookings/${encodeURIComponent(editingBookingId)}`, payload)
        : await apiPost<{ booking: ApiBooking }>('/bookings', payload);
      if (activeHotelRef.current !== requestHotelId) return;
      const saved = { ...result.booking, status: displayBookingStatus(result.booking.status) };
      setReservations((list) => editingBookingId ? list.map((booking) => booking.id === editingBookingId ? saved : booking) : [...list, saved]);
      closeModal();
      await refreshData();
      showToast(editingBookingId ? `Reservation for ${bookingForm.guest} updated.` : `Reservation created for ${bookingForm.guest}.`);
    } catch (error) { showToast(asErrorMessage(error)); }
  }, [bookingForm, closeModal, editingBookingId, refreshData, rooms, showToast]);

  const showOverlay = useCallback(() => {
    setOverlayHidden(false);
    window.setTimeout(() => setOverlayTransparent(false), 10);
  }, []);
  const hideOverlay = useCallback(() => {
    setOverlayTransparent(true);
    window.setTimeout(() => setOverlayHidden(true), 300);
  }, []);
  const openDrawer = useCallback(() => { setSidebarOpen(true); showOverlay(); }, [showOverlay]);
  const closeDrawer = useCallback(() => { setSidebarOpen(false); hideOverlay(); }, [hideOverlay]);
  const openChatMobile = useCallback(() => { setChatOpen(true); showOverlay(); }, [showOverlay]);
  const closeChatMobile = useCallback(() => { setChatOpen(false); hideOverlay(); }, [hideOverlay]);
  const overlayClick = useCallback(() => { closeDrawer(); setChatOpen(false); }, [closeDrawer]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) setIsDark(true);
  }, []);
  useEffect(() => { document.documentElement.classList.toggle('dark', isDark); }, [isDark]);
  const toggleTheme = useCallback(() => {
    setIsDark((dark) => {
      localStorage.setItem('theme', dark ? 'light' : 'dark');
      return !dark;
    });
  }, []);

  return {
    currentSession, profile, memberships, activeHotelId, isInitializing, authLoading, authError, dataLoading,
    currentDate, currentTab, rooms, reservations, housekeepingTasks, staffMembers, invoices, guests, guestRequests, dashboard,
    todayFilter, roomsFilter, chatRole, chatMessages, toasts, isDark, sidebarOpen, chatOpen,
    overlayHidden, overlayTransparent, modalHidden, modalShown, editingBookingId, bookingForm, setBookingForm,
    showToast, appendChatMessage, handleAiResponse, setupChatForRole, sendChatMessage, sendChip,
    switchTab, executeLogin, logoutSession, selectHotel, refreshData, filterRooms,
    updateRoomStatus, createRoom, toggleTaskStatus, createHousekeepingTask, handleCheckIn, handleCheckOut, cancelBooking,
    createStaffMember, createStaffSchedule, updateStaffMember, recordPayment, createGuest, updateGuest, deleteGuest, createGuestRequest, sendGuestEmail, updateGuestRequest, filterTodayGuests, simulateInboundEmail, prevMonth, nextMonth, goToday,
    openAddModal, openEditBooking, closeModal, submitBooking, openDrawer, closeDrawer, openChatMobile, closeChatMobile,
    overlayClick, toggleTheme,
  };
}

export type HotelStore = ReturnType<typeof useStoreValue>;
const HotelContext = createContext<HotelStore | null>(null);

export function HotelProvider({ children }: { children: ReactNode }) {
  const store = useStoreValue();
  return <HotelContext.Provider value={store}>{children}</HotelContext.Provider>;
}

export function useHotel(): HotelStore {
  const context = useContext(HotelContext);
  if (!context) throw new Error('useHotel must be used inside <HotelProvider>');
  return context;
}
