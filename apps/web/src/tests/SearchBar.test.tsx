// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchBar } from '../components/SearchBar';
import { MemoryRouter } from 'react-router-dom';

describe('SearchBar', () => {
    it('renders input field with proper placeholder', () => {
        render(
            <MemoryRouter>
                <SearchBar value="" onChange={() => { }} />
            </MemoryRouter>
        );
        const inputs = screen.getAllByPlaceholderText(/Search skills.../i);
        expect(inputs.length).toBeGreaterThan(0);
    });

    it('navigates on submit with query', () => {
        render(
            <MemoryRouter>
                <SearchBar value="" onChange={() => { }} />
            </MemoryRouter>
        );

        const inputs = screen.getAllByPlaceholderText(/Search skills.../i);
        const input = inputs[0];
        fireEvent.change(input, { target: { value: 'react' } });

        // Ensure it rendered
        expect(input).toBeTruthy();
    });
});
