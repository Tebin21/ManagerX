import { fetchAdmin } from "@/lib/backend";
import type { BackupSummary } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { BackupsPanel } from "@/components/BackupsPanel";

export const dynamic = "force-dynamic";

export default async function BackupsPage() {
  const { backups } = await fetchAdmin<{ backups: BackupSummary[] }>("/api/admin/backups");

  return (
    <div>
      <PageHeader
        title="Backups"
        description="Snapshots of the store ledger — uploaded images aren't included (they live on the host's persistent disk separately)."
      />
      <BackupsPanel initialBackups={backups} />
    </div>
  );
}
