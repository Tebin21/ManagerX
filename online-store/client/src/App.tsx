import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { StorefrontPage } from './pages/StorefrontPage';
import { DemoStorefrontPage } from './pages/DemoStorefrontPage';
import { ProductDetailsPage } from './pages/ProductDetailsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { StorefrontLayout } from './components/StorefrontLayout';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        {/* Reserved paths — must stay ahead of the /:slug catch-all below so a
            store slug can never shadow the legal pages. React Router ranks static
            segments over dynamic ones regardless of declaration order, but the
            explicit routes also make the reservation visible in the route table. */}
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/demo" element={<StorefrontLayout />}>
          <Route index element={<DemoStorefrontPage />} />
        </Route>
        <Route path="/:slug" element={<StorefrontLayout />}>
          <Route index element={<StorefrontPage />} />
          <Route path="product/:productId" element={<ProductDetailsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
