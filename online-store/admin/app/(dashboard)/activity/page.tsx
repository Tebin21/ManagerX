import { fetchAdmin } from "@/lib/backend";
import type { ActivityEntry } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { ActivityList } from "@/components/ActivityList";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const { entries } = await fetchAdmin<{ entries: ActivityEntry[]; total: number }>("/api/admin/activity?limit=200");

  return (
    <div>
      <PageHeader title="Activity Logs" description="Every admin action, plus store creation and sync failures." />
      <ActivityList entries={entries} showStore />
    </div>
  );
}
