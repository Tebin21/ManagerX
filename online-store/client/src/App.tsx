import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { StorefrontPage } from './pages/StorefrontPage';
import { DemoStorefrontPage } from './pages/DemoStorefrontPage';
import { ProductDetailsPage } from './pages/ProductDetailsPage';
import { StorefrontLayout } from './components/StorefrontLayout';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
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
