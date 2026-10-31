-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'MANAGER', 'FRONT_DESK', 'HOUSEKEEPING', 'VIEWER');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'OCCUPIED', 'DIRTY', 'CLEANING', 'INSPECTED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "HousekeepingStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GuestRequestStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "hotels" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "subdomain" VARCHAR(100) NOT NULL,
    "time_zone" VARCHAR(100) NOT NULL DEFAULT 'Asia/Kolkata',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "calendar_feed_token_hash" VARCHAR(64),
    "inbound_email_address" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "hotels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_memberships" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'FRONT_DESK',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hotel_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_invites" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "invited_by_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'FRONT_DESK',
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "accepted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_types" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "base_price" DECIMAL(12,2) NOT NULL,
    "max_capacity" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "room_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "room_number" VARCHAR(50) NOT NULL,
    "room_type_id" UUID NOT NULL,
    "floor" VARCHAR(20),
    "status" "RoomStatus" NOT NULL DEFAULT 'AVAILABLE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guests" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "guest_id" UUID NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "check_in_date" DATE NOT NULL,
    "check_out_date" DATE NOT NULL,
    "guests_count" INTEGER NOT NULL DEFAULT 1,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "special_req" TEXT,
    "source" VARCHAR(30) NOT NULL DEFAULT 'DIRECT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_reservations" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "total_due" DECIMAL(12,2) NOT NULL,
    "is_voided" BOOLEAN NOT NULL DEFAULT false,
    "due_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" VARCHAR(50) NOT NULL,
    "reference" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "department" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_schedules" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "shift_date" DATE NOT NULL,
    "start_time" VARCHAR(5) NOT NULL,
    "end_time" VARCHAR(5) NOT NULL,
    "notes" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "housekeeping_tasks" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "employee_id" UUID,
    "title" VARCHAR(255) NOT NULL,
    "priority" VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    "status" "HousekeepingStatus" NOT NULL DEFAULT 'PENDING',
    "due_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "housekeeping_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_requests" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "guest_id" UUID NOT NULL,
    "booking_id" UUID,
    "kind" VARCHAR(100) NOT NULL,
    "details" TEXT,
    "status" "GuestRequestStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "guest_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inbound_emails" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "message_id" VARCHAR(255),
    "sender" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(500),
    "body" TEXT NOT NULL,
    "extraction" JSONB,
    "status" VARCHAR(30) NOT NULL DEFAULT 'REVIEW_REQUIRED',
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inbound_emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbound_emails" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "recipient" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(500) NOT NULL,
    "provider_message_id" VARCHAR(255),
    "status" VARCHAR(30) NOT NULL DEFAULT 'SENT',
    "sent_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbound_emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_oauth_states" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "state_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),

    CONSTRAINT "calendar_oauth_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_calendar_integrations" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "calendar_id" VARCHAR(255) NOT NULL DEFAULT 'primary',
    "encrypted_refresh_token" TEXT NOT NULL,
    "encrypted_access_token" TEXT,
    "access_token_expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "google_calendar_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "external_id" VARCHAR(255) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hotels_subdomain_key" ON "hotels"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "hotels_calendar_feed_token_hash_key" ON "hotels"("calendar_feed_token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "hotels_inbound_email_address_key" ON "hotels"("inbound_email_address");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "idx_sessions_user_expiry" ON "sessions"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "idx_sessions_expiry" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "idx_memberships_hotel_role" ON "hotel_memberships"("hotel_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "unique_user_hotel" ON "hotel_memberships"("user_id", "hotel_id");

-- CreateIndex
CREATE UNIQUE INDEX "membership_invites_token_hash_key" ON "membership_invites"("token_hash");

-- CreateIndex
CREATE INDEX "idx_membership_invites_hotel_expiry" ON "membership_invites"("hotel_id", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "unique_hotel_invite_email" ON "membership_invites"("hotel_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "unique_hotel_room_type_name" ON "room_types"("hotel_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "unique_room_type_tenant_id" ON "room_types"("hotel_id", "id");

-- CreateIndex
CREATE INDEX "idx_rooms_hotel_status" ON "rooms"("hotel_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "unique_hotel_room_number" ON "rooms"("hotel_id", "room_number");

-- CreateIndex
CREATE UNIQUE INDEX "unique_room_tenant_id" ON "rooms"("hotel_id", "id");

-- CreateIndex
CREATE INDEX "idx_guests_hotel_name" ON "guests"("hotel_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "unique_hotel_guest_email" ON "guests"("hotel_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "unique_guest_tenant_id" ON "guests"("hotel_id", "id");

-- CreateIndex
CREATE INDEX "idx_bookings_hotel_status_checkin" ON "bookings"("hotel_id", "status", "check_in_date");

-- CreateIndex
CREATE INDEX "idx_bookings_hotel_dates" ON "bookings"("hotel_id", "check_in_date", "check_out_date");

-- CreateIndex
CREATE UNIQUE INDEX "unique_booking_tenant_id" ON "bookings"("hotel_id", "id");

-- CreateIndex
CREATE INDEX "idx_reservations_hotel_room" ON "room_reservations"("hotel_id", "room_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_booking_room" ON "room_reservations"("booking_id", "room_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_booking_id_key" ON "invoices"("booking_id");

-- CreateIndex
CREATE INDEX "idx_invoices_hotel_due" ON "invoices"("hotel_id", "due_at");

-- CreateIndex
CREATE UNIQUE INDEX "unique_invoice_tenant_id" ON "invoices"("hotel_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_invoice_tenant_booking" ON "invoices"("hotel_id", "booking_id");

-- CreateIndex
CREATE INDEX "idx_payments_hotel_invoice" ON "payments"("hotel_id", "invoice_id");

-- CreateIndex
CREATE INDEX "idx_employees_hotel_department" ON "employees"("hotel_id", "department", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "unique_hotel_employee_email" ON "employees"("hotel_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "unique_employee_tenant_id" ON "employees"("hotel_id", "id");

-- CreateIndex
CREATE INDEX "idx_staff_schedules_hotel_date" ON "staff_schedules"("hotel_id", "shift_date");

-- CreateIndex
CREATE UNIQUE INDEX "unique_employee_shift_start" ON "staff_schedules"("hotel_id", "employee_id", "shift_date", "start_time");

-- CreateIndex
CREATE INDEX "idx_housekeeping_hotel_status_due" ON "housekeeping_tasks"("hotel_id", "status", "due_at");

-- CreateIndex
CREATE INDEX "idx_guest_requests_hotel_status" ON "guest_requests"("hotel_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "idx_inbound_emails_hotel_status" ON "inbound_emails"("hotel_id", "status", "received_at");

-- CreateIndex
CREATE UNIQUE INDEX "unique_hotel_inbound_message" ON "inbound_emails"("hotel_id", "message_id");

-- CreateIndex
CREATE INDEX "idx_outbound_emails_hotel_sent" ON "outbound_emails"("hotel_id", "sent_at");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_oauth_states_state_hash_key" ON "calendar_oauth_states"("state_hash");

-- CreateIndex
CREATE INDEX "idx_calendar_oauth_expiry" ON "calendar_oauth_states"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "google_calendar_integrations_hotel_id_key" ON "google_calendar_integrations"("hotel_id");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_events_booking_id_key" ON "calendar_events"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_hotel_calendar_event" ON "calendar_events"("hotel_id", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_hotel_calendar_booking" ON "calendar_events"("hotel_id", "booking_id");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_memberships" ADD CONSTRAINT "hotel_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_memberships" ADD CONSTRAINT "hotel_memberships_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_invites" ADD CONSTRAINT "membership_invites_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_invites" ADD CONSTRAINT "membership_invites_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_types" ADD CONSTRAINT "room_types_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_hotel_id_room_type_id_fkey" FOREIGN KEY ("hotel_id", "room_type_id") REFERENCES "room_types"("hotel_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guests" ADD CONSTRAINT "guests_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_hotel_id_guest_id_fkey" FOREIGN KEY ("hotel_id", "guest_id") REFERENCES "guests"("hotel_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_reservations" ADD CONSTRAINT "room_reservations_hotel_id_booking_id_fkey" FOREIGN KEY ("hotel_id", "booking_id") REFERENCES "bookings"("hotel_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_reservations" ADD CONSTRAINT "room_reservations_hotel_id_room_id_fkey" FOREIGN KEY ("hotel_id", "room_id") REFERENCES "rooms"("hotel_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_hotel_id_booking_id_fkey" FOREIGN KEY ("hotel_id", "booking_id") REFERENCES "bookings"("hotel_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_hotel_id_invoice_id_fkey" FOREIGN KEY ("hotel_id", "invoice_id") REFERENCES "invoices"("hotel_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_schedules" ADD CONSTRAINT "staff_schedules_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_schedules" ADD CONSTRAINT "staff_schedules_hotel_id_employee_id_fkey" FOREIGN KEY ("hotel_id", "employee_id") REFERENCES "employees"("hotel_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "housekeeping_tasks" ADD CONSTRAINT "housekeeping_tasks_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "housekeeping_tasks" ADD CONSTRAINT "housekeeping_tasks_hotel_id_room_id_fkey" FOREIGN KEY ("hotel_id", "room_id") REFERENCES "rooms"("hotel_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "housekeeping_tasks" ADD CONSTRAINT "housekeeping_tasks_hotel_id_employee_id_fkey" FOREIGN KEY ("hotel_id", "employee_id") REFERENCES "employees"("hotel_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_requests" ADD CONSTRAINT "guest_requests_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_requests" ADD CONSTRAINT "guest_requests_hotel_id_guest_id_fkey" FOREIGN KEY ("hotel_id", "guest_id") REFERENCES "guests"("hotel_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_requests" ADD CONSTRAINT "guest_requests_hotel_id_booking_id_fkey" FOREIGN KEY ("hotel_id", "booking_id") REFERENCES "bookings"("hotel_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbound_emails" ADD CONSTRAINT "inbound_emails_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbound_emails" ADD CONSTRAINT "outbound_emails_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_oauth_states" ADD CONSTRAINT "calendar_oauth_states_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_oauth_states" ADD CONSTRAINT "calendar_oauth_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_calendar_integrations" ADD CONSTRAINT "google_calendar_integrations_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_hotel_id_booking_id_fkey" FOREIGN KEY ("hotel_id", "booking_id") REFERENCES "bookings"("hotel_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "room_types" ADD CONSTRAINT "room_types_price_capacity_check" CHECK ("base_price" > 0 AND "max_capacity" BETWEEN 1 AND 20);

-- AddCheckConstraint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_stay_and_total_check" CHECK ("check_out_date" > "check_in_date" AND "guests_count" BETWEEN 1 AND 20 AND "total_amount" >= 0);

-- AddCheckConstraint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_total_due_check" CHECK ("total_due" >= 0);

-- AddCheckConstraint
ALTER TABLE "payments" ADD CONSTRAINT "payments_amount_check" CHECK ("amount" > 0);

-- AddCheckConstraint
ALTER TABLE "staff_schedules" ADD CONSTRAINT "staff_schedules_time_order_check" CHECK ("start_time" < "end_time");

-- AddCheckConstraint
ALTER TABLE "housekeeping_tasks" ADD CONSTRAINT "housekeeping_priority_check" CHECK ("priority" IN ('LOW', 'MEDIUM', 'HIGH'));

-- AddCheckConstraint
ALTER TABLE "membership_invites" ADD CONSTRAINT "membership_invite_role_check" CHECK ("role" <> 'OWNER'::"MembershipRole");
