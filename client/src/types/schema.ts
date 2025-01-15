export interface JobTitleSearchResult {
  code: string;
  title: string;
  description?: string;
  isAlternative: boolean;
  rank?: number;
  sectorDistribution?: number;
  majorGroup?: {
    code: string;
    title: string;
  };
  minorGroup?: {
    code: string;
    title: string;
  };
} 
export interface JobTitleSearchResult {
  code: string;
  title: string;
  description?: string;
  alternativeTitles?: string[];
  sectorDistribution?: number;
  topIndustries?: Array<{
    sector: string;
    percentage: number;
  }>;
  rank?: number;
}
