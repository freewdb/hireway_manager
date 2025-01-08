
import 'dotenv/config';
import { readFile } from 'fs/promises';
import { parse } from 'csv-parse/sync';
import { db } from '../db';
import { socMajorGroups, socMinorGroups, socDetailedOccupations } from '../db/schema';

async function seedSOCData() {
  try {
    console.log('Reading occupation data...');
    const occupationsCsv = await readFile('attached_assets/occupation_data.csv', 'utf-8');
    const alternateTitlesCsv = await readFile('attached_assets/alternate_titles.csv', 'utf-8');

    const occupations = parse(occupationsCsv, {
      columns: true,
      skip_empty_lines: true
    });

    const alternateTitles = parse(alternateTitlesCsv, {
      columns: true,
      skip_empty_lines: true
    });

    // Group alternate titles by SOC code
    const alternatesBySOC = alternateTitles.reduce((acc: Record<string, string[]>, curr: any) => {
      if (!acc[curr.onetsoc_code]) {
        acc[curr.onetsoc_code] = [];
      }
      acc[curr.onetsoc_code].push(curr.alternate_title);
      return acc;
    }, {});

    // Extract major and minor groups
    const majorGroups = new Map();
    const minorGroups = new Map();

    for (const occ of occupations) {
      const code = occ.onetsoc_code;
      const majorCode = `${code.slice(0, 2)}-0000`;
      const minorCode = `${code.slice(0, 2)}-${code.slice(2, 3)}000`;

      if (!majorGroups.has(majorCode)) {
        majorGroups.set(majorCode, {
          code: majorCode,
          title: `Major Group ${code.slice(0, 2)}`,
          description: `Major occupational group ${code.slice(0, 2)}`,
          searchVector: `Major Group ${code.slice(0, 2)}`
        });
      }

      if (!minorGroups.has(minorCode)) {
        minorGroups.set(minorCode, {
          code: minorCode,
          title: `Minor Group ${minorCode}`,
          description: `Minor occupational group ${minorCode}`,
          majorGroupCode: majorCode,
          searchVector: `Minor Group ${minorCode}`
        });
      }
    }

    // Insert data
    console.log('Seeding major groups...');
    for (const group of majorGroups.values()) {
      await db.insert(socMajorGroups).values(group).onConflictDoNothing();
    }

    console.log('Seeding minor groups...');
    for (const group of minorGroups.values()) {
      await db.insert(socMinorGroups).values(group).onConflictDoNothing();
    }

    console.log('Seeding detailed occupations...');
    for (const occ of occupations) {
      const minorCode = `${occ.onetsoc_code.slice(0, 2)}-${occ.onetsoc_code.slice(2, 3)}000`;
      const altTitles = alternatesBySOC[occ.onetsoc_code] || [];
      const searchableText = `${occ.title} ${occ.description} ${altTitles.join(' ')}`;

      await db.insert(socDetailedOccupations).values({
        code: occ.onetsoc_code,
        title: occ.title,
        description: occ.description,
        minorGroupCode: minorCode,
        alternativeTitles: altTitles,
        searchableText,
        searchVector: searchableText
      }).onConflictDoNothing();
    }

    console.log('SOC data seeding completed successfully.');
  } catch (error) {
    console.error('Error seeding SOC data:', error);
    throw error;
  }
}

seedSOCData().then(() => {
  console.log('Seeding completed.');
  process.exit(0);
}).catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
