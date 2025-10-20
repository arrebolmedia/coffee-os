import { render, screen } from '@testing-library/react';
import Home from '../app/page';

describe('Home Page', () => {
  it('renders without crashing', () => {
    render(<Home />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('displays the application title', () => {
    render(<Home />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
  });

  it('has proper semantic HTML structure', () => {
    const { container } = render(<Home />);
    const main = container.querySelector('main');
    expect(main).toBeInTheDocument();
  });
});
