import { Router } from "express";
import { BookingStatus, HousekeepingStatus, RoomStatus } from "../generated/prisma/client.js";
import { env } from "../config/env.js";
import { getPrisma } from "../lib/prisma.js";
import { localDate, localDateTimeToUtc } from "../lib/time.js";
import { hotelId, requireHotelMember } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { z } from "zod";

export const assistantRouter = Router();
const assistantLimit = rateLimit({ windowMs: 60_000, limit: 30 });

async function operationalSnapshot(id: string) {
  const db = getPrisma();
  const hotel = await db.hotel.findUniqueOrThrow({ where: { id }, select: { name: true, currency: true, timeZone: true } });
  const today = localDate(new Date(), hotel.timeZone);
  const monthStart = localDateTimeToUtc(`${today.slice(0, 7)}-01`, hotel.timeZone);
  const [rooms, bookings, openTasks, outstandingInvoices, monthPayments] = await Promise.all([
    db.room.findMany({ where: { hotelId: id }, select: { roomNumber: true, status: true, roomType: { select: { name: true } } }, take: 500 }),
    db.booking.findMany({ where: { hotelId: id, status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING, BookingStatus.CHECKED_IN] } }, select: { status: true, checkInDate: true, checkOutDate: true, roomReservations: { select: { room: { select: { roomNumber: true } } } } }, take: 500 }),
    db.housekeepingTask.count({ where: { hotelId: id, status: { in: [HousekeepingStatus.PENDING, HousekeepingStatus.IN_PROGRESS] } } }),
    db.invoice.findMany({ where: { hotelId: id, isVoided: false }, include: { payments: { select: { amount: true } } }, take: 500 }),
    db.payment.aggregate({ where: { hotelId: id, createdAt: { gte: monthStart } }, _sum: { amount: true } }),
  ]);
  const availableRooms = rooms.filter((room) => room.status === RoomStatus.AVAILABLE || room.status === RoomStatus.INSPECTED);
  const arrivals = bookings.filter((booking) => booking.checkInDate.toISOString().slice(0, 10) === today && booking.status !== BookingStatus.CHECKED_IN).length;
  const inHouse = bookings.filter((booking) => booking.status === BookingStatus.CHECKED_IN).length;
  const outstanding = outstandingInvoices.reduce((total, invoice) => total + Math.max(0, Number(invoice.totalDue) - invoice.payments.reduce((paid, payment) => paid + Number(payment.amount), 0)), 0);
  return {
    hotel: hotel.name,
    currency: hotel.currency,
    today,
    roomCount: rooms.length,
    availableRoomCount: availableRooms.length,
    availableRooms: availableRooms.map((room) => ({ roomNumber: room.roomNumber, type: room.roomType.name })),
    occupancyCount: inHouse,
    occupancyRate: rooms.length ? Math.round((rooms.filter((room) => room.status === RoomStatus.OCCUPIED).length / rooms.length) * 100) : 0,
    arrivalsToday: arrivals,
    openHousekeepingTasks: openTasks,
    outstandingBalance: outstanding,
    revenueThisMonth: Number(monthPayments._sum.amount ?? 0),
  };
}

function rulesAnswer(question: string, snapshot: Awaited<ReturnType<typeof operationalSnapshot>>): string {
  const query = question.toLowerCase();
  if (query.includes("available") || query.includes("vacant") || query.includes("room")) {
    if (!snapshot.availableRooms.length) return "There are no rooms marked available right now. Check the Rooms view for current status.";
    const rooms = snapshot.availableRooms.map((room) => `${room.roomNumber} (${room.type})`).join(", ");
    return `${snapshot.availableRoomCount} room(s) are available: ${rooms}.`;
  }
  if (query.includes("occup") || query.includes("in-house") || query.includes("in house")) return `Current occupancy is ${snapshot.occupancyCount} room(s), about ${snapshot.occupancyRate}% of inventory.`;
  if (query.includes("arriv") || query.includes("check-in") || query.includes("check in")) return `There are ${snapshot.arrivalsToday} scheduled arrival(s) today (${snapshot.today}).`;
  if (query.includes("clean") || query.includes("housekeep")) return `There are ${snapshot.openHousekeepingTasks} open housekeeping task(s).`;
  if (query.includes("balance") || query.includes("outstanding") || query.includes("owed")) return `Outstanding guest balances total ${snapshot.currency} ${snapshot.outstandingBalance.toFixed(2)}.`;
  if (query.includes("revenue") || query.includes("income")) return `Recorded payments this month total ${snapshot.currency} ${snapshot.revenueThisMonth.toFixed(2)}.`;
  return `I can answer read-only questions about room availability, current occupancy, today's arrivals, housekeeping, outstanding balances, and monthly revenue. ${snapshot.hotel} has ${snapshot.roomCount} room(s) today.`;
}

function redactGuestNames(question: string, names: string[]): string {
  return names.reduce((safe, name) => name ? safe.replaceAll(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "[guest]") : safe, question);
}

async function openAiAnswer(question: string, hotelId: string, snapshot: Awaited<ReturnType<typeof operationalSnapshot>>): Promise<string> {
  if (!env.OPENAI_API_KEY) return rulesAnswer(question, snapshot);
  const [guestRows, staffRows] = await Promise.all([
    getPrisma().guest.findMany({ where: { hotelId }, select: { name: true, email: true, phone: true }, take: 500 }),
    getPrisma().employee.findMany({ where: { hotelId }, select: { name: true, email: true }, take: 500 }),
  ]);
  let safeQuestion = redactGuestNames(question, [...guestRows.map((guest) => guest.name), ...staffRows.map((staff) => staff.name)]);
  safeQuestion = safeQuestion.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]");
  for (const phone of guestRows.map((guest) => guest.phone).filter((value): value is string => Boolean(value))) safeQuestion = safeQuestion.replaceAll(phone, "[phone]");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: env.OPENAI_MODEL,
      store: false,
      max_output_tokens: 350,
      input: [
        { role: "developer", content: "You are the read-only operations assistant for a hotel. Use only the supplied hotel summary. Do not claim to take actions, change records, send messages, or access guest or employee personal details. If the summary does not answer a question, say what information is unavailable. Keep answers concise." },
        { role: "user", content: `Question: ${safeQuestion}\n\nTenant-scoped operational summary (aggregates and room inventory only): ${JSON.stringify(snapshot)}` },
      ],
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new HttpError(503, "The AI assistant is temporarily unavailable.", "ASSISTANT_UNAVAILABLE");
  const result = z.object({ output: z.array(z.object({ type: z.string(), content: z.array(z.object({ type: z.string(), text: z.string().optional() })).optional() })).optional() }).parse(await response.json());
  const text = result.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
  return text?.trim() || rulesAnswer(question, snapshot);
}

assistantRouter.post("/", assistantLimit, requireHotelMember(), async (request, response) => {
  const input = z.object({ question: z.string().trim().min(1).max(2000) }).parse(request.body);
  const snapshot = await operationalSnapshot(hotelId(request));
  const answer = await openAiAnswer(input.question, hotelId(request), snapshot);
  response.json({ answer, mode: env.OPENAI_API_KEY ? "openai-read-only" : "local-read-only", readOnly: true });
});
