"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function FakeCheckoutRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = searchParams.toString();
    router.replace(`/checkout?${params}`);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-[#F84464]" />
      <p className="mt-3 text-xs text-gray-500 font-medium">Redirecting to secure checkout...</p>
    </div>
  );
}

export default function FakeCheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <FakeCheckoutRedirect />
    </Suspense>
  );
}
