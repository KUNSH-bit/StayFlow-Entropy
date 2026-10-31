import { BookingStatus, HousekeepingStatus, Prisma, RoomStatus } from "../generated/prisma/client.js";
import { getPrisma } from "../lib/prisma.js";
import { localDate } from "../lib/time.js";
import { HttpError } from "../middleware/errorHandler.js";
import { activeBookingStatuses } from "../repositories/bookings.js";

export interface CreateBookingInput {
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  roomNumber: string;
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  specialReq?: string;
  source?: string;
}

function dateOnly(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new HttpError(400, "Dates must use YYYY-MM-DD format.", "INVALID_DATE");
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new HttpError(400, "A booking date is invalid.", "INVALID_DATE");
  return parsed;
}

export async function createBooking(hotelId: string, input: CreateBookingInput) {
  const checkInDate = dateOnly(input.checkIn);
  const checkOutDate = dateOnly(input.checkOut);
  const nights = Math.round((checkOutDate.getTime() - checkInDate.getTime()) / 86_400_000);
  if (nights <= 0) throw new HttpError(400, "Check-out must be after check-in.", "INVALID_STAY_DATES");

  return getPrisma().$transaction(async (tx) => {
    const room = await tx.room.findUnique({
      where: { hotelId_roomNumber: { hotelId, roomNumber: input.roomNumber } },
      include: { roomType: true },
    });
    if (!room) throw new HttpError(404, "The selected room was not found.", "ROOM_NOT_FOUND");
    if (input.guestsCount > room.roomType.maxCapacity) throw new HttpError(400, "Guest count exceeds this room's capacity.", "ROOM_CAPACITY_EXCEEDED");
    const unavailableStatuses = new Set<RoomStatus>([RoomStatus.OCCUPIED, RoomStatus.CLEANING, RoomStatus.DIRTY, RoomStatus.MAINTENANCE]);
    if (unavailableStatuses.has(room.status)) {
      throw new HttpError(409, "This room is not currently available for reservations.", "ROOM_UNAVAILABLE");
    }

    const conflict = await tx.roomReservation.findFirst({
      where: {
        hotelId,
        roomId: room.id,
        booking: {
          status: { in: activeBookingStatuses },
          checkInDate: { lt: checkOutDate },
          checkOutDate: { gt: checkInDate },
        },
      },
      select: { id: true },
    });
    if (conflict) throw new HttpError(409, "The room is already reserved for part of those dates.", "BOOKING_CONFLICT");

    const guestEmail = input.guestEmail.toLowerCase();
    const guest = await tx.guest.upsert({
      where: { hotelId_email: { hotelId, email: guestEmail } },
      create: { hotelId, name: input.guestName, email: guestEmail, ...(input.guestPhone ? { phone: input.guestPhone } : {}) },
      update: { name: input.guestName, ...(input.guestPhone ? { phone: input.guestPhone } : {}) },
    });
    const totalAmount = room.roomType.basePrice.mul(nights);
    const booking = await tx.booking.create({
      data: {
        hotelId,
        guestId: guest.id,
        checkInDate,
        checkOutDate,
        guestsCount: input.guestsCount,
        totalAmount,
        specialReq: input.specialReq || null,
        source: input.source ?? "DIRECT",
        status: BookingStatus.CONFIRMED,
      },
    });
    await tx.roomReservation.create({ data: { hotelId, bookingId: booking.id, roomId: room.id } });
    await tx.invoice.create({ data: { hotelId, bookingId: booking.id, totalDue: totalAmount } });
    return tx.booking.findFirstOrThrow({
      where: { hotelId, id: booking.id },
      include: { guest: true, roomReservations: { include: { room: { include: { roomType: true } } } }, invoice: { include: { payments: true } } },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function updateBooking(hotelId: string, bookingId: string, input: Partial<CreateBookingInput>) {
  return getPrisma().$transaction(async (tx) => {
    const current = await tx.booking.findFirst({
      where: { hotelId, id: bookingId },
      include: { guest: true, roomReservations: { include: { room: { include: { roomType: true } } } }, invoice: { include: { payments: true } } },
    });
    if (!current) throw new HttpError(404, "Booking not found.", "BOOKING_NOT_FOUND");
    if (current.status !== BookingStatus.CONFIRMED && current.status !== BookingStatus.PENDING) throw new HttpError(409, "Only a future reservation can be edited.", "INVALID_BOOKING_TRANSITION");

    const checkInDate = input.checkIn ? dateOnly(input.checkIn) : current.checkInDate;
    const checkOutDate = input.checkOut ? dateOnly(input.checkOut) : current.checkOutDate;
    const nights = Math.round((checkOutDate.getTime() - checkInDate.getTime()) / 86_400_000);
    if (nights <= 0) throw new HttpError(400, "Check-out must be after check-in.", "INVALID_STAY_DATES");
    const roomNumber = input.roomNumber ?? current.roomReservations[0]?.room.roomNumber;
    if (!roomNumber) throw new HttpError(409, "This reservation has no assigned room.", "ROOM_NOT_ASSIGNED");
    const room = await tx.room.findUnique({ where: { hotelId_roomNumber: { hotelId, roomNumber } }, include: { roomType: true } });
    if (!room) throw new HttpError(404, "The selected room was not found.", "ROOM_NOT_FOUND");
    const guestsCount = input.guestsCount ?? current.guestsCount;
    if (guestsCount > room.roomType.maxCapacity) throw new HttpError(400, "Guest count exceeds this room's capacity.", "ROOM_CAPACITY_EXCEEDED");
    if (room.status === RoomStatus.OCCUPIED || room.status === RoomStatus.CLEANING || room.status === RoomStatus.DIRTY || room.status === RoomStatus.MAINTENANCE) {
      throw new HttpError(409, "This room is not currently available for reservations.", "ROOM_UNAVAILABLE");
    }
    const conflict = await tx.roomReservation.findFirst({
      where: {
        hotelId,
        roomId: room.id,
        bookingId: { not: current.id },
        booking: { status: { in: activeBookingStatuses }, checkInDate: { lt: checkOutDate }, checkOutDate: { gt: checkInDate } },
      },
      select: { id: true },
    });
    if (conflict) throw new HttpError(409, "The room is already reserved for part of those dates.", "BOOKING_CONFLICT");

    const guestName = input.guestName ?? current.guest.name;
    const guestEmail = (input.guestEmail ?? current.guest.email).toLowerCase();
    const guest = await tx.guest.upsert({
      where: { hotelId_email: { hotelId, email: guestEmail } },
      create: { hotelId, name: guestName, email: guestEmail, ...(input.guestPhone ? { phone: input.guestPhone } : {}) },
      update: { name: guestName, ...(input.guestPhone ? { phone: input.guestPhone } : {}) },
    });
    const totalAmount = room.roomType.basePrice.mul(nights);
    const amountPaid = current.invoice?.payments.reduce((sum, payment) => sum.plus(payment.amount), new Prisma.Decimal(0)) ?? new Prisma.Decimal(0);
    if (amountPaid.greaterThan(totalAmount)) throw new HttpError(409, "The new reservation total cannot be lower than payments already recorded.", "PAYMENTS_EXCEED_NEW_TOTAL");
    await tx.roomReservation.deleteMany({ where: { hotelId, bookingId: current.id } });
    await tx.booking.update({
      where: { id: current.id },
      data: {
        guestId: guest.id,
        checkInDate,
        checkOutDate,
        guestsCount,
        totalAmount,
        ...(input.specialReq !== undefined ? { specialReq: input.specialReq || null } : {}),
      },
    });
    await tx.roomReservation.create({ data: { hotelId, bookingId: current.id, roomId: room.id } });
    if (current.invoice) await tx.invoice.update({ where: { id: current.invoice.id }, data: { totalDue: totalAmount } });
    else await tx.invoice.create({ data: { hotelId, bookingId: current.id, totalDue: totalAmount } });
    return tx.booking.findFirstOrThrow({
      where: { hotelId, id: current.id },
      include: { guest: true, roomReservations: { include: { room: { include: { roomType: true } } } }, invoice: { include: { payments: true } } },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function checkInBooking(hotelId: string, bookingId: string) {
  const booking = await getPrisma().$transaction(async (tx) => {
    const current = await tx.booking.findFirst({
      where: { hotelId, id: bookingId },
      include: { roomReservations: true },
    });
    if (!current) throw new HttpError(404, "Booking not found.", "BOOKING_NOT_FOUND");
    if (current.status !== BookingStatus.CONFIRMED && current.status !== BookingStatus.PENDING) {
      throw new HttpError(409, "Only a confirmed booking can be checked in.", "INVALID_BOOKING_TRANSITION");
    }
    const hotel = await tx.hotel.findUniqueOrThrow({ where: { id: hotelId }, select: { timeZone: true } });
    const today = localDate(new Date(), hotel.timeZone);
    if (current.checkInDate.toISOString().slice(0, 10) > today) throw new HttpError(409, "This guest is not scheduled to arrive yet.", "CHECK_IN_TOO_EARLY");
    if (current.checkOutDate.toISOString().slice(0, 10) <= today) throw new HttpError(409, "The scheduled checkout date has passed; this reservation cannot be checked in.", "CHECK_IN_TOO_LATE");
    await tx.booking.update({ where: { id: current.id }, data: { status: BookingStatus.CHECKED_IN } });
    for (const reservation of current.roomReservations) {
      await tx.room.update({ where: { id: reservation.roomId }, data: { status: RoomStatus.OCCUPIED } });
    }
    return current;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  return getPrisma().booking.findFirstOrThrow({
    where: { id: booking.id, hotelId },
    include: { guest: true, roomReservations: { include: { room: { include: { roomType: true } } } }, invoice: { include: { payments: true } } },
  });
}

export async function checkOutBooking(hotelId: string, bookingId: string) {
  const booking = await getPrisma().$transaction(async (tx) => {
    const current = await tx.booking.findFirst({ where: { hotelId, id: bookingId }, include: { roomReservations: true } });
    if (!current) throw new HttpError(404, "Booking not found.", "BOOKING_NOT_FOUND");
    if (current.status !== BookingStatus.CHECKED_IN) throw new HttpError(409, "Only an in-house guest can be checked out.", "INVALID_BOOKING_TRANSITION");
    await tx.booking.update({ where: { id: current.id }, data: { status: BookingStatus.CHECKED_OUT } });
    for (const reservation of current.roomReservations) {
      await tx.room.update({ where: { id: reservation.roomId }, data: { status: RoomStatus.DIRTY } });
      await tx.housekeepingTask.create({
        data: { hotelId, roomId: reservation.roomId, title: "Checkout cleaning", priority: "HIGH", status: HousekeepingStatus.PENDING },
      });
    }
    return current;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  return getPrisma().booking.findFirstOrThrow({
    where: { id: booking.id, hotelId },
    include: { guest: true, roomReservations: { include: { room: { include: { roomType: true } } } }, invoice: { include: { payments: true } } },
  });
}

export async function cancelBooking(hotelId: string, bookingId: string) {
  return getPrisma().$transaction(async (tx) => {
    const current = await tx.booking.findFirst({ where: { hotelId, id: bookingId }, include: { invoice: { include: { payments: true } } } });
    if (!current) throw new HttpError(404, "Booking not found.", "BOOKING_NOT_FOUND");
    if (current.status === BookingStatus.CHECKED_IN || current.status === BookingStatus.CHECKED_OUT) {
      throw new HttpError(409, "An active or completed stay cannot be cancelled.", "INVALID_BOOKING_TRANSITION");
    }
    if (current.invoice?.payments.length) throw new HttpError(409, "This booking has recorded payments. Reconcile or refund them before cancelling.", "BOOKING_HAS_PAYMENTS");
    if (current.invoice) await tx.invoice.update({ where: { id: current.invoice.id }, data: { isVoided: true } });
    return tx.booking.update({ where: { id: current.id }, data: { status: BookingStatus.CANCELLED } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
