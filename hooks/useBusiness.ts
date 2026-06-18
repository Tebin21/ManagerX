import { useBusinessStore } from '@/store/businessStore';
import { saveBusiness as saveBusinessToDB } from '@/lib/sqlite';

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
  };

  return { ...store, saveAndSetBusiness };
}
