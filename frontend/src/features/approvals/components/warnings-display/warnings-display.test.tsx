import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { WarningsDisplay } from './index';

describe('WarningsDisplay', () => {
    it('renders nothing when there are no warnings', () => {
        const { container } = render(<WarningsDisplay warnings={[]} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders warnings list correctly', () => {
        const warnings = ['Drop table detected', 'Unbounded query'];
        render(<WarningsDisplay warnings={warnings} />);

        expect(screen.getByText('Security Warnings')).toBeInTheDocument();
        expect(screen.getByText('Drop table detected')).toBeInTheDocument();
        expect(screen.getByText('Unbounded query')).toBeInTheDocument();
    });
});
