// Shapes of the prototype's JS objects (grand_horizon_hotel_hms_guest_portal.html).

export type Role = 'employee';

export interface Session {
  role: Role;
  name: string;
  email: string;
  title: string;
  userId: string;
  hotelId: string;
  hotelName: string;
  membershipRole: string;
}

export interface HotelMembership {
  hotelId: string;
  hotelName: string;
  subdomain: string;
  currency: string;
  timeZone: string;
  role: string;
}

export interface Room {
  id: string;
  roomNumber: string;
  type: string;
  rate: number;
  status: string; // 'Available' | 'Occupied' | 'Cleaning' | 'Maintenance'
  guest: string;
  cleanStatus: string;
}

export interface Reservation {
  id: string;
  guest: string;
  room: string;
  guestsCount: number;
  checkIn: string;
  checkOut: string;
  status: string; // 'Confirmed' | 'Checked In' | 'Checked Out'
  paid: boolean;
  specialReq?: string;
  guestEmail?: string;
}

export interface HousekeepingTask {
  id: string;
  room: string;
  staff: string;
  status: string; // 'Pending' | 'In Progress' | 'Completed'
  priority: string;
  task: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  shift: string;
  status: string;
}

export interface ChatMessage {
  id: number;
  sender: 'ai' | 'user';
  text: string;
  time: string;
}

export interface Toast {
  id: number;
  message: string;
  visible: boolean;
}

export type TabId = 'overview' | 'rooms' | 'bookings' | 'guests' | 'reports' | 'housekeeping' | 'staff' | 'billing';
export type TodayFilter = 'all' | 'checkin' | 'checkout';
