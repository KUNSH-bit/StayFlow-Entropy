// Standalone mock backend for StayFlow Hotel Management System
// Enables full offline / demo operation and instant bypass when the backend server is not running.

export interface MockDb {
  user: { id: string; name: string; email: string };
  memberships: Array<{
    hotelId: string;
    hotelName: string;
    subdomain: string;
    currency: string;
    timeZone: string;
    role: string;
  }>;
  activeHotelId: string;
  rooms: Array<{
    id: string;
    roomNumber: string;
    type: string;
    rate: number;
    status: string;
    guest: string;
    cleanStatus: string;
    maxCapacity: number;
  }>;
  roomTypes: Array<{
    id: string;
    name: string;
    basePrice: number;
    maxCapacity: number;
    roomCount: number;
  }>;
  bookings: Array<{
    id: string;
    guest: string;
    guestEmail: string;
    room: string;
    guestsCount: number;
    checkIn: string;
    checkOut: string;
    status: string;
    paid: boolean;
    specialReq?: string;
  }>;
  tasks: Array<{
    id: string;
    room: string;
    staff: string;
    status: string;
    priority: string;
    task: string;
  }>;
  employees: Array<{
    id: string;
    name: string;
    department: string;
    email: string;
    isActive: boolean;
    status: string;
    schedules: Array<{ shiftDate: string; startTime: string; endTime: string }>;
  }>;
  invoices: Array<{
    id: string;
    bookingId: string;
    guest: string;
    room: string;
    totalDue: number;
    amountPaid: number;
    balance: number;
    status: string;
  }>;
  guests: Array<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
  }>;
  requests: Array<{
    id: string;
    kind: string;
    details: string | null;
    status: string;
    createdAt: string;
    guest: { name: string; email: string };
  }>;
  hotelMembers: Array<{
    id: string;
    userId: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  }>;
}

const STORAGE_KEY = 'stayflow_mock_database_v2';

function shiftDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function createInitialMockDb(): MockDb {
  const today = shiftDate(0);
  const tomorrow = shiftDate(1);
  const in3Days = shiftDate(3);
  const in5Days = shiftDate(5);
  const yesterday = shiftDate(-1);
  const twoDaysAgo = shiftDate(-2);

  return {
    user: {
      id: 'usr-admin-1',
      name: 'Reyansh Sharma',
      email: 'reyansh@stayflow.internal',
    },
    memberships: [
      {
        hotelId: 'hotel-grand-horizon',
        hotelName: 'StayFlow Grand Horizon Hotel & Suites',
        subdomain: 'grand-horizon',
        currency: 'INR',
        timeZone: 'Asia/Kolkata',
        role: 'OWNER',
      },
      {
        hotelId: 'hotel-azure-coast',
        hotelName: 'StayFlow Azure Coast Resort',
        subdomain: 'azure-coast',
        currency: 'USD',
        timeZone: 'America/New_York',
        role: 'MANAGER',
      },
    ],
    activeHotelId: 'hotel-grand-horizon',
    rooms: [
      { id: 'rm-101', roomNumber: '101', type: 'Executive Suite', rate: 7500, status: 'Occupied', guest: 'Aarav Patel', cleanStatus: 'Clean', maxCapacity: 3 },
      { id: 'rm-102', roomNumber: '102', type: 'Executive Suite', rate: 7500, status: 'Cleaning', guest: '', cleanStatus: 'Dirty', maxCapacity: 3 },
      { id: 'rm-103', roomNumber: '103', type: 'Deluxe King', rate: 4500, status: 'Available', guest: '', cleanStatus: 'Clean', maxCapacity: 2 },
      { id: 'rm-201', roomNumber: '201', type: 'Deluxe King', rate: 4500, status: 'Occupied', guest: 'Priya Sharma', cleanStatus: 'Clean', maxCapacity: 2 },
      { id: 'rm-202', roomNumber: '202', type: 'Standard Queen', rate: 3200, status: 'Available', guest: '', cleanStatus: 'Clean', maxCapacity: 2 },
      { id: 'rm-203', roomNumber: '203', type: 'Standard Queen', rate: 3200, status: 'Occupied', guest: 'Michael Chen', cleanStatus: 'Clean', maxCapacity: 2 },
      { id: 'rm-301', roomNumber: '301', type: 'Presidential Penthouse', rate: 18000, status: 'Available', guest: '', cleanStatus: 'Clean', maxCapacity: 4 },
      { id: 'rm-302', roomNumber: '302', type: 'Deluxe King', rate: 4500, status: 'Maintenance', guest: '', cleanStatus: 'Inspecting', maxCapacity: 2 },
    ],
    roomTypes: [
      { id: 'rt-1', name: 'Executive Suite', basePrice: 7500, maxCapacity: 3, roomCount: 2 },
      { id: 'rt-2', name: 'Deluxe King', basePrice: 4500, maxCapacity: 2, roomCount: 3 },
      { id: 'rt-3', name: 'Standard Queen', basePrice: 3200, maxCapacity: 2, roomCount: 2 },
      { id: 'rt-4', name: 'Presidential Penthouse', basePrice: 18000, maxCapacity: 4, roomCount: 1 },
    ],
    bookings: [
      {
        id: 'bk-101',
        guest: 'Aarav Patel',
        guestEmail: 'aarav.patel@example.com',
        room: '101',
        guestsCount: 2,
        checkIn: twoDaysAgo,
        checkOut: tomorrow,
        status: 'Checked In',
        paid: true,
        specialReq: 'Airport pickup confirmed. Prefers high floor.',
      },
      {
        id: 'bk-102',
        guest: 'Priya Sharma',
        guestEmail: 'priya.sharma@example.com',
        room: '201',
        guestsCount: 2,
        checkIn: yesterday,
        checkOut: today,
        status: 'Checked In',
        paid: true,
        specialReq: 'Late check-out requested at 1:00 PM.',
      },
      {
        id: 'bk-103',
        guest: 'Michael Chen',
        guestEmail: 'michael.chen@globaltravel.com',
        room: '203',
        guestsCount: 1,
        checkIn: today,
        checkOut: in3Days,
        status: 'Confirmed',
        paid: false,
        specialReq: 'Quiet room away from elevator.',
      },
      {
        id: 'bk-104',
        guest: 'Sarah Jenkins',
        guestEmail: 'sarah.j@techventures.io',
        room: '103',
        guestsCount: 2,
        checkIn: today,
        checkOut: tomorrow,
        status: 'Confirmed',
        paid: true,
        specialReq: 'Honeymoon amenities restock request.',
      },
      {
        id: 'bk-105',
        guest: 'Vikramaditya Roy',
        guestEmail: 'vikram.roy@innovate.in',
        room: '301',
        guestsCount: 3,
        checkIn: tomorrow,
        checkOut: in5Days,
        status: 'Confirmed',
        paid: false,
        specialReq: 'Extra rollaway bed and VIP concierge assistance.',
      },
    ],
    tasks: [
      { id: 'tsk-1', room: '102', staff: 'Anita Roy', status: 'In Progress', priority: 'High', task: 'Full departure turnover & sanitization' },
      { id: 'tsk-2', room: '201', staff: 'Suresh Kumar', status: 'Pending', priority: 'Medium', task: 'Prepare room for 1:00 PM scheduled departure' },
      { id: 'tsk-3', room: '302', staff: 'Ramesh Patel', status: 'Pending', priority: 'High', task: 'AC thermostat inspection & filter change' },
      { id: 'tsk-4', room: '103', staff: 'Anita Roy', status: 'Completed', priority: 'Medium', task: 'Pre-arrival inspection for Sarah Jenkins' },
    ],
    employees: [
      {
        id: 'emp-1',
        name: 'Anita Roy',
        department: 'Housekeeping',
        email: 'anita.roy@stayflow.internal',
        isActive: true,
        status: 'Active',
        schedules: [{ shiftDate: today, startTime: '07:00', endTime: '15:30' }],
      },
      {
        id: 'emp-2',
        name: 'Suresh Kumar',
        department: 'Housekeeping',
        email: 'suresh.kumar@stayflow.internal',
        isActive: true,
        status: 'Active',
        schedules: [{ shiftDate: today, startTime: '08:00', endTime: '16:30' }],
      },
      {
        id: 'emp-3',
        name: 'Rohan Deshmukh',
        department: 'Front Desk',
        email: 'rohan.d@stayflow.internal',
        isActive: true,
        status: 'Active',
        schedules: [{ shiftDate: today, startTime: '09:00', endTime: '18:00' }],
      },
      {
        id: 'emp-4',
        name: 'Kavita Menon',
        department: 'Concierge',
        email: 'kavita.m@stayflow.internal',
        isActive: true,
        status: 'Active',
        schedules: [{ shiftDate: today, startTime: '10:00', endTime: '19:00' }],
      },
    ],
    invoices: [
      { id: 'inv-101', bookingId: 'bk-101', guest: 'Aarav Patel', room: '101', totalDue: 22500, amountPaid: 22500, balance: 0, status: 'PAID' },
      { id: 'inv-102', bookingId: 'bk-102', guest: 'Priya Sharma', room: '201', totalDue: 9000, amountPaid: 9000, balance: 0, status: 'PAID' },
      { id: 'inv-103', bookingId: 'bk-103', guest: 'Michael Chen', room: '203', totalDue: 9600, amountPaid: 0, balance: 9600, status: 'PENDING' },
      { id: 'inv-104', bookingId: 'bk-104', guest: 'Sarah Jenkins', room: '103', totalDue: 4500, amountPaid: 4500, balance: 0, status: 'PAID' },
      { id: 'inv-105', bookingId: 'bk-105', guest: 'Vikramaditya Roy', room: '301', totalDue: 72000, amountPaid: 20000, balance: 52000, status: 'PARTIAL' },
    ],
    guests: [
      { id: 'gst-1', name: 'Aarav Patel', email: 'aarav.patel@example.com', phone: '+91 98201 11223' },
      { id: 'gst-2', name: 'Priya Sharma', email: 'priya.sharma@example.com', phone: '+91 98450 33445' },
      { id: 'gst-3', name: 'Michael Chen', email: 'michael.chen@globaltravel.com', phone: '+1 415 889 0123' },
      { id: 'gst-4', name: 'Sarah Jenkins', email: 'sarah.j@techventures.io', phone: '+44 20 7946 0912' },
      { id: 'gst-5', name: 'Vikramaditya Roy', email: 'vikram.roy@innovate.in', phone: '+91 99102 77889' },
    ],
    requests: [
      {
        id: 'req-1',
        kind: 'Late checkout',
        details: 'Requested 1:00 PM late check-out for flight schedule alignment.',
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        guest: { name: 'Priya Sharma', email: 'priya.sharma@example.com' },
      },
      {
        id: 'req-2',
        kind: 'Room service',
        details: 'Sparkling mineral water, fruit basket and ice bucket to Room 101.',
        status: 'RESOLVED',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        guest: { name: 'Aarav Patel', email: 'aarav.patel@example.com' },
      },
      {
        id: 'req-3',
        kind: 'Transport',
        details: 'Airport drop service for 2 passengers scheduled at 4:30 PM.',
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        guest: { name: 'Sarah Jenkins', email: 'sarah.j@techventures.io' },
      },
    ],
    hotelMembers: [
      { id: 'mbr-1', userId: 'usr-admin-1', name: 'Reyansh Sharma', email: 'reyansh@stayflow.internal', role: 'OWNER', createdAt: '2026-01-15' },
      { id: 'mbr-2', userId: 'usr-2', name: 'Rohan Deshmukh', email: 'rohan.d@stayflow.internal', role: 'FRONT_DESK', createdAt: '2026-02-01' },
      { id: 'mbr-3', userId: 'usr-3', name: 'Anita Roy', email: 'anita.roy@stayflow.internal', role: 'HOUSEKEEPING', createdAt: '2026-02-10' },
      { id: 'mbr-4', userId: 'usr-4', name: 'Simran Walia', email: 'simran.w@stayflow.internal', role: 'MANAGER', createdAt: '2026-03-01' },
    ],
  };
}

let memoryDb: MockDb | null = null;

export function getMockDb(): MockDb {
  if (memoryDb) return memoryDb;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      memoryDb = JSON.parse(raw);
      return memoryDb!;
    }
  } catch {
    // localStorage might be blocked in strict sandboxes
  }
  memoryDb = createInitialMockDb();
  saveMockDb(memoryDb);
  return memoryDb;
}

export function saveMockDb(db: MockDb): void {
  memoryDb = db;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // ignore
  }
}

export function resetMockDb(): MockDb {
  const fresh = createInitialMockDb();
  saveMockDb(fresh);
  return fresh;
}

/**
 * Dispatches simulated REST requests to in-memory state.
 */
export async function handleMockRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method || 'GET').toUpperCase();
  const db = getMockDb();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const urlParts = cleanPath.split('?');
  const endpoint = urlParts[0];
  const query = new URLSearchParams(urlParts[1] || '');
  const body = init.body ? (typeof init.body === 'string' ? JSON.parse(init.body) : init.body) : {};

  // Artificial micro-delay for realistic interactive feel
  await new Promise((resolve) => setTimeout(resolve, 60));

  // 1. AUTH / SESSION
  if (endpoint === '/auth/me') {
    return {
      user: db.user,
      memberships: db.memberships,
      activeHotelId: db.activeHotelId,
    } as unknown as T;
  }

  if (endpoint === '/auth/login' || endpoint === '/auth/register') {
    if (body.name) db.user.name = body.name;
    if (body.email) db.user.email = body.email;
    if (body.hotelName) {
      db.memberships[0].hotelName = body.hotelName;
    }
    saveMockDb(db);
    return {
      user: db.user,
      memberships: db.memberships,
      activeHotelId: db.activeHotelId,
    } as unknown as T;
  }

  if (endpoint === '/auth/logout') {
    return undefined as unknown as T;
  }

  if (endpoint === '/auth/accept-invite') {
    return {
      memberships: db.memberships,
      activeHotelId: db.activeHotelId,
    } as unknown as T;
  }

  // 2. DASHBOARD
  if (endpoint === '/dashboard') {
    const active = db.memberships.find((m) => m.hotelId === db.activeHotelId) || db.memberships[0];
    const today = shiftDate(0);
    const occupiedCount = db.rooms.filter((r) => r.status === 'Occupied').length;
    const occupancyRate = db.rooms.length ? Math.round((occupiedCount / db.rooms.length) * 100) : 0;
    const arrivals = db.bookings.filter((b) => b.checkIn === today && ['Confirmed', 'Pending'].includes(b.status)).length;
    const departures = db.bookings.filter((b) => b.checkOut === today && b.status === 'Checked In').length;
    const openTasks = db.tasks.filter((t) => t.status !== 'Completed' && t.status !== 'Cancelled').length;
    const revenueThisMonth = db.invoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0) + 185000;
    const outstandingBalance = db.invoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);

    return {
      hotel: {
        id: active.hotelId,
        name: active.hotelName,
        currency: active.currency,
        timeZone: active.timeZone,
        today,
      },
      stats: {
        occupancyRate,
        revenueThisMonth,
        outstandingBalance,
        arrivals,
        departures,
        openHousekeepingTasks: openTasks,
      },
    } as unknown as T;
  }

  // 3. ROOMS
  if (endpoint === '/rooms') {
    if (method === 'POST') {
      const newRoom = {
        id: `rm-${Date.now().toString().slice(-4)}`,
        roomNumber: String(body.roomNumber),
        type: String(body.type || 'Standard Room'),
        rate: Number(body.rate) || 3500,
        status: 'Available',
        guest: '',
        cleanStatus: 'Clean',
        maxCapacity: Number(body.maxCapacity) || 2,
      };
      db.rooms.unshift(newRoom);

      // check if room type exists, else create
      const existingType = db.roomTypes.find((t) => t.name.toLowerCase() === newRoom.type.toLowerCase());
      if (existingType) {
        existingType.roomCount += 1;
      } else {
        db.roomTypes.push({
          id: `rt-${Date.now().toString().slice(-4)}`,
          name: newRoom.type,
          basePrice: newRoom.rate,
          maxCapacity: newRoom.maxCapacity,
          roomCount: 1,
        });
      }
      saveMockDb(db);
      return { room: newRoom } as unknown as T;
    }
    return { rooms: db.rooms } as unknown as T;
  }

  // PATCH /rooms/:id/status
  const roomStatusMatch = endpoint.match(/^\/rooms\/([^/]+)\/status$/);
  if (roomStatusMatch && method === 'PATCH') {
    const roomId = decodeURIComponent(roomStatusMatch[1]);
    const room = db.rooms.find((r) => r.id === roomId || r.roomNumber === roomId);
    if (room) {
      const rawStatus = String(body.status || 'Available');
      const formatted = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();
      room.status = formatted;
      if (formatted === 'Available') room.guest = '';
      if (formatted === 'Cleaning') room.cleanStatus = 'Dirty';
      if (formatted === 'Available' || formatted === 'Occupied') room.cleanStatus = 'Clean';
      saveMockDb(db);
    }
    return { room } as unknown as T;
  }

  // 4. ROOM TYPES
  if (endpoint === '/room-types') {
    return { roomTypes: db.roomTypes } as unknown as T;
  }

  const roomTypeMatch = endpoint.match(/^\/room-types\/([^/]+)$/);
  if (roomTypeMatch && method === 'PATCH') {
    const typeId = decodeURIComponent(roomTypeMatch[1]);
    const rType = db.roomTypes.find((t) => t.id === typeId);
    if (rType) {
      if (body.basePrice !== undefined) rType.basePrice = Number(body.basePrice);
      if (body.maxCapacity !== undefined) rType.maxCapacity = Number(body.maxCapacity);
      // update all matching rooms
      db.rooms.forEach((r) => {
        if (r.type === rType.name) {
          r.rate = rType.basePrice;
          r.maxCapacity = rType.maxCapacity;
        }
      });
      saveMockDb(db);
    }
    return { roomType: rType } as unknown as T;
  }

  // 5. BOOKINGS / RESERVATIONS
  if (endpoint === '/bookings') {
    if (method === 'POST') {
      const id = `bk-${Date.now().toString().slice(-4)}`;
      const newBooking = {
        id,
        guest: String(body.guestName || 'Valued Guest'),
        guestEmail: String(body.guestEmail || 'guest@example.com'),
        room: String(body.roomNumber || db.rooms[0]?.roomNumber || '101'),
        guestsCount: Number(body.guestsCount) || 1,
        checkIn: String(body.checkIn || shiftDate(0)),
        checkOut: String(body.checkOut || shiftDate(1)),
        status: 'Confirmed',
        paid: false,
        specialReq: body.specialReq ? String(body.specialReq) : undefined,
      };
      db.bookings.unshift(newBooking);

      // assign room
      const assignedRoom = db.rooms.find((r) => r.roomNumber === newBooking.room);
      if (assignedRoom && newBooking.checkIn === shiftDate(0)) {
        assignedRoom.status = 'Occupied';
        assignedRoom.guest = newBooking.guest;
      }

      // ensure guest record exists
      if (!db.guests.some((g) => g.email.toLowerCase() === newBooking.guestEmail.toLowerCase())) {
        db.guests.unshift({
          id: `gst-${Date.now().toString().slice(-4)}`,
          name: newBooking.guest,
          email: newBooking.guestEmail,
          phone: null,
        });
      }

      // create invoice
      const rate = assignedRoom?.rate || 4500;
      const nights = Math.max(1, Math.round((new Date(newBooking.checkOut).getTime() - new Date(newBooking.checkIn).getTime()) / 86400000) || 1);
      const totalDue = rate * nights;
      db.invoices.unshift({
        id: `inv-${Date.now().toString().slice(-4)}`,
        bookingId: id,
        guest: newBooking.guest,
        room: newBooking.room,
        totalDue,
        amountPaid: 0,
        balance: totalDue,
        status: 'PENDING',
      });

      saveMockDb(db);
      return { booking: newBooking } as unknown as T;
    }
    return { bookings: db.bookings } as unknown as T;
  }

  // Booking actions: check-in, check-out, edit, delete
  const checkInMatch = endpoint.match(/^\/bookings\/([^/]+)\/check-in$/);
  if (checkInMatch && method === 'POST') {
    const id = decodeURIComponent(checkInMatch[1]);
    const b = db.bookings.find((item) => item.id === id);
    if (b) {
      b.status = 'Checked In';
      const r = db.rooms.find((room) => room.roomNumber === b.room);
      if (r) {
        r.status = 'Occupied';
        r.guest = b.guest;
      }
      saveMockDb(db);
    }
    return { booking: b } as unknown as T;
  }

  const checkOutMatch = endpoint.match(/^\/bookings\/([^/]+)\/check-out$/);
  if (checkOutMatch && method === 'POST') {
    const id = decodeURIComponent(checkOutMatch[1]);
    const b = db.bookings.find((item) => item.id === id);
    if (b) {
      b.status = 'Checked Out';
      const r = db.rooms.find((room) => room.roomNumber === b.room);
      if (r) {
        r.status = 'Cleaning';
        r.guest = '';
        r.cleanStatus = 'Dirty';
      }
      // auto create housekeeping task
      db.tasks.unshift({
        id: `tsk-${Date.now().toString().slice(-4)}`,
        room: b.room,
        staff: 'Anita Roy',
        status: 'Pending',
        priority: 'High',
        task: `Checkout cleaning for room ${b.room} (${b.guest})`,
      });
      saveMockDb(db);
    }
    return { booking: b } as unknown as T;
  }

  const bookingIdMatch = endpoint.match(/^\/bookings\/([^/]+)$/);
  if (bookingIdMatch) {
    const id = decodeURIComponent(bookingIdMatch[1]);
    if (method === 'PATCH') {
      const b = db.bookings.find((item) => item.id === id);
      if (b) {
        if (body.guestName) b.guest = body.guestName;
        if (body.guestEmail) b.guestEmail = body.guestEmail;
        if (body.roomNumber) b.room = body.roomNumber;
        if (body.guestsCount) b.guestsCount = Number(body.guestsCount);
        if (body.checkIn) b.checkIn = body.checkIn;
        if (body.checkOut) b.checkOut = body.checkOut;
        if (body.specialReq !== undefined) b.specialReq = body.specialReq;
        saveMockDb(db);
      }
      return { booking: b } as unknown as T;
    }
    if (method === 'DELETE') {
      const b = db.bookings.find((item) => item.id === id);
      if (b) {
        b.status = 'Cancelled';
        const r = db.rooms.find((room) => room.roomNumber === b.room && room.guest === b.guest);
        if (r) {
          r.status = 'Available';
          r.guest = '';
        }
        saveMockDb(db);
      }
      return undefined as unknown as T;
    }
  }

  // 6. HOUSEKEEPING
  if (endpoint === '/housekeeping') {
    if (method === 'POST') {
      const assignedEmp = db.employees.find((e) => e.id === body.employeeId);
      const newTask = {
        id: `tsk-${Date.now().toString().slice(-4)}`,
        room: String(body.roomNumber),
        staff: assignedEmp ? assignedEmp.name : 'Unassigned',
        status: 'Pending',
        priority: body.priority === 'HIGH' ? 'High' : body.priority === 'LOW' ? 'Low' : 'Medium',
        task: String(body.title || 'Room Cleaning'),
      };
      db.tasks.unshift(newTask);
      saveMockDb(db);
      return { task: newTask } as unknown as T;
    }
    return { tasks: db.tasks } as unknown as T;
  }

  const taskMatch = endpoint.match(/^\/housekeeping\/([^/]+)$/);
  if (taskMatch && method === 'PATCH') {
    const id = decodeURIComponent(taskMatch[1]);
    const tsk = db.tasks.find((t) => t.id === id);
    if (tsk) {
      if (body.status === 'COMPLETED') {
        tsk.status = 'Completed';
        const r = db.rooms.find((room) => room.roomNumber === tsk.room);
        if (r && r.status === 'Cleaning') {
          r.status = 'Available';
          r.cleanStatus = 'Clean';
        }
      } else if (body.status === 'IN_PROGRESS') {
        tsk.status = 'In Progress';
      } else {
        tsk.status = 'Pending';
      }
      saveMockDb(db);
    }
    return { task: tsk } as unknown as T;
  }

  // 7. STAFF
  if (endpoint === '/staff') {
    if (method === 'POST') {
      const newStaff = {
        id: `emp-${Date.now().toString().slice(-4)}`,
        name: String(body.name),
        department: String(body.department || 'Front Desk'),
        email: String(body.email),
        isActive: true,
        status: 'Active',
        schedules: [{ shiftDate: shiftDate(0), startTime: '09:00', endTime: '18:00' }],
      };
      db.employees.unshift(newStaff);
      saveMockDb(db);
      return { employee: newStaff } as unknown as T;
    }
    return { employees: db.employees } as unknown as T;
  }

  const staffScheduleMatch = endpoint.match(/^\/staff\/([^/]+)\/schedules$/);
  if (staffScheduleMatch && method === 'POST') {
    const id = decodeURIComponent(staffScheduleMatch[1]);
    const staff = db.employees.find((e) => e.id === id);
    if (staff) {
      staff.schedules.unshift({
        shiftDate: String(body.shiftDate),
        startTime: String(body.startTime),
        endTime: String(body.endTime),
      });
      saveMockDb(db);
    }
    return { success: true } as unknown as T;
  }

  const staffMatch = endpoint.match(/^\/staff\/([^/]+)$/);
  if (staffMatch && method === 'PATCH') {
    const id = decodeURIComponent(staffMatch[1]);
    const staff = db.employees.find((e) => e.id === id);
    if (staff) {
      if (body.isActive !== undefined) {
        staff.isActive = Boolean(body.isActive);
        staff.status = staff.isActive ? 'Active' : 'Inactive';
      }
      saveMockDb(db);
    }
    return { employee: staff } as unknown as T;
  }

  // 8. HOTEL MEMBERSHIPS & TEAM INVITES
  if (endpoint === '/hotels/memberships') {
    return { memberships: db.hotelMembers } as unknown as T;
  }

  if (endpoint === '/hotels/invites' && method === 'POST') {
    const email = String(body.email || 'teammate@example.com');
    const role = String(body.role || 'FRONT_DESK');
    const newMember = {
      id: `mbr-${Date.now().toString().slice(-4)}`,
      userId: `usr-${Date.now().toString().slice(-4)}`,
      name: email.split('@')[0],
      email,
      role,
      createdAt: shiftDate(0),
    };
    db.hotelMembers.push(newMember);
    saveMockDb(db);
    return {
      invite: {
        inviteUrl: `${window.location.origin}/?invite=sf_inv_${Date.now()}`,
      },
    } as unknown as T;
  }

  const hotelMemberMatch = endpoint.match(/^\/hotels\/memberships\/([^/]+)$/);
  if (hotelMemberMatch) {
    const id = decodeURIComponent(hotelMemberMatch[1]);
    if (method === 'PATCH') {
      const member = db.hotelMembers.find((m) => m.id === id);
      if (member && body.role) {
        member.role = body.role;
        saveMockDb(db);
      }
      return { membership: member } as unknown as T;
    }
    if (method === 'DELETE') {
      db.hotelMembers = db.hotelMembers.filter((m) => m.id !== id);
      saveMockDb(db);
      return undefined as unknown as T;
    }
  }

  // 9. INVOICES & PAYMENTS
  if (endpoint === '/invoices') {
    return { invoices: db.invoices } as unknown as T;
  }

  const invoicePaymentMatch = endpoint.match(/^\/invoices\/([^/]+)\/payments$/);
  if (invoicePaymentMatch && method === 'POST') {
    const id = decodeURIComponent(invoicePaymentMatch[1]);
    const inv = db.invoices.find((item) => item.id === id);
    if (inv) {
      const payAmount = Number(body.amount) || 0;
      inv.amountPaid = Math.min(inv.totalDue, inv.amountPaid + payAmount);
      inv.balance = Math.max(0, inv.totalDue - inv.amountPaid);
      inv.status = inv.balance === 0 ? 'PAID' : 'PARTIAL';

      const booking = db.bookings.find((b) => b.id === inv.bookingId);
      if (booking && inv.balance === 0) {
        booking.paid = true;
      }
      saveMockDb(db);
    }
    return { invoice: inv } as unknown as T;
  }

  // 10. GUESTS
  if (endpoint === '/guests') {
    if (method === 'POST') {
      const newGuest = {
        id: `gst-${Date.now().toString().slice(-4)}`,
        name: String(body.name),
        email: String(body.email),
        phone: body.phone ? String(body.phone) : null,
      };
      db.guests.unshift(newGuest);
      saveMockDb(db);
      return { guest: newGuest } as unknown as T;
    }
    return { guests: db.guests } as unknown as T;
  }

  const guestMatch = endpoint.match(/^\/guests\/([^/]+)$/);
  if (guestMatch) {
    const id = decodeURIComponent(guestMatch[1]);
    if (method === 'PATCH') {
      const g = db.guests.find((item) => item.id === id);
      if (g) {
        if (body.name) g.name = body.name;
        if (body.email) g.email = body.email;
        if (body.phone !== undefined) g.phone = body.phone;
        saveMockDb(db);
      }
      return { guest: g } as unknown as T;
    }
    if (method === 'DELETE') {
      db.guests = db.guests.filter((item) => item.id !== id);
      saveMockDb(db);
      return undefined as unknown as T;
    }
  }

  // 11. GUEST REQUESTS
  if (endpoint === '/requests') {
    if (method === 'POST') {
      const newReq = {
        id: `req-${Date.now().toString().slice(-4)}`,
        kind: String(body.kind || 'General query'),
        details: body.details ? String(body.details) : null,
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        guest: {
          name: String(body.guestName || 'Guest'),
          email: String(body.guestEmail || 'guest@example.com'),
        },
      };
      db.requests.unshift(newReq);
      saveMockDb(db);
      return { request: newReq } as unknown as T;
    }
    return { requests: db.requests } as unknown as T;
  }

  const reqMatch = endpoint.match(/^\/requests\/([^/]+)$/);
  if (reqMatch && method === 'PATCH') {
    const id = decodeURIComponent(reqMatch[1]);
    const req = db.requests.find((item) => item.id === id);
    if (req) {
      if (body.status) req.status = body.status;
      saveMockDb(db);
    }
    return { request: req } as unknown as T;
  }

  // 12. REPORTS
  if (endpoint === '/reports') {
    const from = query.get('from') || shiftDate(-6);
    const to = query.get('to') || shiftDate(0);
    const startDate = new Date(`${from}T00:00:00.000Z`);
    const endDate = new Date(`${to}T00:00:00.000Z`);

    const daysCount = Math.max(1, Math.min(31, Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1));
    const occupancy = [];
    const revenue = [];
    let totalRoomNights = 0;
    let totalRevenue = 0;

    for (let i = 0; i < daysCount; i++) {
      const d = new Date(startDate);
      d.setUTCDate(d.getUTCDate() + i);
      const dateStr = d.toISOString().slice(0, 10);

      // determine occupancy from bookings
      const occupiedRooms = db.bookings.filter(
        (b) => b.status !== 'Cancelled' && b.checkIn <= dateStr && b.checkOut > dateStr
      ).length || Math.max(2, (i % 4) + 3);

      const rate = Math.min(100, Math.round((occupiedRooms / Math.max(1, db.rooms.length)) * 100));
      const dailyRev = occupiedRooms * 4200 + ((i * 1337) % 5000);

      occupancy.push({ date: dateStr, occupiedRooms, occupancyRate: rate });
      revenue.push({ date: dateStr, amount: dailyRev });
      totalRoomNights += occupiedRooms;
      totalRevenue += dailyRev;
    }

    return {
      occupancy,
      revenue,
      totals: {
        bookings: db.bookings.length,
        roomNights: totalRoomNights,
        revenue: totalRevenue,
      },
    } as unknown as T;
  }

  // 13. AI ASSISTANT
  if (endpoint === '/assistant') {
    const question = String(body.question || '').toLowerCase();
    let answer = '';

    const occupied = db.rooms.filter((r) => r.status === 'Occupied').length;
    const available = db.rooms.filter((r) => r.status === 'Available').length;
    const cleaning = db.rooms.filter((r) => r.status === 'Cleaning').length;
    const today = shiftDate(0);
    const todayArrivals = db.bookings.filter((b) => b.checkIn === today && ['Confirmed', 'Pending'].includes(b.status));
    const todayDepartures = db.bookings.filter((b) => b.checkOut === today && b.status === 'Checked In');
    const openTasks = db.tasks.filter((t) => t.status !== 'Completed');

    if (question.includes('room') || question.includes('occupan') || question.includes('available')) {
      answer = `Currently, ${occupied} of ${db.rooms.length} rooms are occupied (${Math.round((occupied / db.rooms.length) * 100)}% occupancy). There are ${available} rooms available and ${cleaning} rooms in housekeeping.`;
    } else if (question.includes('arrival') || question.includes('checkin') || question.includes('check in')) {
      if (todayArrivals.length) {
        const names = todayArrivals.map((a) => `${a.guest} (Room ${a.room})`).join(', ');
        answer = `Today has ${todayArrivals.length} scheduled arrival(s): ${names}.`;
      } else {
        answer = `There are no further arrivals scheduled for today.`;
      }
    } else if (question.includes('departure') || question.includes('checkout') || question.includes('check out')) {
      if (todayDepartures.length) {
        const names = todayDepartures.map((d) => `${d.guest} (Room ${d.room})`).join(', ');
        answer = `Today has ${todayDepartures.length} scheduled departure(s): ${names}.`;
      } else {
        answer = `There are no departures scheduled for today.`;
      }
    } else if (question.includes('housekeep') || question.includes('clean') || question.includes('task')) {
      if (openTasks.length) {
        const tasksStr = openTasks.map((t) => `Room ${t.room} (${t.task} - ${t.status})`).join('; ');
        answer = `There are ${openTasks.length} open housekeeping task(s): ${tasksStr}.`;
      } else {
        answer = `All housekeeping tasks are currently marked completed.`;
      }
    } else if (question.includes('revenue') || question.includes('balance') || question.includes('payment') || question.includes('invoice')) {
      const activeHotel = db.memberships.find((m) => m.hotelId === db.activeHotelId) || db.memberships[0];
      const outstanding = db.invoices.reduce((acc, inv) => acc + (inv.balance || 0), 0);
      const paid = db.invoices.reduce((acc, inv) => acc + (inv.amountPaid || 0), 0);
      answer = `Recorded payments for this period total ${activeHotel.currency} ${paid.toLocaleString()}, with an outstanding balance of ${activeHotel.currency} ${outstanding.toLocaleString()} across unfinalized folios.`;
    } else if (question.includes('staff') || question.includes('employee') || question.includes('shift')) {
      const activeStaff = db.employees.filter((e) => e.isActive);
      answer = `There are ${activeStaff.length} active staff members on duty today including Anita Roy and Suresh Kumar in Housekeeping, and Rohan Deshmukh at the Front Desk.`;
    } else {
      answer = `I am your StayFlow Hotel Assistant. I can give you real-time details on room availability, arrivals and departures, housekeeping status, staff on duty, and guest balances. How can I assist you right now?`;
    }

    return { answer } as unknown as T;
  }

  // 14. EMAIL WEBHOOKS & SIMULATION
  if (endpoint === '/emails/inbound' && method === 'POST') {
    const rawBody = String(body.body || '');
    // simple extraction heuristic
    const nameMatch = rawBody.match(/(?:guest|name|from|dear)[:\s]+([A-Za-z\s]+)/i);
    const guestName = nameMatch ? nameMatch[1].trim().split('\n')[0].slice(0, 50) : 'Guest Inquiry';
    const roomTypeMatch = rawBody.match(/(deluxe|suite|standard|king|queen|penthouse)/i);
    const roomType = roomTypeMatch ? roomTypeMatch[0] : 'Deluxe King';

    return {
      extractedBooking: {
        guestName,
        checkIn: shiftDate(1),
        checkOut: shiftDate(3),
        roomType,
        complete: true,
      },
    } as unknown as T;
  }

  if (endpoint === '/emails/outbound' && method === 'POST') {
    return { success: true, messageId: `msg-${Date.now()}` } as unknown as T;
  }

  // 15. INTEGRATIONS (GOOGLE CALENDAR)
  if (endpoint === '/integrations/google-calendar') {
    return { configured: true, connected: true } as unknown as T;
  }

  if (endpoint === '/integrations/google-calendar/connect') {
    return { authorizationUrl: `${window.location.origin}/?google-calendar-connected=true` } as unknown as T;
  }

  if (endpoint === '/integrations/google-calendar/sync') {
    return { synced: db.bookings.length, removed: 0 } as unknown as T;
  }

  if (endpoint === '/integrations/calendar/feed-token') {
    return { url: `${window.location.origin}/api/integrations/calendar/feed-sample.ics` } as unknown as T;
  }

  // Default fallback for any unhandled path
  return {} as unknown as T;
}
