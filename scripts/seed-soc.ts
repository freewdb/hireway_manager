import 'dotenv/config';
import { db } from '../db';
import { socMajorGroups, socMinorGroups, socDetailedOccupations } from '../db/schema';

// Sample SOC data for testing
const sampleData = {
  majorGroups: [
    {
      code: '15-0000',
      title: 'Computer and Mathematical Occupations',
      description: 'Occupations concerned with computer systems, programming, mathematics, statistics, actuarial science, operations research, and data science.'
    }
  ],
  minorGroups: [
    {
      code: '15-1200',
      title: 'Computer Occupations',
      description: 'All occupations that primarily involve working with computer systems, software, and data.',
      majorGroupCode: '15-0000'
    }
  ],
  detailedOccupations: [
    {
      code: '15-1252',
      title: 'Software Developers',
      description: 'Research, design, and develop computer software systems. Create applications, frameworks, and other software components.',
      minorGroupCode: '15-1200',
      alternativeTitles: [
        'Software Engineer',
        'Application Developer',
        'Full Stack Developer',
        'Front End Developer',
        'Back End Developer',
        'Systems Developer'
      ],
      searchableText: 'programming coding development software engineering applications web mobile cloud architecture design systems'
    },
    {
      code: '15-1251',
      title: 'Computer Programmers',
      description: 'Write and test code that allows computer applications and software programs to function properly.',
      minorGroupCode: '15-1200',
      alternativeTitles: [
        'Programmer',
        'Coder',
        'Software Programmer',
        'Application Programmer',
        'Systems Programmer'
      ],
      searchableText: 'coding development programming software applications systems implementation'
    }
  ]
};

async function seedSOCData() {
  try {
    console.log('Seeding SOC data...');

    // Insert major groups
    for (const group of sampleData.majorGroups) {
      await db.insert(socMajorGroups).values({
        ...group,
        searchVector: group.title + ' ' + (group.description || '')
      }).onConflictDoNothing();
    }
    console.log('Major groups seeded.');

    // Insert minor groups
    for (const group of sampleData.minorGroups) {
      await db.insert(socMinorGroups).values({
        ...group,
        searchVector: group.title + ' ' + (group.description || '')
      }).onConflictDoNothing();
    }
    console.log('Minor groups seeded.');

    // Insert detailed occupations
    for (const occupation of sampleData.detailedOccupations) {
      await db.insert(socDetailedOccupations).values({
        ...occupation,
        searchVector: `${occupation.title} ${occupation.alternativeTitles?.join(' ')} ${occupation.searchableText}`
      }).onConflictDoNothing();
    }
    console.log('Detailed occupations seeded.');

    console.log('SOC data seeding completed successfully.');
  } catch (error) {
    console.error('Error seeding SOC data:', error);
    throw error;
  }
}

// Run the seeding
seedSOCData().then(() => {
  console.log('Seeding completed.');
  process.exit(0);
}).catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
}); 