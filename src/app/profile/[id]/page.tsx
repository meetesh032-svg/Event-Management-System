"use client";

import { useEffect, useState, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  User as UserIcon,
  CheckCircle,
  Globe,
  Calendar,
  MapPin,
  Tag,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { formatRupees } from "@/lib/format";

type PublicProfileData = {
  profile: {
    id: number;
    name: string;
    role: "attendee" | "organizer" | "admin";
    avatarUrl: string | null;
    bio: string | null;
    isVerifiedOrganizer: boolean;
    socialLinks: {
      twitter?: string;
      linkedin?: string;
      instagram?: string;
      github?: string;
      website?: string;
    };
    memberSince: string;
  };
  events: Array<{
    id: number;
    title: string;
    description: string;
    category: string;
    location: string;
    startsAt: string;
    ticketPriceCents: number;
    ticketsRemaining: number;
    imageUrl: string | null;
  }>;
};

export default function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [data, setData] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/profile/${resolvedParams.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Profile not found");
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load profile");
        setLoading(false);
      });
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#F84464]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-xl py-24 text-center px-6">
        <h2 className="text-xl font-bold text-gray-900">User Not Found</h2>
        <p className="mt-2 text-xs text-gray-500">
          The requested profile could not be located.
        </p>
        <Link
          href="/events"
          className="mt-6 inline-block rounded-xl bg-[#F84464] px-5 py-2 text-xs font-semibold text-white hover:bg-rose-600 transition"
        >
          Back to Events
        </Link>
      </div>
    );
  }

  const { profile, events: hostedEvents } = data;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Link
        href="/events"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 mb-6 transition"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Catalog
      </Link>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm mb-10"
      >
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          <div className="relative h-24 w-24 rounded-full overflow-hidden border-4 border-[#F84464] bg-slate-100 flex items-center justify-center shrink-0 shadow-md">
            {profile.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                alt={profile.name}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <UserIcon className="h-12 w-12 text-gray-400" />
            )}
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-2xl font-black text-gray-900">{profile.name}</h1>
              {profile.isVerifiedOrganizer && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-0.5 text-xs font-bold text-blue-700">
                  <CheckCircle className="h-3.5 w-3.5 fill-blue-600 text-white" /> Verified Organizer
                </span>
              )}
              <span className="rounded-full bg-gray-100 px-3 py-0.5 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                {profile.role}
              </span>
            </div>

            {profile.bio ? (
              <p className="mt-3 text-sm text-gray-700 max-w-2xl leading-relaxed">{profile.bio}</p>
            ) : (
              <p className="mt-2 text-xs text-gray-400 italic">No biography provided yet.</p>
            )}

            {/* Social Media Links */}
            <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-3">
              {profile.socialLinks?.twitter && (
                <a
                  href={`https://twitter.com/${profile.socialLinks.twitter.replace("@", "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-600 hover:bg-sky-100 transition"
                >
                  <span className="font-bold">𝕏</span> Twitter
                </a>
              )}
              {profile.socialLinks?.linkedin && (
                <a
                  href={`https://linkedin.com/in/${profile.socialLinks.linkedin}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
                >
                  <span className="font-bold">in</span> LinkedIn
                </a>
              )}
              {profile.socialLinks?.github && (
                <a
                  href={`https://github.com/${profile.socialLinks.github}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-800 hover:bg-gray-200 transition"
                >
                  <span className="font-bold">git</span> GitHub
                </a>
              )}
              {profile.socialLinks?.website && (
                <a
                  href={profile.socialLinks.website}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition"
                >
                  <Globe className="h-3.5 w-3.5" /> Website
                </a>
              )}
            </div>

            <p className="mt-4 text-[11px] text-gray-400">
              Member since {new Date(profile.memberSince).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Hosted Events Section */}
      {profile.role === "organizer" && (
        <div>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              Events by {profile.name} ({hostedEvents.length})
            </h2>
          </div>

          {hostedEvents.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-xs text-gray-400">
              No live shows published by this organizer yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {hostedEvents.map((evt) => (
                <Link
                  key={evt.id}
                  href={`/events/${evt.id}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition"
                >
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-gray-100">
                    <Image
                      src={evt.imageUrl || "/placeholder-event.jpg"}
                      alt={evt.title}
                      fill
                      className="object-cover transition duration-300 group-hover:scale-105"
                      unoptimized
                    />
                    <div className="absolute top-2.5 right-2.5 rounded-full bg-black/60 px-2.5 py-0.5 text-[11px] font-bold text-white backdrop-blur-md">
                      {evt.category}
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="font-bold text-gray-900 text-sm line-clamp-1 group-hover:text-[#F84464] transition">
                      {evt.title}
                    </h3>
                    <p className="mt-1 text-xs text-gray-500 flex items-center gap-1 line-clamp-1">
                      <MapPin className="h-3 w-3 shrink-0 text-gray-400" /> {evt.location}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="h-3 w-3 shrink-0 text-gray-400" />{" "}
                      {new Date(evt.startsAt).toLocaleDateString()}
                    </p>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-xs font-black text-gray-900">
                        {formatRupees(evt.ticketPriceCents)}
                      </span>
                      <span className="text-[11px] font-semibold text-[#F84464]">
                        Book Now →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
