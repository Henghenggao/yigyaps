/** @vitest-environment jsdom */
import './setup';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SkillCard } from '../components/SkillCard';
import { MemoryRouter } from 'react-router-dom';
import type { SkillPackage } from '@yigyaps/types';

const mockSkill = {
    packageId: 'com.test.skill',
    version: '1.0.0',
    displayName: 'Test Skill',
    description: 'A skill for testing',
    author: 'tester',
    authorName: 'Test Author',
    license: 'open-source',
    priceUsd: 0,
    requiresApiKey: false,
    category: 'productivity',
    maturity: 'stable',
    tags: ['test'],
    minRuntimeVersion: '0.1.0',
    requiredTier: 0,
    mcpTransport: 'stdio',
    installCount: 100,
    rating: 4.5,
    ratingCount: 10,
    reviewCount: 5,
    origin: 'community',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    releasedAt: Date.now(),
} as unknown as SkillPackage;

describe('SkillCard', () => {
    it('renders skill attributes correctly', () => {
        render(
            <MemoryRouter>
                <SkillCard skill={mockSkill} />
            </MemoryRouter>
        );

        expect(screen.getByText('Test Skill')).toBeTruthy();

        // Check if the rating is displayed
        expect(screen.getByText(/4\.5/)).toBeTruthy();
    });
});
