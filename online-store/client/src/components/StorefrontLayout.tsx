import { Outlet } from 'react-router-dom';
import { Footer } from './Footer';

// Shared chrome for every /:slug route — currently just the storefront page, but
// kept as a layout route so the footer only has to be mounted once.
export function StorefrontLayout() {
  return (
    <>
      <Outlet />
      <Footer />
    </>
  );
}
