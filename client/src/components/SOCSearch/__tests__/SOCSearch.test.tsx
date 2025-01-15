
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SOCSearch } from '../index';
import type { JobTitleSearchResult } from '@/types/schema';

describe('SOCSearch', () => {
  it('renders search input', () => {
    render(
      <SOCSearch 
        onSelect={(result: JobTitleSearchResult) => {}} 
        placeholder="Search for occupations"
      />
    );
    const input = screen.getByRole('combobox');
    expect(input).toBeInTheDocument();
  });
});
