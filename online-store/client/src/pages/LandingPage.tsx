import { Footer } from '../components/Footer';

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="text-xl font-bold text-slate-800">ManagerX Online Store</h1>
        <p className="mt-2 max-w-sm text-sm text-slate-500">
          This is the storefront platform that powers public stores created from the
          ManagerX app. Visit a specific store at its own address, e.g.
          managerx.store/your-store-name.
        </p>
      </div>
      <Footer />
    </div>
  );
}
