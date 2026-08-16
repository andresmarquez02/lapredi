import { getDashboardFixtures } from "@/lib/supabase/queries";
import { Dashboard } from "@/components/dashboard/Dashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const fixtures = await getDashboardFixtures();
  return <Dashboard fixtures={fixtures} />;
}
