
import fetch from 'node-fetch';

describe('Industry-Specific SOC Search', () => {
  const BASE_URL = 'http://localhost:3000';
  
  test('Search for "Forklift Operator" in Mining sector (NAICS21)', async () => {
    // First get top occupations for the sector
    console.log('\n=== Fetching Top Occupations for Mining Sector ===');
    const topResponse = await fetch(`${BASE_URL}/api/soc/top?sector=21`);
    const topData = await topResponse.json();
    console.log('Top Occupations Response:', JSON.stringify(topData, null, 2));

    // Then perform the search with sector context
    console.log('\n=== Searching for "Forklift Operator" in Mining Sector ===');
    const searchResponse = await fetch(
      `${BASE_URL}/api/job-titles?search=Forklift%20Operator&sector=21`
    );
    const searchData = await searchResponse.json();

    // Log full response for debugging
    console.log('\nSearch Response:', JSON.stringify(searchData, null, 2));

    // Verify we got results
    expect(searchData).toBeTruthy();
    expect(Array.isArray(searchData.items)).toBeTruthy();

    // Check sector distribution boost
    if (searchData.items.length > 0) {
      const firstResult = searchData.items[0];
      console.log('\n=== Search Result Analysis ===');
      console.log('Top Result:', {
        code: firstResult.code,
        title: firstResult.title,
        sectorDistribution: firstResult.sectorDistribution,
        rank: firstResult.rank,
        isAlternative: firstResult.isAlternative
      });

      // Log boost calculation
      const distribution = firstResult.sectorDistribution || 0;
      let boostDescription = '';
      if (distribution >= 90) boostDescription = '2.0x (≥90%)';
      else if (distribution >= 75) boostDescription = '1.75x (≥75%)';
      else if (distribution >= 50) boostDescription = '1.5x (≥50%)';
      else if (distribution >= 25) boostDescription = '1.25x (≥25%)';
      else if (distribution >= 10) boostDescription = '1.1x (≥10%)';
      else if (distribution < 5) boostDescription = '0.75x (<5%)';
      else boostDescription = '1.0x';

      console.log('Sector Distribution Boost:', boostDescription);
    }
  });
});
