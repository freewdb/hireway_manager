
import { readFile } from 'fs/promises';
import { parse } from 'csv-parse/sync';
import { db } from '../db';
import { socMajorGroups, socMinorGroups, socDetailedOccupations } from '../db/schema';

interface OccupationData {
  onetsoc_code: string;
  title: string;
  description: string;
}

interface AlternateTitle {
  onetsoc_code: string;
  alternate_title: string;
  short_title?: string;
  sources?: string;
}

interface ConsolidatedOccupation {
  code: string;
  title: string;
  description: string;
  alternativeTitles: Set<string>;
  minorGroupCode: string;
}

function extractSOCCode(onetCode: string): string {
  // Keep the full ONET code (e.g. "11-1011.00")
  return onetCode;
}

function extractMajorGroupCode(socCode: string): string {
  // Get major group code (e.g. "11-0000" from "11-1011")
  return `${socCode.slice(0, 2)}-0000`;
}

function extractMinorGroupCode(socCode: string): string {
  // Get minor group code (e.g. "11-1000" from "11-1011")
  return `${socCode.slice(0, 2)}-${socCode.slice(2, 3)}000`;
}

function getMajorGroupTitle(code: string): string {
  const majorGroupTitles: Record<string, string> = {
    '11-0000': 'Management Occupations',
    '13-0000': 'Business and Financial Operations Occupations',
    '15-0000': 'Computer and Mathematical Occupations',
    '17-0000': 'Architecture and Engineering Occupations',
    '19-0000': 'Life, Physical, and Social Science Occupations',
    '21-0000': 'Community and Social Service Occupations',
    '23-0000': 'Legal Occupations',
    '25-0000': 'Educational Instruction and Library Occupations',
    '27-0000': 'Arts, Design, Entertainment, Sports, and Media Occupations',
    '29-0000': 'Healthcare Practitioners and Technical Occupations',
    '31-0000': 'Healthcare Support Occupations',
    '33-0000': 'Protective Service Occupations',
    '35-0000': 'Food Preparation and Serving Related Occupations',
    '37-0000': 'Building and Grounds Cleaning and Maintenance Occupations',
    '39-0000': 'Personal Care and Service Occupations',
    '41-0000': 'Sales and Related Occupations',
    '43-0000': 'Office and Administrative Support Occupations',
    '45-0000': 'Farming, Fishing, and Forestry Occupations',
    '47-0000': 'Construction and Extraction Occupations',
    '49-0000': 'Installation, Maintenance, and Repair Occupations',
    '51-0000': 'Production Occupations',
    '53-0000': 'Transportation and Material Moving Occupations',
    '55-0000': 'Military Specific Occupations',
  };
  return majorGroupTitles[code] || 'Unknown Major Group';
}

function getMinorGroupTitle(code: string): string {
  const minorGroupTitles: Record<string, string> = {
    '11-1000': 'Top Executives',
    '11-2000': 'Advertising, Marketing, Promotions, Public Relations, and Sales Managers',
    '11-3000': 'Operations Specialties Managers',
    '11-9000': 'Other Management Occupations',
    '13-1000': 'Business Operations Specialists',
    '13-2000': 'Financial Specialists',
    '15-1200': 'Computer Occupations',
    '15-2000': 'Mathematical Science Occupations',
    '17-1000': 'Architects, Surveyors, and Cartographers',
    '17-2000': 'Engineers',
    '17-3000': 'Drafters, Engineering Technicians, and Mapping Technicians',
    '19-1000': 'Life Scientists',
    '19-2000': 'Physical Scientists',
    '19-3000': 'Social Scientists and Related Workers',
    '19-4000': 'Life, Physical, and Social Science Technicians',
    '21-1000': 'Counselors, Social Workers, and Other Community and Social Service Specialists',
    '21-2000': 'Religious Workers',
    '23-1000': 'Lawyers, Judges, and Related Workers',
    '23-2000': 'Legal Support Workers',
    '25-1000': 'Postsecondary Teachers',
    '25-2000': 'Preschool, Elementary, Middle, Secondary, and Special Education Teachers',
    '25-3000': 'Other Teachers and Instructors',
    '25-4000': 'Librarians, Curators, and Archivists',
    '25-9000': 'Other Educational Instruction and Library Occupations',
    '27-1000': 'Art and Design Workers',
    '27-2000': 'Entertainers and Performers, Sports and Related Workers',
    '27-3000': 'Media and Communication Workers',
    '27-4000': 'Media and Communication Equipment Workers',
    '29-1000': 'Healthcare Diagnosing or Treating Practitioners',
    '29-2000': 'Health Technologists and Technicians',
    '29-9000': 'Other Healthcare Practitioners and Technical Occupations',
    '31-1000': 'Nursing, Psychiatric, and Home Health Aides',
    '31-2000': 'Occupational Therapy and Physical Therapist Assistants and Aides',
    '31-9000': 'Other Healthcare Support Occupations',
    '33-1000': 'First-Line Supervisors of Protective Service Workers',
    '33-2000': 'Fire Fighting and Prevention Workers',
    '33-3000': 'Law Enforcement Workers',
    '33-9000': 'Other Protective Service Workers',
    '35-1000': 'Supervisors of Food Preparation and Serving Workers',
    '35-2000': 'Cooks and Food Preparation Workers',
    '35-3000': 'Food and Beverage Serving Workers',
    '35-9000': 'Other Food Preparation and Serving Related Workers',
    '37-1000': 'Supervisors of Building and Grounds Cleaning and Maintenance Workers',
    '37-2000': 'Building Cleaning and Pest Control Workers',
    '37-3000': 'Grounds Maintenance Workers',
    '39-1000': 'Supervisors of Personal Care and Service Workers',
    '39-2000': 'Animal Care and Service Workers',
    '39-3000': 'Entertainment Attendants and Related Workers',
    '39-4000': 'Funeral Service Workers',
    '39-5000': 'Personal Appearance Workers',
    '39-6000': 'Baggage Porters, Bellhops, and Concierges',
    '39-7000': 'Tour and Travel Guides',
    '39-9000': 'Other Personal Care and Service Workers',
    '41-1000': 'Supervisors of Sales Workers',
    '41-2000': 'Retail Sales Workers',
    '41-3000': 'Sales Representatives, Services',
    '41-4000': 'Sales Representatives, Wholesale and Manufacturing',
    '41-9000': 'Other Sales and Related Workers',
    '43-1000': 'Supervisors of Office and Administrative Support Workers',
    '43-2000': 'Communications Equipment Operators',
    '43-3000': 'Financial Clerks',
    '43-4000': 'Information and Record Clerks',
    '43-5000': 'Material Recording, Scheduling, Dispatching, and Distributing Workers',
    '43-6000': 'Secretaries and Administrative Assistants',
    '43-9000': 'Other Office and Administrative Support Workers',
    '45-1000': 'Supervisors of Farming, Fishing, and Forestry Workers',
    '45-2000': 'Agricultural Workers',
    '45-3000': 'Fishing and Hunting Workers',
    '45-4000': 'Forest, Conservation, and Logging Workers',
    '47-1000': 'Supervisors of Construction and Extraction Workers',
    '47-2000': 'Construction Trades Workers',
    '47-3000': 'Helpers, Construction Trades',
    '47-4000': 'Other Construction and Related Workers',
    '47-5000': 'Extraction Workers',
    '49-1000': 'Supervisors of Installation, Maintenance, and Repair Workers',
    '49-2000': 'Electrical and Electronic Equipment Mechanics, Installers, and Repairers',
    '49-3000': 'Vehicle and Mobile Equipment Mechanics, Installers, and Repairers',
    '49-9000': 'Other Installation, Maintenance, and Repair Occupations',
    '51-1000': 'Supervisors of Production Workers',
    '51-2000': 'Assemblers and Fabricators',
    '51-3000': 'Food Processing Workers',
    '51-4000': 'Metal Workers and Plastic Workers',
    '51-5000': 'Printing Workers',
    '51-6000': 'Textile, Apparel, and Furnishings Workers',
    '51-7000': 'Woodworkers',
    '51-8000': 'Plant and System Operators',
    '51-9000': 'Other Production Occupations',
    '53-1000': 'Supervisors of Transportation and Material Moving Workers',
    '53-2000': 'Air Transportation Workers',
    '53-3000': 'Motor Vehicle Operators',
    '53-4000': 'Rail Transportation Workers',
    '53-5000': 'Water Transportation Workers',
    '53-6000': 'Other Transportation Workers',
    '53-7000': 'Material Moving Workers',
    '55-1000': 'Military Officer Special and Tactical Operations Leaders',
    '55-2000': 'First-Line Enlisted Military Supervisors',
    '55-3000': 'Military Enlisted Tactical Operations and Air/Weapons Specialists and Crew Members'
  };
  return minorGroupTitles[code] || 'Unknown Minor Group';
}

async function importSOCData() {
  try {
    console.log('Reading occupation data...');
    const occupationsCsv = await readFile('attached_assets/occupation_data.csv', 'utf-8');
    const alternateTitlesCsv = await readFile('attached_assets/alternate_titles.csv', 'utf-8');

    const occupations: OccupationData[] = parse(occupationsCsv, {
      columns: true,
      skip_empty_lines: true
    });

    console.log(`Parsed ${occupations.length} occupations from CSV`);

    const alternateTitles: AlternateTitle[] = parse(alternateTitlesCsv, {
      columns: true,
      skip_empty_lines: true
    });

    console.log(`Parsed ${alternateTitles.length} alternate titles from CSV`);

    // Group alternate titles by SOC code
    const alternatesBySOC = alternateTitles.reduce((acc, curr) => {
      const socCode = extractSOCCode(curr.onetsoc_code);
      if (!acc[socCode]) {
        acc[socCode] = new Set<string>();
      }
      acc[socCode].add(curr.alternate_title);
      return acc;
    }, {} as Record<string, Set<string>>);

    console.log(`Grouped alternate titles by ${Object.keys(alternatesBySOC).length} SOC codes`);

    // Consolidate occupations with the same SOC code
    const consolidatedOccupations = new Map<string, ConsolidatedOccupation>();
    
    for (const occupation of occupations) {
      const socCode = extractSOCCode(occupation.onetsoc_code);
      const minorGroupCode = extractMinorGroupCode(socCode);
      
      if (!consolidatedOccupations.has(socCode)) {
        consolidatedOccupations.set(socCode, {
          code: socCode,
          title: occupation.title,
          description: occupation.description,
          alternativeTitles: new Set<string>(),
          minorGroupCode
        });
      }
      
      const consolidated = consolidatedOccupations.get(socCode)!;
      
      // Add the current title as an alternative if it's different from the primary
      if (occupation.title !== consolidated.title) {
        consolidated.alternativeTitles.add(occupation.title);
      }
      
      // Add any alternate titles for this occupation
      const altTitles = alternatesBySOC[socCode];
      if (altTitles) {
        altTitles.forEach(title => consolidated.alternativeTitles.add(title));
      }
    }

    console.log(`Consolidated into ${consolidatedOccupations.size} unique SOC codes`);

    // Extract unique major and minor groups
    const majorGroups = new Set<string>();
    const minorGroups = new Set<string>();
    
    for (const [socCode] of consolidatedOccupations) {
      majorGroups.add(extractMajorGroupCode(socCode));
      minorGroups.add(extractMinorGroupCode(socCode));
    }

    console.log(`Found ${majorGroups.size} major groups and ${minorGroups.size} minor groups`);

    // Clear existing data
    console.log('Clearing existing data...');
    await db.delete(socDetailedOccupations);
    await db.delete(socMinorGroups);
    await db.delete(socMajorGroups);

    console.log('Inserting major groups...');
    for (const code of majorGroups) {
      const title = getMajorGroupTitle(code);
      const description = `All occupations in the ${title.toLowerCase()} field.`;
      await db.insert(socMajorGroups).values({
        code,
        title,
        description,
        searchVector: `${title} ${description}`
      });
    }

    console.log('Inserting minor groups...');
    for (const code of minorGroups) {
      const title = getMinorGroupTitle(code);
      const majorGroupCode = extractMajorGroupCode(code);
      const description = `A subset of ${getMajorGroupTitle(majorGroupCode).toLowerCase()} focusing on ${title.toLowerCase()}.`;
      await db.insert(socMinorGroups).values({
        code,
        title,
        description,
        majorGroupCode,
        searchVector: `${title} ${description}`
      });
    }

    console.log('Inserting detailed occupations...');
    let insertedCount = 0;
    for (const occupation of consolidatedOccupations.values()) {
      // Create searchable text combining all relevant information
      const searchableText = [
        occupation.title,
        occupation.description,
        ...Array.from(occupation.alternativeTitles)
      ].filter(Boolean).join(' ').toLowerCase();

      try {
        await db.insert(socDetailedOccupations).values({
          code: occupation.code,
          title: occupation.title,
          description: occupation.description,
          minorGroupCode: occupation.minorGroupCode,
          alternativeTitles: Array.from(occupation.alternativeTitles),
          searchableText,
          searchVector: searchableText
        });
        insertedCount++;
        if (insertedCount % 100 === 0) {
          console.log(`Inserted ${insertedCount} occupations...`);
        }
      } catch (error) {
        console.error(`Error inserting occupation ${occupation.code} (${occupation.title}):`, error);
      }
    }

    console.log(`Import completed successfully! Inserted ${insertedCount} occupations.`);
    process.exit(0);
  } catch (error) {
    console.error('Error importing SOC data:', error);
    process.exit(1);
  }
}

// Run the import
importSOCData();
