import { Router } from "express";
import { MembershipRole } from "../generated/prisma/client.js";
import { getPrisma } from "../lib/prisma.js";
import { canOperate, hotelId, requireHotelMember } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
import { routeParam } from "../middleware/routeParam.js";
import { listHotelBookings, serializeBooking } from "../repositories/bookings.js";
import { cancelBooking, checkInBooking, checkOutBooking, createBooking, updateBooking, type CreateBookingInput } from "../services/bookings.js";
import { z } from "zod";

export const bookingsRouter = Router();
const createSchema = z.object({
  guestName: z.string().trim().min(2).max(255),
  guestEmail: z.string().trim().email().max(255),
  guestPhone: z.string().trim().max(50).optional(),
  roomNumber: z.string().trim().min(1).max(50),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guestsCount: z.coerce.number().int().min(1).max(20),
  specialReq: z.string().trim().max(4000).optional(),
});

bookingsRouter.get("/", requireHotelMember(), async (request, response) => {
  const bookings = await listHotelBookings(hotelId(request));
  response.json({ bookings: bookings.map(serializeBooking) });
});

bookingsRouter.post("/", requireHotelMember(...canOperate), async (request, response) => {
  const input = createSchema.parse(request.body);
  const booking = await createBooking(hotelId(request), {
    guestName: input.guestName,
    guestEmail: input.guestEmail,
    roomNumber: input.roomNumber,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guestsCount: input.guestsCount,
    ...(input.guestPhone ? { guestPhone: input.guestPhone } : {}),
    ...(input.specialReq !== undefined ? { specialReq: input.specialReq } : {}),
  });
  response.status(201).json({ booking: serializeBooking(booking) });
});

bookingsRouter.patch("/:bookingId", requireHotelMember(...canOperate), async (request, response) => {
  const input = createSchema.partial().refine((data) => Object.keys(data).length > 0, "Provide at least one field to update.").parse(request.body);
  const safeInput: Partial<CreateBookingInput> = {
    ...(input.guestName !== undefined ? { guestName: input.guestName } : {}),
    ...(input.guestEmail !== undefined ? { guestEmail: input.guestEmail } : {}),
    ...(input.guestPhone !== undefined ? { guestPhone: input.guestPhone } : {}),
    ...(input.roomNumber !== undefined ? { roomNumber: input.roomNumber } : {}),
    ...(input.checkIn !== undefined ? { checkIn: input.checkIn } : {}),
    ...(input.checkOut !== undefined ? { checkOut: input.checkOut } : {}),
    ...(input.guestsCount !== undefined ? { guestsCount: input.guestsCount } : {}),
    ...(input.specialReq !== undefined ? { specialReq: input.specialReq } : {}),
  };
  const booking = await updateBooking(hotelId(request), routeParam(request, "bookingId"), safeInput);
  response.json({ booking: serializeBooking(booking) });
});

bookingsRouter.post("/:bookingId/check-in", requireHotelMember(...canOperate), async (request, response) => {
  const booking = await checkInBooking(hotelId(request), routeParam(request, "bookingId"));
  response.json({ booking: serializeBooking(booking) });
});

bookingsRouter.post("/:bookingId/check-out", requireHotelMember(...canOperate), async (request, response) => {
  const booking = await checkOutBooking(hotelId(request), routeParam(request, "bookingId"));
  response.json({ booking: serializeBooking(booking) });
});

bookingsRouter.delete("/:bookingId", requireHotelMember(...canOperate), async (request, response) => {
  await cancelBooking(hotelId(request), routeParam(request, "bookingId"));
  response.status(204).end();
});

bookingsRouter.get("/:bookingId", requireHotelMember(), async (request, response) => {
  const booking = await getPrisma().booking.findFirst({
    where: { id: routeParam(request, "bookingId"), hotelId: hotelId(request) },
    include: { guest: true, roomReservations: { include: { room: { include: { roomType: true } } } }, invoice: { include: { payments: true } } },
  });
  if (!booking) throw new HttpError(404, "Booking not found.", "BOOKING_NOT_FOUND");
  response.json({ booking: serializeBooking(booking) });
});
