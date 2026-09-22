export type DataClassification =
  | 'SUPPORTED'
  | 'PARTIALLY_SUPPORTED'
  | 'SOURCE_UNAVAILABLE'
  | 'BUSINESS_CONFIRMATION_REQUIRED';

export type SlideId =
  | 'slide_16'
  | 'slide_17'
  | 'slide_18'
  | 'slide_19'
  | 'slide_20'
  | 'slide_21'
  | 'slide_31';

export type SlideContract = {
  slideId: SlideId;
  slideNumber: number;
  title: string;
  classification: DataClassification;
  requiredFields: string[];
  supportedFields: string[];
  missingFields: string[];
  reason: string;
};

export type ReportProfile = {
  id: string;
  name: string;
  periodType: 'Weekly' | 'Monthly' | 'Campaign';
  supportedSlideNumbers: number[];
  excludedSlideNumbers: number[];
};

export const REPORT_PROFILES: Record<string, ReportProfile> = {
  'anymind-weekly': {
    id: 'anymind-weekly',
    name: 'AnyMind / Haleon Weekly',
    periodType: 'Weekly',
    supportedSlideNumbers: [16, 17, 18, 20, 21],
    excludedSlideNumbers: [19, 31],
  },
  'anymind-monthly': {
    id: 'anymind-monthly',
    name: 'AnyMind / Haleon Monthly',
    periodType: 'Monthly',
    supportedSlideNumbers: [16, 17, 18, 20, 21, 31],
    excludedSlideNumbers: [19],
  },
};

export const BUSINESS_CONFIRMATION_NOTE =
  'Human Business Confirmations: DEFERRED BY USER';
