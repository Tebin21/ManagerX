import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface OnboardingItem {
  icon: IoniconName;
  labelKey: string;
}

export interface OnboardingItemGroup {
  labelKey?: string;
  items: OnboardingItem[];
}

export interface OnboardingContentSlide {
  type: 'content';
  id: string;
  heroIcon: IoniconName;
  titleKey: string;
  descriptionKey: string;
  groups: OnboardingItemGroup[];
  closingKeys: string[];
}

export interface OnboardingFinalSlide {
  type: 'final';
  id: 'final';
  heroIcon: IoniconName;
  titleKey: string;
  descriptionKey: string;
  ctaLabelKey: string;
}

export type OnboardingSlideData = OnboardingContentSlide | OnboardingFinalSlide;

export const ONBOARDING_SLIDES: OnboardingSlideData[] = [
  {
    type: 'content',
    id: 'manage-business',
    heroIcon: 'briefcase',
    titleKey: 'onboarding.slide1.title',
    descriptionKey: 'onboarding.slide1.description',
    groups: [
      {
        items: [
          { icon: 'cube', labelKey: 'onboarding.slide1.items.inventory' },
          { icon: 'receipt', labelKey: 'onboarding.slide1.items.sales' },
          { icon: 'cart', labelKey: 'onboarding.slide1.items.purchases' },
          { icon: 'people', labelKey: 'onboarding.slide1.items.customers' },
          { icon: 'business', labelKey: 'onboarding.slide1.items.suppliers' },
          { icon: 'wallet', labelKey: 'onboarding.slide1.items.expenses' },
          { icon: 'card', labelKey: 'onboarding.slide1.items.debts' },
          { icon: 'bar-chart', labelKey: 'onboarding.slide1.items.financialReports' },
        ],
      },
    ],
    closingKeys: ['onboarding.slide1.closing'],
  },
  {
    type: 'content',
    id: 'online-store',
    heroIcon: 'globe',
    titleKey: 'onboarding.slide2.title',
    descriptionKey: 'onboarding.slide2.description',
    groups: [
      {
        items: [
          { icon: 'cloud-upload', labelKey: 'onboarding.slide2.items.publish' },
          { icon: 'share-social', labelKey: 'onboarding.slide2.items.shareLink' },
          { icon: 'image', labelKey: 'onboarding.slide2.items.showImages' },
          { icon: 'information-circle', labelKey: 'onboarding.slide2.items.showBusinessInfo' },
          { icon: 'settings', labelKey: 'onboarding.slide2.items.manageDirectly' },
        ],
      },
    ],
    closingKeys: ['onboarding.slide2.closing'],
  },
  {
    type: 'content',
    id: 'reports-insights',
    heroIcon: 'stats-chart',
    titleKey: 'onboarding.slide3.title',
    descriptionKey: 'onboarding.slide3.description',
    groups: [
      {
        labelKey: 'onboarding.slide3.reportTypesLabel',
        items: [
          { icon: 'today', labelKey: 'onboarding.slide3.reportTypes.daily' },
          { icon: 'calendar', labelKey: 'onboarding.slide3.reportTypes.weekly' },
          { icon: 'calendar-outline', labelKey: 'onboarding.slide3.reportTypes.monthly' },
          { icon: 'time', labelKey: 'onboarding.slide3.reportTypes.yearly' },
          { icon: 'options', labelKey: 'onboarding.slide3.reportTypes.customRange' },
        ],
      },
      {
        labelKey: 'onboarding.slide3.trackLabel',
        items: [
          { icon: 'trending-up', labelKey: 'onboarding.slide3.track.sales' },
          { icon: 'cash', labelKey: 'onboarding.slide3.track.profit' },
          { icon: 'trending-down', labelKey: 'onboarding.slide3.track.loss' },
          { icon: 'wallet', labelKey: 'onboarding.slide3.track.expenses' },
          { icon: 'cube', labelKey: 'onboarding.slide3.track.inventoryValue' },
          { icon: 'rocket', labelKey: 'onboarding.slide3.track.businessGrowth' },
        ],
      },
    ],
    closingKeys: ['onboarding.slide3.closing'],
  },
  {
    type: 'content',
    id: 'invoices',
    heroIcon: 'document-text',
    titleKey: 'onboarding.slide4.title',
    descriptionKey: 'onboarding.slide4.description',
    groups: [
      {
        items: [
          { icon: 'receipt', labelKey: 'onboarding.slide4.items.salesInvoices' },
          { icon: 'cart', labelKey: 'onboarding.slide4.items.purchaseInvoices' },
          { icon: 'document', labelKey: 'onboarding.slide4.items.pdfExport' },
          { icon: 'share-social', labelKey: 'onboarding.slide4.items.sharing' },
          { icon: 'print', labelKey: 'onboarding.slide4.items.printing' },
        ],
      },
    ],
    closingKeys: ['onboarding.slide4.closing'],
  },
  {
    type: 'content',
    id: 'business-types',
    heroIcon: 'storefront',
    titleKey: 'onboarding.slide5.title',
    descriptionKey: 'onboarding.slide5.description',
    groups: [
      {
        items: [
          { icon: 'phone-portrait', labelKey: 'onboarding.slide5.items.mobileShops' },
          { icon: 'hardware-chip', labelKey: 'onboarding.slide5.items.electronicsStores' },
          { icon: 'shirt', labelKey: 'onboarding.slide5.items.clothingStores' },
          { icon: 'basket', labelKey: 'onboarding.slide5.items.markets' },
          { icon: 'cart', labelKey: 'onboarding.slide5.items.supermarkets' },
          { icon: 'medkit', labelKey: 'onboarding.slide5.items.pharmacies' },
          { icon: 'restaurant', labelKey: 'onboarding.slide5.items.restaurants' },
          { icon: 'cafe', labelKey: 'onboarding.slide5.items.cafes' },
          { icon: 'sparkles', labelKey: 'onboarding.slide5.items.cosmeticsStores' },
          { icon: 'business', labelKey: 'onboarding.slide5.items.warehouses' },
        ],
      },
    ],
    closingKeys: ['onboarding.slide5.closing'],
  },
  {
    type: 'content',
    id: 'works-everywhere',
    heroIcon: 'phone-portrait',
    titleKey: 'onboarding.slide6.title',
    descriptionKey: 'onboarding.slide6.description',
    groups: [
      {
        items: [
          { icon: 'phone-portrait', labelKey: 'onboarding.slide6.items.mobilePhones' },
          { icon: 'tablet-portrait', labelKey: 'onboarding.slide6.items.tablets' },
          { icon: 'tablet-landscape', labelKey: 'onboarding.slide6.items.ipads' },
        ],
      },
    ],
    closingKeys: ['onboarding.slide6.closing1', 'onboarding.slide6.closing2'],
  },
  {
    type: 'final',
    id: 'final',
    heroIcon: 'rocket',
    titleKey: 'onboarding.final.title',
    descriptionKey: 'onboarding.final.description',
    ctaLabelKey: 'common.getStarted',
  },
];
