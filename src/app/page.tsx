import { HeroEvents } from "@/components/HeroEvents";
import { HeroSection } from "@/components/HeroSection";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <div className="bg-white min-h-screen w-full">
      <HeroSection />
      <HeroEvents />
    </div>
  );
}
