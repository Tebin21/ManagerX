# Froshiar (ManagerX) - AI Agent Architecture & Project Map

> **Notice to AI Agents**: This document contains the complete project map, tech stack, directory structure, and development guidelines for **Froshiar (ManagerX)**. Refer to this guide directly instead of scanning directories or running repetitive file searches.

---

## 1. Project Overview & Tech Stack

- **Application**: Froshiar (Mobile POS, Inventory & Store Management)
- **Framework**: Expo (SDK 54) + React Native 0.81 + Expo Router v6
- **Language**: TypeScript (`strict: false`, path alias `@/*` maps to `./*`)
- **State Management**: Zustand v5 (Persisted stores in `store/`)
- **Local Database**: SQLite (`expo-sqlite` via `lib/sqlite.ts`, DB file: `froshiar.db`)
- **Styling**: NativeWind / Tailwind CSS v3 (`global.css`, `tailwind.config.js`) + Custom Theme Tokens (`constants/theme.ts`, `constants/colors.ts`, `constants/darkColors.ts`)
- **Theme Engine**: `contexts/ThemeContext.tsx` (`useAppTheme()`)
  - Dark Mode: `#0F172A` (Background), `#1E293B` (Cards), `#334155` (Borders)
  - Accent / Primary: `#D4AF37` (Froshiar Gold)
- **Localization & RTL**: `react-i18next` (`locales/ku.json` for Kurdish Sorani, `locales/en.json` for English)
- **Typography**: Kurdish font Bahij Janna (`assets/fonts/BahijJanna-Bold.ttf`, `assets/fonts/BahijJanna-Regular.ttf`)

---

## 2. Directory Architecture & Quick File Map

### A. Application Screens (`app/`)
*Routing is file-based via Expo Router:*

- **`app/_layout.tsx`**: Root app provider (Theme, Language, i18n, Safe Area)
- **`app/index.tsx`**: Initial entry redirect & splash check
- **`app/(onboarding)/`**: Authentication and setup screens (login, signup, setup, cloud sync conflict)
- **`app/(app)/_layout.tsx`**: Main tab navigation & stack wrapper

#### Main Business Modules (`app/(app)/`):
1. **Sales (`app/(app)/sales/`)**:
   - `index.tsx`: Quick POS screen & product search
   - `history.tsx`: Sales history, period filter modal (Today, Week, Month, Custom), PDF audit report
   - `new-sale.tsx`: Checkout cart, discount, payment method (Cash / Debt / Card)
   - `[id].tsx`: Sale receipt & details view
   - `check-price.tsx`: Barcode scanner & quick price checker
   - `edit/`: Edit existing sale transactions

2. **Purchases (`app/(app)/purchases/`)**:
   - `index.tsx`: Purchases overview
   - `history.tsx`: Purchases history with period filter & PDF audit report
   - `new-purchase.tsx`: Supplier bill intake, items entry, cost & debts
   - `[id].tsx`: Purchase invoice details
   - `edit/`: Edit purchase bills

3. **Inventory & Products (`app/(app)/inventory/`)**:
   - `index.tsx`: Main product catalog, search, barcode scan, category filter
   - `[id].tsx`: Product details & stock edit
   - `stock-alerts.tsx`: Low stock alerts & reorder notifications
   - `history.tsx`: Inventory stock movements (in / out)

4. **Debts & Loans (`app/(app)/debt/`)**:
   - `index.tsx`: Total debt overview (Customer receivables vs Supplier payables)
   - `sales/`: Customer debts, installment payments, receipt sharing
   - `purchase/`: Supplier debts & settlement records

5. **Customers & Suppliers**:
   - `app/(app)/customers/index.tsx`: Customer directory & search
   - `app/(app)/customers/[id].tsx`: Customer ledger, statements, sales history
   - `app/(app)/suppliers/index.tsx`: Suppliers list
   - `app/(app)/suppliers/[id].tsx`: Supplier transaction history & statements

6. **Reports & Expenses (`app/(app)/reports/`)**:
   - `index.tsx`: Analytics, revenue, profit margins, daily/monthly summaries
   - `expenses.tsx`: Operating expenses tracking & categorisation

7. **Settings (`app/(app)/settings/`)**:
   - `index.tsx`: Settings hub
   - `currency.tsx`: USD / IQD exchange rate settings & base currency
   - `language.tsx`: Kurdish / English switch
   - `theme.tsx`: Light / Dark mode toggle & custom accent color
   - `data.tsx`: Local database backup, JSON export, restore, database reset
   - `cloud-sync.tsx`: Supabase / Firebase cloud synchronization
   - `online-store.tsx`: Online storefront configuration

---

### B. State Management (`store/`)
*Zustand stores handle local reactive state and sync with SQLite:*

- `salesStore.ts`: Sales list, current sale cart, discounts, customer assignment
- `purchaseStore.ts`: Purchases list, supplier purchases, cost calculations
- `inventoryStore.ts`: Products list, categories, low stock filters
- `debtStore.ts`: Debt records, payments, summaries
- `customerStore.ts`: Customers list & stats
- `supplierStore.ts`: Suppliers list & stats
- `settingsStore.ts`: App settings (currency rates, dark mode, printer settings)
- `languageStore.ts`: Current locale (`ku` | `en`) and RTL flag
- `reportStore.ts`: Business metrics, calculations, revenue & profit
- `cartStore.ts`: Active sales cart operations

---

### C. Core Logic, Database & Utilities (`lib/`)

- `lib/sqlite.ts`: **Core SQLite layer**. Over 4,000 lines of robust SQL schemas, indexes, migrations (`froshiar.db`), transactions, CRUD operations for all entities.
- `lib/generateInvoice.ts`: Generates and prints / shares HTML-to-PDF receipts and audit reports.
- `lib/salesAuditReportTemplate.ts`: HTML/CSS template for Sales Audit PDF.
- `lib/purchasesAuditReportTemplate.ts`: HTML/CSS template for Purchases Audit PDF.
- `lib/invoiceTemplate.ts`: Standard POS receipt template.
- `lib/i18n.ts`: i18n configuration and Kurdish language detector.
- `lib/backup.ts`: Full database backup & restore engine.
- `lib/colorUtils.ts`: Color manipulation and theme generators.
- `lib/uuid.ts`: Cross-platform UUID generator.

---

### D. UI Components (`components/`)

- `components/shared/`: Shared modals and widgets (`PeriodFilterModal.tsx`, `CustomDateRangeModal.tsx`, etc.)
- `components/ui/`: Reusable primitives (buttons, inputs, cards, badges)
- `components/sales/`: Sales list cards, cart items, payment modals
- `components/purchases/`: Purchase item rows, supplier selectors
- `components/inventory/`: Product card, barcode reader, category picker
- `components/dashboard/`: Dashboard KPI widgets, quick action buttons

---

## 3. Design Conventions & Rules for Agents

1. **Language & RTL**:
   - The primary user language is Kurdish (`ku`).
   - All user-facing strings must have entries in both `locales/ku.json` and `locales/en.json`.
   - Text alignment and icons must respect Kurdish RTL layout.

2. **Theming & Colors**:
   - Always obtain theme colors via:
     ```tsx
     import { useAppTheme } from '@/contexts/ThemeContext';
     const { isDark, colors } = useAppTheme();
     ```
   - Primary Accent: `colors.primary` (`#D4AF37`).
   - Dark background: `colors.white` in dark mode (`#0F172A`).
   - Card background: `colors.gray100` (`#1E293B`).
   - Border: `colors.gray200` (`#334155`).

3. **Database Rules**:
   - Always query through `lib/sqlite.ts` helper functions; do not open raw unsynchronized connections.
   - Database operations are asynchronous (`async / await`).

4. **Consistency**:
   - Keep Sales and Purchases features aligned (filtering, PDF generation, period filters).
   - Use `PeriodFilterModal` in `components/shared/PeriodFilterModal.tsx` for date period selections rather than clunky in-line sliders.
