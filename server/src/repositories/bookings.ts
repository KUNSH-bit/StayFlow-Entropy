import { BookingStatus, type Prisma } from "../generated/prisma/client.js";
import { getPrisma } from "../lib/prisma.js";

export const activeBookingStatuses: BookingStatus[] = [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN];

export async function listHotelBookings(hotelId: string) {
  return getPrisma().booking.findMany({
    where: { hotelId },
    include: {
      guest: true,
      roomReservations: { include: { room: { include: { roomType: true } } } },
      invoice: { include: { payments: true } },
    },
    orderBy: [{ checkInDate: "desc" }, { createdAt: "desc" }],
    take: 500,
  });
}

export function serializeBooking(booking: {
  id: string;
  status: BookingStatus;
  checkInDate: Date;
  checkOutDate: Date;
  guestsCount: number;
  totalAmount: Prisma.Decimal;
  specialReq: string | null;
  guest: { id: string; name: string; email: string; phone: string | null };
  roomReservations: Array<{ room: { id: string; roomNumber: string; roomType: { name: string; basePrice: Prisma.Decimal } } }>;
  invoice: { id: string; totalDue: Prisma.Decimal; isVoided: boolean; payments: Array<{ amount: Prisma.Decimal }> } | null;
}) {
  const paidAmount = booking.invoice?.isVoided ? 0 : booking.invoice?.payments.reduce((sum, payment) => sum + Number(payment.amount), 0) ?? 0;
  return {
    id: booking.id,
    guest: booking.guest.name,
    guestEmail: booking.guest.email,
    room: booking.roomReservations[0]?.room.roomNumber ?? "",
    roomId: booking.roomReservations[0]?.room.id ?? "",
    roomType: booking.roomReservations[0]?.room.roomType.name ?? "",
    guestsCount: booking.guestsCount,
    checkIn: booking.checkInDate.toISOString().slice(0, 10),
    checkOut: booking.checkOutDate.toISOString().slice(0, 10),
    status: booking.status,
    totalAmount: Number(booking.totalAmount),
    paid: booking.invoice ? paidAmount >= Number(booking.invoice.totalDue) : false,
    amountPaid: paidAmount,
    invoiceId: booking.invoice?.id ?? null,
    invoiceStatus: booking.invoice?.isVoided ? "VOID" : booking.invoice ? (paidAmount >= Number(booking.invoice.totalDue) ? "PAID" : "OPEN") : "NONE",
    specialReq: booking.specialReq ?? "",
  };
}
