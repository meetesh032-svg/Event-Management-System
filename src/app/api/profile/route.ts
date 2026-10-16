import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const authUser = await requireAuth();

    const user = await db.query.users.findFirst({
      where: eq(users.id, authUser.id),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let parsedSocialLinks = {};
    if (user.socialLinks) {
      try {
        parsedSocialLinks = JSON.parse(user.socialLinks);
      } catch {
        // ignore
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        phone: user.phone,
        isVerifiedOrganizer: user.isVerifiedOrganizer,
        isEmailVerified: user.isEmailVerified,
        mfaEnabled: user.mfaEnabled,
        socialLinks: parsedSocialLinks,
        walletBalanceCents: user.walletBalanceCents,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Profile GET error:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authUser = await requireAuth();
    const body = await req.json();
    const { name, avatarUrl, bio, phone, socialLinks } = body;

    const updateData: Partial<typeof users.$inferInsert> = {};

    if (typeof name === "string" && name.trim()) {
      updateData.name = name.trim();
    }
    if (typeof avatarUrl === "string") {
      updateData.avatarUrl = avatarUrl.trim();
    }
    if (typeof bio === "string") {
      updateData.bio = bio.trim();
    }
    if (typeof phone === "string") {
      updateData.phone = phone.trim();
    }
    if (socialLinks && typeof socialLinks === "object") {
      updateData.socialLinks = JSON.stringify(socialLinks);
    }

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, authUser.id))
      .returning();

    let parsedSocialLinks = {};
    if (updatedUser.socialLinks) {
      try {
        parsedSocialLinks = JSON.parse(updatedUser.socialLinks);
      } catch {
        // ignore
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        avatarUrl: updatedUser.avatarUrl,
        bio: updatedUser.bio,
        phone: updatedUser.phone,
        isVerifiedOrganizer: updatedUser.isVerifiedOrganizer,
        isEmailVerified: updatedUser.isEmailVerified,
        mfaEnabled: updatedUser.mfaEnabled,
        socialLinks: parsedSocialLinks,
        walletBalanceCents: updatedUser.walletBalanceCents,
      },
    });
  } catch (error) {
    console.error("Profile PUT error:", error);
    return NextResponse.json({ error: "Unauthorized or update failed" }, { status: 401 });
  }
}
