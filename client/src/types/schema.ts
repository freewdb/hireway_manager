export interface JobTitleSearchResult {
  code: string;
  title: string;
  description?: string;
  isAlternative: boolean;
  rank?: number;
  majorGroup?: {
    code: string;
    title: string;
  };
  minorGroup?: {
    code: string;
    title: string;
  };
} 