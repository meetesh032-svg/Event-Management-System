import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, events } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = parseInt(id, 10);

    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    let parsedSocialLinks = {};
    if (user.socialLinks) {
      try {
        parsedSocialLinks = JSON.parse(user.socialLinks);
      } catch {
        // ignore
      }
    }

    // Fetch public events hosted by this organizer
    let hostedEvents: (typeof events.$inferSelect)[] = [];
    if (user.role === "organizer") {
      hostedEvents = await db.query.events.findMany({
        where: eq(events.organizerId, user.id),
        orderBy: [desc(events.startsAt)],
      });
    }

    return NextResponse.json({
      profile: {
        id: user.id,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        isVerifiedOrganizer: user.isVerifiedOrganizer,
        socialLinks: parsedSocialLinks,
        memberSince: user.createdAt,
      },
      events: hostedEvents,
    });
  } catch (error) {
    console.error("Public profile error:", error);
    return NextResponse.json({ error: "Failed to retrieve public profile" }, { status: 500 });
  }
}
