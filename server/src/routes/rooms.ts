import { Router } from "express";
import { HousekeepingStatus, MembershipRole, RoomStatus } from "../generated/prisma/client.js";
import { getPrisma } from "../lib/prisma.js";
import { canManage, canOperate, hotelId, requireHotelMember } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
import { routeParam } from "../middleware/routeParam.js";
import { z } from "zod";

export const roomsRouter = Router();
export const roomTypesRouter = Router();
const createRoomSchema = z.object({
  roomNumber: z.string().trim().min(1).max(50),
  type: z.string().trim().min(2).max(100),
  rate: z.coerce.number().positive().max(1_000_000),
  maxCapacity: z.coerce.number().int().min(1).max(20).default(2),
  floor: z.string().trim().max(20).optional(),
});
const roomStatuses = ["AVAILABLE", "RESERVED", "OCCUPIED", "DIRTY", "CLEANING", "INSPECTED", "MAINTENANCE"] as const;
const statusSchema = z.object({ status: z.enum(roomStatuses) });

roomTypesRouter.get("/", requireHotelMember(), async (request, response) => {
  const types = await getPrisma().roomType.findMany({ where: { hotelId: hotelId(request) }, include: { _count: { select: { rooms: true } } }, orderBy: { name: "asc" } });
  response.json({ roomTypes: types.map((type) => ({ id: type.id, name: type.name, description: type.description, basePrice: Number(type.basePrice), maxCapacity: type.maxCapacity, roomCount: type._count.rooms })) });
});

roomTypesRouter.post("/", requireHotelMember(...canOperate), async (request, response) => {
  const input = z.object({ name: z.string().trim().min(2).max(100), description: z.string().trim().max(4000).optional(), basePrice: z.coerce.number().positive().max(1_000_000), maxCapacity: z.coerce.number().int().min(1).max(20) }).parse(request.body);
  const type = await getPrisma().roomType.create({ data: { hotelId: hotelId(request), name: input.name, basePrice: input.basePrice, maxCapacity: input.maxCapacity, ...(input.description !== undefined ? { description: input.description } : {}) } });
  response.status(201).json({ roomType: { ...type, basePrice: Number(type.basePrice) } });
});

roomTypesRouter.patch("/:roomTypeId", requireHotelMember(...canManage), async (request, response) => {
  const input = z.object({ name: z.string().trim().min(2).max(100).optional(), description: z.string().trim().max(4000).nullable().optional(), basePrice: z.coerce.number().positive().max(1_000_000).optional(), maxCapacity: z.coerce.number().int().min(1).max(20).optional() }).refine((value) => Object.keys(value).length > 0).parse(request.body);
  const id = hotelId(request);
  const type = await getPrisma().roomType.findFirst({ where: { id: routeParam(request, "roomTypeId"), hotelId: id } });
  if (!type) throw new HttpError(404, "Room type not found.", "ROOM_TYPE_NOT_FOUND");
  const updated = await getPrisma().roomType.update({ where: { id: type.id }, data: {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.basePrice !== undefined ? { basePrice: input.basePrice } : {}),
    ...(input.maxCapacity !== undefined ? { maxCapacity: input.maxCapacity } : {}),
  } });
  response.json({ roomType: { ...updated, basePrice: Number(updated.basePrice) } });
});

const labelStatus: Record<RoomStatus, string> = {
  AVAILABLE: "Available", RESERVED: "Reserved", OCCUPIED: "Occupied", DIRTY: "Cleaning", CLEANING: "Cleaning", INSPECTED: "Available", MAINTENANCE: "Maintenance",
};

roomsRouter.get("/", requireHotelMember(), async (request, response) => {
  const id = hotelId(request);
  const rooms = await getPrisma().room.findMany({
    where: { hotelId: id },
    include: {
      roomType: true,
      roomReservations: { where: { booking: { status: "CHECKED_IN" } }, include: { booking: { include: { guest: true } } }, take: 1 },
      housekeepingTasks: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { roomNumber: "asc" },
  });
  response.json({ rooms: rooms.map((room) => ({
    id: room.id,
    roomNumber: room.roomNumber,
    type: room.roomType.name,
    rate: Number(room.roomType.basePrice),
    maxCapacity: room.roomType.maxCapacity,
    status: labelStatus[room.status],
    statusCode: room.status,
    guest: room.roomReservations[0]?.booking.guest.name ?? "",
    cleanStatus: room.housekeepingTasks[0]?.status === HousekeepingStatus.COMPLETED ? "Clean" : room.housekeepingTasks[0] ? "In Progress" : "Clean",
  })) });
});

roomsRouter.post("/", requireHotelMember(...canOperate), async (request, response) => {
  const input = createRoomSchema.parse(request.body);
  const id = hotelId(request);
  const room = await getPrisma().$transaction(async (tx) => {
    const existingType = await tx.roomType.findUnique({ where: { hotelId_name: { hotelId: id, name: input.type } } });
    if (existingType && (Number(existingType.basePrice) !== input.rate || existingType.maxCapacity !== input.maxCapacity)) {
      throw new HttpError(409, "This room type already has different shared pricing or capacity. Update the room type before adding this room.", "ROOM_TYPE_SETTINGS_MISMATCH");
    }
    const roomType = existingType ?? await tx.roomType.create({ data: { hotelId: id, name: input.type, basePrice: input.rate, maxCapacity: input.maxCapacity } });
    return tx.room.create({ data: { hotelId: id, roomNumber: input.roomNumber, roomTypeId: roomType.id, ...(input.floor ? { floor: input.floor } : {}) }, include: { roomType: true } });
  });
  response.status(201).json({ room: { id: room.id, roomNumber: room.roomNumber, type: room.roomType.name, rate: Number(room.roomType.basePrice), status: labelStatus[room.status], guest: "", cleanStatus: "Clean" } });
});

roomsRouter.patch("/:roomId/status", requireHotelMember(...canOperate), async (request, response) => {
  const { status } = statusSchema.parse(request.body);
  const id = hotelId(request);
  const room = await getPrisma().room.findFirst({
    where: { id: routeParam(request, "roomId"), hotelId: id },
    include: { roomReservations: { where: { booking: { status: "CHECKED_IN" } }, select: { id: true }, take: 1 } },
  });
  if (!room) throw new HttpError(404, "Room not found.", "ROOM_NOT_FOUND");
  if (status === "AVAILABLE" && room.roomReservations.length > 0) throw new HttpError(409, "An occupied room cannot be marked available.", "ROOM_OCCUPIED");
  const updated = await getPrisma().room.update({ where: { id: room.id }, data: { status: status as RoomStatus } });
  response.json({ room: { id: updated.id, status: labelStatus[updated.status], statusCode: updated.status } });
});

roomsRouter.delete("/:roomId", requireHotelMember(MembershipRole.OWNER, MembershipRole.MANAGER), async (request, response) => {
  const id = hotelId(request);
  const room = await getPrisma().room.findFirst({ where: { id: routeParam(request, "roomId"), hotelId: id }, include: { roomReservations: { select: { id: true } } } });
  if (!room) throw new HttpError(404, "Room not found.", "ROOM_NOT_FOUND");
  if (room.roomReservations.length) throw new HttpError(409, "A room with reservation history cannot be deleted.", "ROOM_HAS_BOOKING_HISTORY");
  await getPrisma().room.delete({ where: { id: room.id } });
  response.status(204).end();
});

roomTypesRouter.delete("/:roomTypeId", requireHotelMember(...canManage), async (request, response) => {
  const id = hotelId(request);
  const type = await getPrisma().roomType.findFirst({ where: { id: routeParam(request, "roomTypeId"), hotelId: id }, include: { _count: { select: { rooms: true } } } });
  if (!type) throw new HttpError(404, "Room type not found.", "ROOM_TYPE_NOT_FOUND");
  if (type._count.rooms) throw new HttpError(409, "Remove or reassign rooms before deleting this room type.", "ROOM_TYPE_IN_USE");
  await getPrisma().roomType.delete({ where: { id: type.id } });
  response.status(204).end();
});
