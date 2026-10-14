import * as dotenv from "dotenv";
dotenv.config();

import { db } from "./index";
import { users, events } from "./schema";
import bcrypt from "bcryptjs";
import { eq, ilike } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("password123", 10);

  // 1. Upsert Demo Organizer
  const existingOrganizer = await db.query.users.findFirst({
    where: eq(users.email, "organizer@demo.com"),
  });

  let organizerId: number;
  if (!existingOrganizer) {
    const [inserted] = await db
      .insert(users)
      .values({
        name: "Demo Organizer",
        email: "organizer@demo.com",
        passwordHash,
        role: "organizer",
      })
      .returning();
    organizerId = inserted.id;
    console.log("Created organizer: organizer@demo.com");
  } else {
    organizerId = existingOrganizer.id;
    console.log("Organizer already exists: organizer@demo.com");
  }

  // 2. Upsert Demo Attendee
  const existingAttendee = await db.query.users.findFirst({
    where: eq(users.email, "attendee@demo.com"),
  });

  if (!existingAttendee) {
    await db.insert(users).values({
      name: "Demo Attendee",
      email: "attendee@demo.com",
      passwordHash,
      role: "attendee",
    });
    console.log("Created attendee: attendee@demo.com");
  } else {
    console.log("Attendee already exists: attendee@demo.com");
  }

  // 3. Sample Events across all categories
  const now = new Date();
  const sampleEvents = [
    // Tech
    {
      title: "Global Tech Summit 2026",
      description: "Join top industry leaders, engineers, and researchers to explore AI, cloud architectures, and future software engineering.",
      category: "Tech",
      location: "Convention Center, Hall A",
      startsAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      endsAt: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000),
      ticketPriceCents: 49900,
      capacity: 250,
      ticketsRemaining: 250,
      imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80",
      organizerId,
    },
    // Music
    {
      title: "Neon Lights Music Festival",
      description: "An unforgettable night of electronic music, mesmerizing light shows, and world-class DJs under the stars.",
      category: "Music",
      location: "Downtown Open Arena",
      startsAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      endsAt: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
      ticketPriceCents: 75000,
      capacity: 500,
      ticketsRemaining: 480,
      imageUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80",
      organizerId,
    },
    // Food
    {
      title: "Artisan Food & Craft Fair",
      description: "Savor gourmet street food, local craft beers, artisanal delicacies, and live acoustic music.",
      category: "Food",
      location: "Riverfront Promenade",
      startsAt: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000),
      endsAt: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000 + 8 * 3600 * 1000),
      ticketPriceCents: 15000,
      capacity: 300,
      ticketsRemaining: 295,
      imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
      organizerId,
    },
    // Business
    {
      title: "Startup Pitch Night & Networking",
      description: "Watch 10 disruptive startups pitch their ventures to angel investors and venture capitalists. Networking mixer follows.",
      category: "Business",
      location: "Innovation Hub, Floor 4",
      startsAt: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
      endsAt: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000 + 4 * 3600 * 1000),
      ticketPriceCents: 20000,
      capacity: 100,
      ticketsRemaining: 85,
      imageUrl: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=800&q=80",
      organizerId,
    },
    // Movies
    {
      title: "Dune: Part Two (IMAX Experience)",
      description: "The mythic journey of Paul Atreides as he unites with Chani and the Fremen while seeking vengeance against the conspirators who destroyed his family.",
      category: "Movies",
      location: "PVR IMAX, Grand Mall",
      startsAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      endsAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 3 * 3600 * 1000),
      ticketPriceCents: 35000,
      capacity: 320,
      ticketsRemaining: 310,
      imageUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80",
      organizerId,
    },
    {
      title: "Oppenheimer: 70mm Special Screening",
      description: "Experience Christopher Nolan's Oscar-winning biographical epic in glorious 70mm film projection with immersive theater sound.",
      category: "Movies",
      location: "Cinepolis VIP Theatre, Screen 1",
      startsAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      endsAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + 3 * 3600 * 1000),
      ticketPriceCents: 45000,
      capacity: 180,
      ticketsRemaining: 140,
      imageUrl: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=800&q=80",
      organizerId,
    },
    // Stream
    {
      title: "Stand-Up Comedy Live: Unfiltered Special",
      description: "Broadcast live straight to your screen! Laugh out loud with 3 of the country's sharpest comedians performing their newest uncensored routines.",
      category: "Stream",
      location: "Online / Gatherly Live Stream",
      startsAt: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
      endsAt: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000 + 2 * 3600 * 1000),
      ticketPriceCents: 29900,
      capacity: 1000,
      ticketsRemaining: 950,
      imageUrl: "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&w=800&q=80",
      organizerId,
    },
    {
      title: "Cyberpunk DJ Night: Live Virtual Concert",
      description: "Immerse yourself in spatial 360 audio, live visual synthesizers, and direct artist interaction in this high-energy stream.",
      category: "Stream",
      location: "Online / Virtual Stage",
      startsAt: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000),
      endsAt: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000 + 3 * 3600 * 1000),
      ticketPriceCents: 19900,
      capacity: 800,
      ticketsRemaining: 740,
      imageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80",
      organizerId,
    },
    // Plays
    {
      title: "Hamlet: The Royal Theatre Production",
      description: "Shakespeare's greatest tragedy staged by an acclaimed ensemble cast, featuring innovative lighting, period costumes, and original scoring.",
      category: "Plays",
      location: "The Royal Playhouse, Main Stage",
      startsAt: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000),
      endsAt: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000 + 3 * 3600 * 1000),
      ticketPriceCents: 49900,
      capacity: 400,
      ticketsRemaining: 360,
      imageUrl: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=800&q=80",
      organizerId,
    },
    {
      title: "The Phantom Musical Spectacle",
      description: "The world-famous Broadway classic arrives in town with mesmerizing sets, dramatic romance, and breathtaking vocal performances.",
      category: "Plays",
      location: "Heritage Arts Auditorium",
      startsAt: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000),
      endsAt: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000 + 3 * 3600 * 1000),
      ticketPriceCents: 69900,
      capacity: 450,
      ticketsRemaining: 390,
      imageUrl: "https://images.unsplash.com/photo-1469488865564-c2de10f69f96?auto=format&fit=crop&w=800&q=80",
      organizerId,
    },
    // Sports
    {
      title: "City Marathon & 10K Championship",
      description: "Join over 5,000 runners winding through the historic boulevard and scenic waterfront. Medals, refreshments, and timer chips included.",
      category: "Sports",
      location: "City Stadium & Central Park Loop",
      startsAt: new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000),
      endsAt: new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000 + 5 * 3600 * 1000),
      ticketPriceCents: 35000,
      capacity: 1500,
      ticketsRemaining: 1420,
      imageUrl: "https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=800&q=80",
      organizerId,
    },
    {
      title: "Premier Derby Football Cup Finals",
      description: "Catch the season climax under electrifying floodlights as the two rival titans battle for the championship trophy.",
      category: "Sports",
      location: "Metropolitan Sports Arena",
      startsAt: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
      endsAt: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000 + 3 * 3600 * 1000),
      ticketPriceCents: 55000,
      capacity: 800,
      ticketsRemaining: 680,
      imageUrl: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80",
      organizerId,
    },
    // Activities
    {
      title: "Sunset Kayaking & Island Expedition",
      description: "Paddle across crystal-clear waters to a private cove, guided by certified marine adventurers. Sunset snacks and gear included.",
      category: "Activities",
      location: "Ocean Pier Adventure Dock",
      startsAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      endsAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000 + 4 * 3600 * 1000),
      ticketPriceCents: 120000,
      capacity: 60,
      ticketsRemaining: 45,
      imageUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80",
      organizerId,
    },
    {
      title: "Artisan Pottery & Wheel Throwing Workshop",
      description: "Hands-on pottery workshop with a master artisan. Learn centering, shaping, trimming, and take home 2 custom ceramic creations.",
      category: "Activities",
      location: "Clay & Craft Studio, 2nd Floor",
      startsAt: new Date(now.getTime() + 11 * 24 * 60 * 60 * 1000),
      endsAt: new Date(now.getTime() + 11 * 24 * 60 * 60 * 1000 + 3 * 3600 * 1000),
      ticketPriceCents: 49900,
      capacity: 25,
      ticketsRemaining: 18,
      imageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=800&q=80",
      organizerId,
    },
  ];

  for (const item of sampleEvents) {
    const existing = await db.query.events.findFirst({
      where: eq(events.title, item.title),
    });
    if (!existing) {
      await db.insert(events).values(item);
      console.log(`Added event: ${item.title} (${item.category})`);
    }
  }

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
