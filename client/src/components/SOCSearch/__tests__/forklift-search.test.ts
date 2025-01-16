
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

describe('Forklift Operator Search in Mining Sector', () => {
  test('Should find and boost forklift operator results in mining sector', async () => {
    // Step 1: First get top occupations for Mining sector
    console.log('\n=== Step 1: Fetching Top Occupations for Mining Sector (NAICS21) ===');
    const topResponse = await fetch(`${BASE_URL}/api/soc/top?sector=21`);
    const topData = await topResponse.json();
    console.log('Top Occupations Response:', {
      status: topResponse.status,
      itemCount: topData.items?.length || 0,
      firstItem: topData.items?.[0]
    });

    // Step 2: Perform the search with sector context
    console.log('\n=== Step 2: Searching for "Forklift Operator" in Mining Sector ===');
    const searchResponse = await fetch(
      `${BASE_URL}/api/job-titles?search=forklift%20operator&sector=21`
    );
    const searchData = await searchResponse.json();

    // Log the full search response
    console.log('\nSearch Results:', {
      status: searchResponse.status,
      totalResults: searchData.items?.length || 0,
      query: searchData.query,
      totalCount: searchData.totalCount,
      currentPage: searchData.currentPage,
      totalPages: searchData.totalPages
    });

    // Analyze top results
    if (searchData.items?.length > 0) {
      searchData.items.slice(0, 3).forEach((result: any, index: number) => {
        console.log(`\nResult #${index + 1}:`, {
          code: result.code,
          title: result.title,
          primaryTitle: result.primaryTitle,
          sectorDistribution: result.sectorDistribution,
          rank: result.rank,
          isAlternative: result.isAlternative,
          matchedAlternatives: result.matchedAlternatives,
          topIndustries: result.topIndustries?.map((ind: any) => 
            `${ind.sector}: ${ind.percentage}%`
          )
        });
      });
    }

    // Verify we got results
    expect(searchData).toBeTruthy();
    expect(Array.isArray(searchData.items)).toBeTruthy();
    expect(searchData.items.length).toBeGreaterThan(0);

    // Verify first result is relevant
    if (searchData.items?.length > 0) {
      const firstResult = searchData.items[0];
      
      // Should be the forklift operator SOC code
      expect(firstResult.code).toBe('53-7051.00');
      
      // Should have a sector distribution for mining
      expect(firstResult.sectorDistribution).toBeDefined();
      
      // Should have top industries
      expect(firstResult.topIndustries).toBeDefined();
      expect(Array.isArray(firstResult.topIndustries)).toBeTruthy();
    }
  });
});
