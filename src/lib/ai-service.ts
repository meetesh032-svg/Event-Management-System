/**
 * AI Service for Gatherly Platform
 * Supports AI Event Descriptions, Banner Suggestions, SEO Generation,
 * Fraud Risk Scoring, and Event Concierge Chatbot.
 */

export interface EventAIPrompt {
  title: string;
  category: string;
  location?: string;
  vibe?: string;
  targetAudience?: string;
}

export interface GeneratedEventContent {
  description: string;
  shortSummary: string;
  highlights: string[];
  suggestedTags: string[];
  suggestedSchedule: string[];
}

export interface SEOMetaContent {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  ogTitle: string;
  ogDescription: string;
}

export interface BannerSuggestion {
  style: string;
  description: string;
  colorPalette: string[];
  recommendedKeywords: string;
}

export class AIService {
  /**
   * Generates production-ready event description & agenda
   */
  static generateEventDescription(params: EventAIPrompt): GeneratedEventContent {
    const { title, category, location = "City Center", vibe = "Energetic & Immersive" } = params;

    const highlightsByCategory: Record<string, string[]> = {
      Music: [
        "Acoustic and live amplified performances with studio-grade sound engineering",
        "Curated beverage and artisanal food pop-ups",
        "Exclusive merchandise booth and artist meet-and-greet passes",
      ],
      Tech: [
        "Keynote talks and deep-dive technical panels with industry leaders",
        "Hands-on interactive developer playground and hardware showcase",
        "High-velocity networking breaks with founders, angels, and recruiters",
      ],
      Comedy: [
        "Non-stop laughter with top-billed comedians and surprise opening acts",
        "Intimate cabaret seating with craft mocktails and dining options",
        "Uncensored, original sets and interactive crowd-work moments",
      ],
      Theatre: [
        "Critically acclaimed theatrical staging and evocative live set design",
        "Award-winning cast ensemble with musical overtures",
        "Post-show Q&A panel with director and lead performers",
      ],
      Sports: [
        "High-stakes competition with stadium-grade replay screens",
        "Fan zones with branded challenges, giveaways, and photo booths",
        "Post-match ceremonies and athlete appearances",
      ],
    };

    const highlights = highlightsByCategory[category] || [
      "Signature curated entertainment experience with premium seating",
      "Gourmet culinary stalls and beverage lounges",
      "Seamless contactless entry with instant digital ticketing",
    ];

    const description = `Get ready for an extraordinary experience at ${title}! Set in the vibrant heart of ${location}, this ${category.toLowerCase()} event brings together passionate audiences for a truly memorable celebration.

Whether you are a longtime enthusiast or discovering this for the first time, expect a ${vibe.toLowerCase()} atmosphere designed to captivate from opening curtain to final applause.

What to Expect:
${highlights.map((h) => `• ${h}`).join("\n")}

Doors open 45 minutes prior to start time. Valid digital or printed tickets required for gate admission. Reserve your seats early to secure preferred tiers!`;

    const shortSummary = `Join us at ${title} for a world-class ${category} event in ${location}. Experience ${highlights[0].toLowerCase()} and unforgettable moments.`;

    const suggestedTags = [
      category.toLowerCase(),
      "live-events",
      location.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      "gatherly-experience",
      "tickets-live",
    ];

    const suggestedSchedule = [
      "18:00 - Priority & VIP Box Doors Open",
      "18:30 - General Admission Gate Access & Welcome Lounges",
      "19:00 - Main Show Begins: Act I",
      "20:15 - Intermission & Concessions",
      "20:35 - Act II & Grand Finale",
    ];

    return {
      description,
      shortSummary,
      highlights,
      suggestedTags,
      suggestedSchedule,
    };
  }

  /**
   * Generates AI SEO metadata optimized for search engine crawlability
   */
  static generateSEOMetadata(title: string, category: string, location: string): SEOMetaContent {
    const metaTitle = `${title} | Book Tickets Online | Gatherly ${category}`;
    const metaDescription = `Book tickets online for ${title} at ${location}. Explore seat maps, live ticket availability, reviews, and secure checkout on Gatherly.`;
    const keywords = [
      title.toLowerCase(),
      `${category.toLowerCase()} events`,
      `${location.toLowerCase()} events`,
      "book event tickets",
      "gatherly events",
      "buy tickets online",
    ];

    return {
      metaTitle,
      metaDescription,
      keywords,
      ogTitle: `${title} - Live ${category} in ${location}`,
      ogDescription: metaDescription,
    };
  }

  /**
   * Generates 4 curated banner prompt suggestions
   */
  static generateBannerSuggestions(category: string, title: string): BannerSuggestion[] {
    return [
      {
        style: "Cinematic Modern Neon",
        description: `Wide panoramic stage view of ${title}, dramatic atmospheric backlighting, moody cobalt blue and neon crimson stage haze, subtle crowd silhouettes.`,
        colorPalette: ["#0F172A", "#6366F1", "#F43F5E", "#F8FAFC"],
        recommendedKeywords: "stage lights, cinematic concert, crowd silhouette, volumetric lighting",
      },
      {
        style: "Clean Minimalist Editorial",
        description: `Minimalist high-contrast graphic poster for ${category} event, bold typography focal point, elegant geometric shapes, premium texture.`,
        colorPalette: ["#18181B", "#F43F5E", "#FAFAFA", "#E4E4E7"],
        recommendedKeywords: "minimalist event poster, typography design, modern editorial",
      },
      {
        style: "Vibrant Festival Warmth",
        description: `Golden hour sunset bokeh lighting over an open-air venue, festival pennants, joyful crowd laughing with confetti sparkles in the air.`,
        colorPalette: ["#FEF3C7", "#F59E0B", "#D97706", "#78350F"],
        recommendedKeywords: "festival golden hour, outdoor event, joyful attendees, confetti blur",
      },
      {
        style: "Sophisticated Executive Dark",
        description: `Sleek obsidian glass textures, sharp metallic copper accents, soft ambient spot illumination over an auditorium stage.`,
        colorPalette: ["#09090B", "#27272A", "#D97706", "#FFFFFF"],
        recommendedKeywords: "keynote auditorium, luxury summit, architectural lighting",
      },
    ];
  }

  /**
   * AI Fraud Scoring Heuristic
   */
  static scoreFraudRisk(bookingAttempt: {
    ipAddress?: string;
    email: string;
    quantity: number;
    totalCents: number;
    failedAttemptsCount?: number;
    cardCountry?: string;
    ipCountry?: string;
  }): { score: number; riskLevel: "low" | "medium" | "high"; reasons: string[] } {
    let score = 5;
    const reasons: string[] = [];

    // Disposable email check
    const disposableDomains = ["mailinator.com", "tempmail.com", "10minutemail.com", "guerrillamail.com", "trashmail.com"];
    const emailDomain = bookingAttempt.email.split("@")[1]?.toLowerCase();
    if (disposableDomains.includes(emailDomain)) {
      score += 45;
      reasons.push("Booking uses a known disposable temporary email domain");
    }

    // High velocity bulk ticket purchase
    if (bookingAttempt.quantity > 8) {
      score += 20;
      reasons.push(`High ticket quantity (${bookingAttempt.quantity} tickets) in single order`);
    }

    // Prior failed payments
    if (bookingAttempt.failedAttemptsCount && bookingAttempt.failedAttemptsCount >= 3) {
      score += 35;
      reasons.push(`${bookingAttempt.failedAttemptsCount} failed payment attempts recorded from this session`);
    }

    // High basket value
    if (bookingAttempt.totalCents > 5000000) { // > $500
      score += 15;
      reasons.push("Transaction value exceeds typical individual basket threshold");
    }

    const finalScore = Math.min(100, Math.max(0, score));
    const riskLevel: "low" | "medium" | "high" =
      finalScore >= 70 ? "high" : finalScore >= 40 ? "medium" : "low";

    if (reasons.length === 0) {
      reasons.push("Standard customer profile, normal transaction velocity");
    }

    return {
      score: finalScore,
      riskLevel,
      reasons,
    };
  }
}
