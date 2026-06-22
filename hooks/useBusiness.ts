import { useBusinessStore } from '@/store/businessStore';
import { saveBusiness as saveBusinessToDB } from '@/lib/sqlite';
import { markStoreInfoDirty } from '@/lib/onlineStore/storeInfo';
import { processQueue } from '@/lib/onlineStore/syncEngine';

export function useBusiness() {
  const store = useBusinessStore();

  const saveAndSetBusiness = async (data: {
    name: string;
    type: string;
    phone: string;
    address: string;
    logoUri: string | null;
  }) => {
    await saveBusinessToDB({
      name: data.name,
      type: data.type,
      phone: data.phone,
      address: data.address,
      logoPath: data.logoUri ?? undefined,
    });

    store.setBusiness(data);

    // Business Profile is the single source of truth for the Online Store's
    // name/phone/address/logo — mark the info dirty so the next sync push (fired
    // here, fire-and-forget) carries the new values. No-ops if the Online Store
    // isn't enabled; the dirty flag just waits for the next time it is.
    await markStoreInfoDirty();
    processQueue();
  };

  return { ...store, saveAndSetBusiness };
}
