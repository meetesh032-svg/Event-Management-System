import { db } from "@/db";
import { events, seatLayouts, seatReservations, bookings } from "@/db/schema";
import { and, eq, inArray, lt, or, sql } from "drizzle-orm";

export interface SeatInfo {
  seatNumber: string;
  row: string;
  col: number;
  tier: "standard" | "vip" | "premium" | "accessible";
  priceMultiplier: number;
  priceCents: number;
  status: "available" | "held" | "booked" | "my_hold";
  heldUntil?: string | null;
  heldByMe?: boolean;
}

export interface SeatMapResponse {
  eventId: number;
  layoutName: string;
  rows: number;
  cols: number;
  basePriceCents: number;
  totalSeats: number;
  availableSeats: number;
  heldSeats: number;
  bookedSeats: number;
  seats: SeatInfo[];
}

export async function releaseExpiredHolds(eventId?: number) {
  const now = new Date();
  if (eventId) {
    await db
      .update(seatReservations)
      .set({ status: "released", updatedAt: now })
      .where(
        and(
          eq(seatReservations.eventId, eventId),
          eq(seatReservations.status, "held"),
          lt(seatReservations.heldUntil, now)
        )
      );
  } else {
    await db
      .update(seatReservations)
      .set({ status: "released", updatedAt: now })
      .where(
        and(
          eq(seatReservations.status, "held"),
          lt(seatReservations.heldUntil, now)
        )
      );
  }
}

export async function getSeatMapForEvent(
  eventId: number,
  currentUserId?: number
): Promise<SeatMapResponse> {
  // 1. Auto-release any expired holds
  await releaseExpiredHolds(eventId);

  // 2. Fetch event
  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
  });

  if (!event) {
    throw new Error("Event not found");
  }

  // 3. Fetch seat layout if assigned, or use smart default
  let layout = null;
  if (event.seatLayoutId) {
    layout = await db.query.seatLayouts.findFirst({
      where: eq(seatLayouts.id, event.seatLayoutId),
    });
  }

  const numRows = layout?.rows ?? 8;
  const numCols = layout?.cols ?? 10;
  const layoutName = layout?.name ?? "Standard Auditorium Layout";

  // Parse VIP rows and Accessible seats
  let vipRows: string[] = ["A", "B"];
  let accessibleSeats: string[] = ["H-1", "H-2", "H-9", "H-10"];

  if (layout?.vipRows) {
    try {
      vipRows = JSON.parse(layout.vipRows);
    } catch {
      vipRows = layout.vipRows.split(",").map((s) => s.trim().toUpperCase());
    }
  }

  if (layout?.accessibleSeats) {
    try {
      accessibleSeats = JSON.parse(layout.accessibleSeats);
    } catch {
      accessibleSeats = layout.accessibleSeats.split(",").map((s) => s.trim().toUpperCase());
    }
  }

  // 4. Fetch all active reservations for this event (booked OR held and not expired)
  const now = new Date();
  const activeReservations = await db.query.seatReservations.findMany({
    where: and(
      eq(seatReservations.eventId, eventId),
      or(
        eq(seatReservations.status, "booked"),
        and(eq(seatReservations.status, "held"), sql`${seatReservations.heldUntil} > ${now}`)
      )
    ),
  });

  const reservationMap = new Map<string, typeof activeReservations[0]>();
  for (const res of activeReservations) {
    reservationMap.set(res.seatNumber.toUpperCase(), res);
  }

  // 5. Build full seat map grid
  const seats: SeatInfo[] = [];
  let availableCount = 0;
  let heldCount = 0;
  let bookedCount = 0;

  for (let r = 0; r < numRows; r++) {
    const rowChar = String.fromCharCode(65 + r); // A, B, C...
    const isVipRow = vipRows.includes(rowChar);

    for (let c = 1; c <= numCols; c++) {
      const seatNumber = `${rowChar}-${c}`;
      const isAccessible = accessibleSeats.includes(seatNumber);

      let tier: "standard" | "vip" | "premium" | "accessible" = "standard";
      let priceMultiplier = 1.0;

      if (isAccessible) {
        tier = "accessible";
        priceMultiplier = 1.0;
      } else if (isVipRow) {
        tier = "vip";
        priceMultiplier = 1.5;
      } else if (r === 2 || r === 3) {
        // Rows C and D are Premium
        tier = "premium";
        priceMultiplier = 1.25;
      }

      const calculatedPrice = Math.round(event.ticketPriceCents * priceMultiplier);

      const reservation = reservationMap.get(seatNumber);
      let status: "available" | "held" | "booked" | "my_hold" = "available";
      let heldUntilStr: string | null = null;
      let isMyHold = false;

      if (reservation) {
        if (reservation.status === "booked") {
          status = "booked";
          bookedCount++;
        } else if (reservation.status === "held") {
          if (currentUserId && reservation.userId === currentUserId) {
            status = "my_hold";
            isMyHold = true;
          } else {
            status = "held";
          }
          heldCount++;
          heldUntilStr = reservation.heldUntil ? reservation.heldUntil.toISOString() : null;
        }
      } else {
        availableCount++;
      }

      seats.push({
        seatNumber,
        row: rowChar,
        col: c,
        tier,
        priceMultiplier,
        priceCents: calculatedPrice,
        status,
        heldUntil: heldUntilStr,
        heldByMe: isMyHold,
      });
    }
  }

  return {
    eventId,
    layoutName,
    rows: numRows,
    cols: numCols,
    basePriceCents: event.ticketPriceCents,
    totalSeats: numRows * numCols,
    availableSeats: availableCount,
    heldSeats: heldCount,
    bookedSeats: bookedCount,
    seats,
  };
}

export async function holdSeats(
  eventId: number,
  seatNumbers: string[],
  userId: number,
  durationMinutes = 10
) {
  if (!seatNumbers.length) {
    throw new Error("No seats specified");
  }

  // Normalize seat numbers
  const normalized = seatNumbers.map((s) => s.trim().toUpperCase());

  return await db.transaction(async (tx) => {
    // 1. Release expired holds first
    const now = new Date();
    await tx
      .update(seatReservations)
      .set({ status: "released", updatedAt: now })
      .where(
        and(
          eq(seatReservations.eventId, eventId),
          eq(seatReservations.status, "held"),
          lt(seatReservations.heldUntil, now)
        )
      );

    // 2. Double Booking Prevention: Check if any requested seats are already booked OR held by another user
    const conflicts = await tx.query.seatReservations.findMany({
      where: and(
        eq(seatReservations.eventId, eventId),
        inArray(seatReservations.seatNumber, normalized),
        or(
          eq(seatReservations.status, "booked"),
          and(
            eq(seatReservations.status, "held"),
            sql`${seatReservations.heldUntil} > ${now}`,
            sql`${seatReservations.userId} != ${userId}`
          )
        )
      ),
    });

    if (conflicts.length > 0) {
      const takenSeatNumbers = conflicts.map((c) => c.seatNumber).join(", ");
      throw new Error(`The following seat(s) are no longer available: ${takenSeatNumbers}`);
    }

    // 3. Check event pricing for tier calculation
    const event = await tx.query.events.findFirst({
      where: eq(events.id, eventId),
    });

    if (!event) {
      throw new Error("Event not found");
    }

    const heldUntil = new Date(Date.now() + durationMinutes * 60 * 1000);
    const heldRecords = [];

    for (const seatNumber of normalized) {
      // Release any previous hold by this user on this seat
      await tx
        .delete(seatReservations)
        .where(
          and(
            eq(seatReservations.eventId, eventId),
            eq(seatReservations.seatNumber, seatNumber),
            eq(seatReservations.userId, userId),
            eq(seatReservations.status, "held")
          )
        );

      // Determine tier
      const rowChar = seatNumber.split("-")[0];
      let tier: "standard" | "vip" | "premium" | "accessible" = "standard";
      let priceMultiplier = 1.0;
      if (rowChar === "A" || rowChar === "B") {
        tier = "vip";
        priceMultiplier = 1.5;
      } else if (rowChar === "C" || rowChar === "D") {
        tier = "premium";
        priceMultiplier = 1.25;
      }

      const priceCents = Math.round(event.ticketPriceCents * priceMultiplier);

      const [res] = await tx
        .insert(seatReservations)
        .values({
          eventId,
          seatNumber,
          tier,
          priceCents,
          userId,
          status: "held",
          heldUntil,
        })
        .returning();

      heldRecords.push(res);
    }

    return {
      success: true,
      heldSeats: normalized,
      heldUntil: heldUntil.toISOString(),
      expiresInSeconds: durationMinutes * 60,
    };
  });
}

export async function releaseSeats(
  eventId: number,
  seatNumbers: string[],
  userId: number
) {
  const normalized = seatNumbers.map((s) => s.trim().toUpperCase());
  const now = new Date();

  await db
    .update(seatReservations)
    .set({ status: "released", updatedAt: now })
    .where(
      and(
        eq(seatReservations.eventId, eventId),
        eq(seatReservations.userId, userId),
        eq(seatReservations.status, "held"),
        inArray(seatReservations.seatNumber, normalized)
      )
    );

  return { success: true };
}

export async function getUserSeatHistory(userId: number) {
  const history = await db
    .select({
      id: seatReservations.id,
      seatNumber: seatReservations.seatNumber,
      tier: seatReservations.tier,
      priceCents: seatReservations.priceCents,
      status: seatReservations.status,
      heldUntil: seatReservations.heldUntil,
      createdAt: seatReservations.createdAt,
      event: {
        id: events.id,
        title: events.title,
        startsAt: events.startsAt,
        location: events.location,
      },
    })
    .from(seatReservations)
    .innerJoin(events, eq(seatReservations.eventId, events.id))
    .where(eq(seatReservations.userId, userId))
    .orderBy(sql`${seatReservations.createdAt} DESC`);

  return history;
}
