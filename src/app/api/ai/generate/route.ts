import { NextRequest, NextResponse } from "next/server";
import { AIService } from "@/lib/ai-service";
import { requireOrganizer } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    // Only organizers/admins can generate event marketing assets
    await requireOrganizer();

    const body = await req.json();
    const { task, title, category, location, vibe, bookingData } = body;

    if (!task) {
      return NextResponse.json({ error: "Task is required" }, { status: 400 });
    }

    if (task === "event_description") {
      if (!title || !category) {
        return NextResponse.json({ error: "Title and Category are required for event description" }, { status: 400 });
      }
      const result = AIService.generateEventDescription({
        title,
        category,
        location,
        vibe,
      });
      return NextResponse.json({ success: true, result });
    }

    if (task === "seo_meta") {
      if (!title || !category) {
        return NextResponse.json({ error: "Title and Category are required for SEO generation" }, { status: 400 });
      }
      const result = AIService.generateSEOMetadata(title, category, location || "Online / Nationwide");
      return NextResponse.json({ success: true, result });
    }

    if (task === "banner_prompts") {
      if (!category) {
        return NextResponse.json({ error: "Category is required for banner suggestions" }, { status: 400 });
      }
      const result = AIService.generateBannerSuggestions(category, title || "Live Event");
      return NextResponse.json({ success: true, suggestions: result });
    }

    if (task === "fraud_score") {
      if (!bookingData) {
        return NextResponse.json({ error: "Booking data is required for fraud scoring" }, { status: 400 });
      }
      const result = AIService.scoreFraudRisk(bookingData);
      return NextResponse.json({ success: true, analysis: result });
    }

    return NextResponse.json({ error: `Unknown AI task: ${task}` }, { status: 400 });
  } catch (error) {
    console.error("AI Generation Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
