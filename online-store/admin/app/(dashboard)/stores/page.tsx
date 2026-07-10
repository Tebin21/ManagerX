import { fetchAdmin } from "@/lib/backend";
import type { DeletedStoreRecord, StoreSummary } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { StoreTable } from "@/components/StoreTable";

export const dynamic = "force-dynamic";

export default async function StoresPage() {
  const [{ stores }, { stores: deletedStores }] = await Promise.all([
    fetchAdmin<{ stores: StoreSummary[] }>("/api/admin/stores"),
    fetchAdmin<{ stores: DeletedStoreRecord[] }>("/api/admin/deleted-stores"),
  ]);

  const storefrontBaseUrl = process.env.NEXT_PUBLIC_STOREFRONT_BASE_URL ?? "https://managerx.store";

  return (
    <div>
      <PageHeader title="Online Stores" description={`${stores.length} store${stores.length === 1 ? "" : "s"}`} />
      <StoreTable initialStores={stores} deletedStores={deletedStores} storefrontBaseUrl={storefrontBaseUrl} />
    </div>
  );
}
