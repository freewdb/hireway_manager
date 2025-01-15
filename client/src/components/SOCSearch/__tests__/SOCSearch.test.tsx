
import { render, screen } from '@testing-library/react';
import { SOCSearch } from '../index';

describe('SOCSearch', () => {
  it('renders search input', () => {
    render(<SOCSearch onSelect={() => {}} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});
