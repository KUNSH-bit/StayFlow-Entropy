import { Router } from "express";
import { BookingStatus, RoomStatus } from "../generated/prisma/client.js";
import { getPrisma } from "../lib/prisma.js";
import { localDate, localDateTimeToUtc } from "../lib/time.js";
import { hotelId, requireHotelMember } from "../middleware/auth.js";

export const dashboardRouter = Router();

dashboardRouter.get("/", requireHotelMember(), async (request, response) => {
  const id = hotelId(request);
  const db = getPrisma();
  const hotel = await db.hotel.findUniqueOrThrow({ where: { id } });
  const today = localDate(new Date(), hotel.timeZone);
  const todayDate = new Date(`${today}T00:00:00.000Z`);
  const monthStart = localDateTimeToUtc(`${today.slice(0, 7)}-01`, hotel.timeZone);
  const [rooms, arrivals, departures, inHouse, upcoming, paymentTotals, unpaidInvoices, openTasks] = await Promise.all([
    db.room.findMany({ where: { hotelId: id }, select: { status: true } }),
    db.booking.count({ where: { hotelId: id, checkInDate: todayDate, status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] } } }),
    db.booking.count({ where: { hotelId: id, checkOutDate: todayDate, status: BookingStatus.CHECKED_IN } }),
    db.booking.count({ where: { hotelId: id, status: BookingStatus.CHECKED_IN } }),
    db.booking.findMany({
      where: { hotelId: id, status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING, BookingStatus.CHECKED_IN] }, checkOutDate: { gte: todayDate } },
      include: { guest: true, roomReservations: { include: { room: true } } },
      orderBy: { checkInDate: "asc" }, take: 8,
    }),
    db.payment.aggregate({ where: { hotelId: id, createdAt: { gte: monthStart } }, _sum: { amount: true } }),
    db.invoice.findMany({ where: { hotelId: id, isVoided: false }, include: { payments: true } }),
    db.housekeepingTask.count({ where: { hotelId: id, status: { in: ["PENDING", "IN_PROGRESS"] } } }),
  ]);
  const outstanding = unpaidInvoices.reduce((sum, invoice) => {
    const paid = invoice.payments.reduce((paymentSum, payment) => paymentSum + Number(payment.amount), 0);
    return sum + Math.max(0, Number(invoice.totalDue) - paid);
  }, 0);
  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter((room) => room.status === RoomStatus.OCCUPIED).length;
  response.json({
    hotel: { id: hotel.id, name: hotel.name, currency: hotel.currency, timeZone: hotel.timeZone, today },
    stats: {
      totalRooms,
      occupiedRooms,
      occupancyRate: totalRooms === 0 ? 0 : Math.round((occupiedRooms / totalRooms) * 100),
      arrivals,
      departures,
      inHouse,
      revenueThisMonth: Number(paymentTotals._sum.amount ?? 0),
      outstandingBalance: outstanding,
      openHousekeepingTasks: openTasks,
    },
    upcomingBookings: upcoming.map((booking) => ({
      id: booking.id,
      guest: booking.guest.name,
      room: booking.roomReservations[0]?.room.roomNumber ?? "",
      checkIn: booking.checkInDate.toISOString().slice(0, 10),
      checkOut: booking.checkOutDate.toISOString().slice(0, 10),
      status: booking.status,
    })),
  });
});
