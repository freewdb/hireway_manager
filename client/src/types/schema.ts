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