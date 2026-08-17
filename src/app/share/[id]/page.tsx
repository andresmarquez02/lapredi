import { notFound } from "next/navigation";
import { getFixtureById } from "@/lib/supabase/queries";
import { MatchDetail } from "@/components/dashboard/MatchDetail";

export const dynamic = "force-dynamic";

interface SharePageProps {
  params: Promise<{ id: string }>;
}

export default async function SharePage({ params }: SharePageProps) {
  const { id } = await params;
  const fixture = await getFixtureById(id);
  if (!fixture) notFound();

  return (
    <div className="min-h-screen bg-canvas px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center gap-2 text-sm font-bold text-text-primary">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/android-chrome-192x192.png" alt="" className="h-7 w-7 shrink-0 rounded-xl object-cover" />
          lapredi
        </div>
        <MatchDetail fixture={fixture} />
      </div>
    </div>
  );
}
