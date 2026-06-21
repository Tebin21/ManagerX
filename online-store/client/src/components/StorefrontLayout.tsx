import { Outlet, useParams } from 'react-router-dom';
import { CartProvider } from '../cart/CartContext';

// Cart state is scoped per store slug (see CartContext's per-slug localStorage key),
// so the provider needs the slug from the route — it can't simply wrap <App/> above
// the router. `key={slug}` forces a full remount (and a fresh lazy-init read from
// localStorage) if a visitor ever navigates from one store's URL to a different
// store's URL in the same browser session, instead of carrying over stale state.
export function StorefrontLayout() {
  const { slug } = useParams<{ slug: string }>();
  if (!slug) return null;

  return (
    <CartProvider key={slug} slug={slug}>
      <Outlet />
    </CartProvider>
  );
}
