import { Router } from "express";
import { BookingStatus, HousekeepingStatus, MembershipRole, Prisma, RoomStatus } from "../generated/prisma/client.js";
import { getPrisma } from "../lib/prisma.js";
import { localDate, localDateTimeToUtc } from "../lib/time.js";
import { canManage, canOperate, hotelId, requireHotelMember } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
import { routeParam } from "../middleware/routeParam.js";
import { z } from "zod";

export const guestsRouter = Router();
export const staffRouter = Router();
export const housekeepingRouter = Router();
export const invoicesRouter = Router();
export const requestsRouter = Router();
export const reportsRouter = Router();

const guestSchema = z.object({ name: z.string().trim().min(2).max(255), email: z.string().trim().email().max(255), phone: z.string().trim().max(50).optional() });
guestsRouter.get("/", requireHotelMember(), async (request, response) => {
  const query = typeof request.query.q === "string" ? request.query.q.trim() : "";
  const guests = await getPrisma().guest.findMany({
    where: { hotelId: hotelId(request), ...(query ? { OR: [{ name: { contains: query, mode: "insensitive" } }, { email: { contains: query, mode: "insensitive" } }] } : {}) },
    orderBy: { name: "asc" }, take: 250,
  });
  response.json({ guests });
});
guestsRouter.post("/", requireHotelMember(...canOperate), async (request, response) => {
  const input = guestSchema.parse(request.body);
  const id = hotelId(request);
  const guest = await getPrisma().guest.upsert({
    where: { hotelId_email: { hotelId: id, email: input.email.toLowerCase() } },
    create: { hotelId: id, name: input.name, email: input.email.toLowerCase(), ...(input.phone ? { phone: input.phone } : {}) },
    update: { name: input.name, ...(input.phone ? { phone: input.phone } : {}) },
  });
  response.status(201).json({ guest });
});
guestsRouter.patch("/:guestId", requireHotelMember(...canOperate), async (request, response) => {
  const input = z.object({ name: z.string().trim().min(2).max(255).optional(), email: z.string().trim().email().max(255).optional(), phone: z.string().trim().max(50).nullable().optional() }).refine((value) => Object.keys(value).length > 0).parse(request.body);
  const id = hotelId(request);
  const guest = await getPrisma().guest.findFirst({ where: { id: routeParam(request, "guestId"), hotelId: id } });
  if (!guest) throw new HttpError(404, "Guest not found.", "GUEST_NOT_FOUND");
  const updated = await getPrisma().guest.update({ where: { id: guest.id }, data: {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.email !== undefined ? { email: input.email.toLowerCase() } : {}),
    ...(input.phone !== undefined ? { phone: input.phone } : {}),
  } });
  response.json({ guest: updated });
});
guestsRouter.delete("/:guestId", requireHotelMember(...canManage), async (request, response) => {
  const id = hotelId(request);
  const guest = await getPrisma().guest.findFirst({ where: { id: routeParam(request, "guestId"), hotelId: id }, include: { _count: { select: { bookings: true } } } });
  if (!guest) throw new HttpError(404, "Guest not found.", "GUEST_NOT_FOUND");
  if (guest._count.bookings > 0) throw new HttpError(409, "A guest with reservation history cannot be deleted.", "GUEST_HAS_BOOKINGS");
  await getPrisma().guest.delete({ where: { id: guest.id } });
  response.status(204).end();
});

const employeeSchema = z.object({ name: z.string().trim().min(2).max(255), department: z.string().trim().min(2).max(100), email: z.string().trim().email().max(255) });
staffRouter.get("/", requireHotelMember(), async (request, response) => {
  const id = hotelId(request);
  const hotel = await getPrisma().hotel.findUniqueOrThrow({ where: { id }, select: { timeZone: true } });
  const today = new Date(`${localDate(new Date(), hotel.timeZone)}T00:00:00.000Z`);
  const employees = await getPrisma().employee.findMany({ where: { hotelId: id }, include: { schedules: { where: { shiftDate: { gte: today } }, orderBy: { shiftDate: "asc" }, take: 8 } }, orderBy: [{ isActive: "desc" }, { name: "asc" }] });
  response.json({ employees: employees.map((employee) => ({ ...employee, status: employee.isActive ? "Active" : "Inactive" })) });
});
staffRouter.post("/", requireHotelMember(...canManage), async (request, response) => {
  const input = employeeSchema.parse(request.body);
  const employee = await getPrisma().employee.create({ data: { hotelId: hotelId(request), ...input, email: input.email.toLowerCase() } });
  response.status(201).json({ employee });
});
staffRouter.post("/:employeeId/schedules", requireHotelMember(...canManage), async (request, response) => {
  const input = z.object({ shiftDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), notes: z.string().trim().max(500).optional() }).parse(request.body);
  if (input.endTime <= input.startTime) throw new HttpError(400, "Shift end time must be after start time.", "INVALID_SHIFT");
  const id = hotelId(request);
  const employee = await getPrisma().employee.findFirst({ where: { id: routeParam(request, "employeeId"), hotelId: id, isActive: true }, select: { id: true } });
  if (!employee) throw new HttpError(404, "Active staff member not found.", "EMPLOYEE_NOT_FOUND");
  const shiftDate = dateKey(input.shiftDate, "shiftDate");
  const overlap = await getPrisma().staffSchedule.findFirst({ where: { hotelId: id, employeeId: employee.id, shiftDate, startTime: { lt: input.endTime }, endTime: { gt: input.startTime } }, select: { id: true } });
  if (overlap) throw new HttpError(409, "This shift overlaps a shift already assigned to the staff member.", "SHIFT_CONFLICT");
  const schedule = await getPrisma().staffSchedule.create({ data: { hotelId: id, employeeId: employee.id, shiftDate, startTime: input.startTime, endTime: input.endTime, ...(input.notes ? { notes: input.notes } : {}) } });
  response.status(201).json({ schedule });
});
staffRouter.patch("/:employeeId", requireHotelMember(...canManage), async (request, response) => {
  const input = z.object({ isActive: z.boolean() }).parse(request.body);
  const id = hotelId(request);
  const employee = await getPrisma().employee.findFirst({ where: { id: routeParam(request, "employeeId"), hotelId: id } });
  if (!employee) throw new HttpError(404, "Staff member not found.", "EMPLOYEE_NOT_FOUND");
  response.json({ employee: await getPrisma().employee.update({ where: { id: employee.id }, data: input }) });
});

housekeepingRouter.get("/", requireHotelMember(), async (request, response) => {
  const tasks = await getPrisma().housekeepingTask.findMany({ where: { hotelId: hotelId(request) }, include: { room: true, employee: true }, orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 250 });
  response.json({ tasks: tasks.map((task) => ({ id: task.id, roomId: task.roomId, room: task.room.roomNumber, staff: task.employee?.name ?? "Unassigned", employeeId: task.employeeId, status: task.status, priority: task.priority, task: task.title, createdAt: task.createdAt })) });
});
housekeepingRouter.post("/", requireHotelMember(...canOperate), async (request, response) => {
  const input = z.object({ roomNumber: z.string().trim().min(1).max(50), title: z.string().trim().min(2).max(255), priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"), employeeId: z.string().uuid().optional() }).parse(request.body);
  const id = hotelId(request);
  const room = await getPrisma().room.findUnique({ where: { hotelId_roomNumber: { hotelId: id, roomNumber: input.roomNumber } }, select: { id: true } });
  if (!room) throw new HttpError(404, "Room not found.", "ROOM_NOT_FOUND");
  if (input.employeeId && !await getPrisma().employee.findFirst({ where: { id: input.employeeId, hotelId: id, isActive: true } })) throw new HttpError(404, "Active staff member not found.", "EMPLOYEE_NOT_FOUND");
  const task = await getPrisma().housekeepingTask.create({ data: { hotelId: id, roomId: room.id, title: input.title, priority: input.priority, ...(input.employeeId ? { employeeId: input.employeeId } : {}) } });
  response.status(201).json({ task });
});
housekeepingRouter.patch("/:taskId", requireHotelMember(MembershipRole.OWNER, MembershipRole.MANAGER, MembershipRole.FRONT_DESK, MembershipRole.HOUSEKEEPING), async (request, response) => {
  const input = z.object({ status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]), employeeId: z.string().uuid().nullable().optional() }).parse(request.body);
  const id = hotelId(request);
  const task = await getPrisma().housekeepingTask.findFirst({ where: { id: routeParam(request, "taskId"), hotelId: id } });
  if (!task) throw new HttpError(404, "Housekeeping task not found.", "TASK_NOT_FOUND");
  if (input.employeeId && !await getPrisma().employee.findFirst({ where: { id: input.employeeId, hotelId: id, isActive: true } })) throw new HttpError(404, "Active staff member not found.", "EMPLOYEE_NOT_FOUND");
  const updated = await getPrisma().$transaction(async (tx) => {
    const value = await tx.housekeepingTask.update({ where: { id: task.id }, data: { status: input.status as HousekeepingStatus, ...(input.employeeId !== undefined ? { employeeId: input.employeeId } : {}) } });
    if (input.status === "COMPLETED") {
      const openTask = await tx.housekeepingTask.count({ where: { hotelId: id, roomId: task.roomId, status: { in: [HousekeepingStatus.PENDING, HousekeepingStatus.IN_PROGRESS] } } });
      if (openTask === 0) await tx.room.updateMany({ where: { id: task.roomId, hotelId: id, status: { in: [RoomStatus.DIRTY, RoomStatus.CLEANING] } }, data: { status: RoomStatus.INSPECTED } });
    }
    return value;
  });
  response.json({ task: updated });
});

invoicesRouter.get("/", requireHotelMember(), async (request, response) => {
  const invoices = await getPrisma().invoice.findMany({ where: { hotelId: hotelId(request) }, include: { booking: { include: { guest: true, roomReservations: { include: { room: true } } } }, payments: true }, orderBy: { createdAt: "desc" }, take: 500 });
  response.json({ invoices: invoices.map((invoice) => {
    const paid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    return { id: invoice.id, bookingId: invoice.bookingId, guest: invoice.booking.guest.name, room: invoice.booking.roomReservations[0]?.room.roomNumber ?? "", totalDue: Number(invoice.totalDue), amountPaid: paid, balance: invoice.isVoided ? 0 : Math.max(0, Number(invoice.totalDue) - paid), status: invoice.isVoided ? "VOID" : paid >= Number(invoice.totalDue) ? "PAID" : "UNPAID", dueAt: invoice.dueAt };
  }) });
});
invoicesRouter.post("/:invoiceId/payments", requireHotelMember(...canOperate), async (request, response) => {
  const input = z.object({ amount: z.coerce.number().positive().max(10_000_000), method: z.enum(["CASH", "CARD", "BANK_TRANSFER", "UPI", "OTHER"]), reference: z.string().trim().max(255).optional() }).parse(request.body);
  const id = hotelId(request);
  const result = await getPrisma().$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({ where: { id: routeParam(request, "invoiceId"), hotelId: id }, include: { payments: true } });
    if (!invoice) throw new HttpError(404, "Invoice not found.", "INVOICE_NOT_FOUND");
    if (invoice.isVoided) throw new HttpError(409, "Payments cannot be recorded on a voided invoice.", "INVOICE_VOIDED");
    const paid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const balance = Number(invoice.totalDue) - paid;
    if (input.amount > balance + 0.001) throw new HttpError(400, "Payment cannot exceed the outstanding balance.", "PAYMENT_EXCEEDS_BALANCE");
    const payment = await tx.payment.create({ data: { hotelId: id, invoiceId: invoice.id, amount: input.amount, method: input.method, ...(input.reference ? { reference: input.reference } : {}) } });
    return { payment, balance: Math.max(0, balance - input.amount) };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  response.status(201).json(result);
});

requestsRouter.get("/", requireHotelMember(), async (request, response) => {
  const requests = await getPrisma().guestRequest.findMany({ where: { hotelId: hotelId(request) }, include: { guest: true }, orderBy: { createdAt: "desc" }, take: 250 });
  response.json({ requests });
});
requestsRouter.post("/", requireHotelMember(...canOperate), async (request, response) => {
  const input = z.object({ guestEmail: z.string().trim().email(), guestName: z.string().trim().min(2).max(255), kind: z.string().trim().min(2).max(100), details: z.string().trim().max(4000).optional() }).parse(request.body);
  const id = hotelId(request);
  const guest = await getPrisma().guest.findUnique({ where: { hotelId_email: { hotelId: id, email: input.guestEmail.toLowerCase() } } });
  if (!guest || guest.name.toLowerCase() !== input.guestName.toLowerCase()) throw new HttpError(404, "Guest details did not match a hotel guest record.", "GUEST_NOT_FOUND");
  const activeBooking = await getPrisma().booking.findFirst({ where: { hotelId: id, guestId: guest.id, status: BookingStatus.CHECKED_IN }, select: { id: true } });
  const item = await getPrisma().guestRequest.create({ data: { hotelId: id, guestId: guest.id, kind: input.kind, ...(input.details ? { details: input.details } : {}), ...(activeBooking ? { bookingId: activeBooking.id } : {}) } });
  response.status(201).json({ request: item });
});
requestsRouter.patch("/:requestId", requireHotelMember(...canOperate), async (request, response) => {
  const input = z.object({ status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"]) }).parse(request.body);
  const id = hotelId(request);
  const item = await getPrisma().guestRequest.findFirst({ where: { id: routeParam(request, "requestId"), hotelId: id } });
  if (!item) throw new HttpError(404, "Guest request not found.", "REQUEST_NOT_FOUND");
  response.json({ request: await getPrisma().guestRequest.update({ where: { id: item.id }, data: input }) });
});

function dateKey(value: string, field: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new HttpError(400, `${field} must use YYYY-MM-DD format.`, "INVALID_DATE");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new HttpError(400, `${field} is invalid.`, "INVALID_DATE");
  return date;
}
reportsRouter.get("/", requireHotelMember(), async (request, response) => {
  const parsed = z.object({ from: z.string(), to: z.string() }).safeParse(request.query);
  if (!parsed.success) throw new HttpError(400, "Provide from and to dates for the report.", "INVALID_REPORT_RANGE");
  const from = dateKey(parsed.data.from, "from");
  const to = dateKey(parsed.data.to, "to");
  const days = (to.getTime() - from.getTime()) / 86_400_000 + 1;
  if (days < 1 || days > 366) throw new HttpError(400, "Report range must be between 1 and 366 days.", "INVALID_REPORT_RANGE");
  const id = hotelId(request);
  const hotel = await getPrisma().hotel.findUniqueOrThrow({ where: { id }, select: { timeZone: true } });
  const paymentFrom = localDateTimeToUtc(parsed.data.from, hotel.timeZone);
  const dayAfterTo = new Date(to.getTime() + 86_400_000).toISOString().slice(0, 10);
  const paymentUntil = localDateTimeToUtc(dayAfterTo, hotel.timeZone);
  const [bookings, rooms, payments] = await Promise.all([
    getPrisma().booking.findMany({ where: { hotelId: id, status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] }, checkInDate: { lte: to }, checkOutDate: { gt: from } }, include: { roomReservations: true } }),
    getPrisma().room.count({ where: { hotelId: id } }),
    getPrisma().payment.findMany({ where: { hotelId: id, createdAt: { gte: paymentFrom, lt: paymentUntil } }, select: { amount: true, createdAt: true } }),
  ]);
  const occupancy: Array<{ date: string; occupiedRooms: number; occupancyRate: number }> = [];
  const dailyRevenue = new Map<string, number>();
  for (const payment of payments) {
    const key = localDate(payment.createdAt, hotel.timeZone);
    dailyRevenue.set(key, (dailyRevenue.get(key) ?? 0) + Number(payment.amount));
  }
  for (let day = 0; day < days; day += 1) {
    const date = new Date(from.getTime() + day * 86_400_000);
    const key = date.toISOString().slice(0, 10);
    const bookedRooms = new Set(bookings.filter((booking) => booking.checkInDate <= date && booking.checkOutDate > date).flatMap((booking) => booking.roomReservations.map((reservation) => reservation.roomId)));
    occupancy.push({ date: key, occupiedRooms: bookedRooms.size, occupancyRate: rooms ? Math.round((bookedRooms.size / rooms) * 100) : 0 });
  }
  response.json({
    range: { from: parsed.data.from, to: parsed.data.to },
    occupancy,
    revenue: Array.from({ length: days }, (_value, day) => { const date = new Date(from.getTime() + day * 86_400_000).toISOString().slice(0, 10); return { date, amount: dailyRevenue.get(date) ?? 0 }; }),
    totals: { bookings: bookings.length, roomNights: occupancy.reduce((sum, item) => sum + item.occupiedRooms, 0), revenue: payments.reduce((sum, payment) => sum + Number(payment.amount), 0) },
  });
});
