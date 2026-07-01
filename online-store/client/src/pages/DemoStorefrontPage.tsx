import { StorefrontView } from '../components/StorefrontView';
import { DEMO_STORE } from '../data/demoStore';

// Preview-only storefront — no fetch, no polling, no network calls at all. Lets a
// business owner (or anyone evaluating ManagerX) see the real storefront design
// with realistic sample products before ever registering an actual store.
export function DemoStorefrontPage() {
  return <StorefrontView store={DEMO_STORE} />;
}
