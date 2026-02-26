import boxen from 'boxen';
import { colors, icons } from './theme.js';

/** Renders a key-value pair block */
export function keyValue(items: Record<string, string>): string {
    return Object.entries(items)
        .map(([k, v]) => `  ${colors.label(k.padEnd(12))} ${colors.value(v)}`)
        .join('\n');
}

/** Renders a skill info card using boxen */
export function skillCard(pkg: {
    displayName: string; packageId: string; version: string;
    description: string; authorName: string; category: string;
    tags?: string[]; installCount?: number; rating?: number;
    ratingCount?: number; license?: string;
}): string {
    const title = `${icons.package} ${colors.primary(pkg.displayName)}  ${colors.muted(`v${pkg.version}`)}`;
    const sep = colors.muted('─'.repeat(44));
    const body = [
        title, sep,
        colors.muted(pkg.description), '',
        keyValue({
            [`${icons.user} Author`]: `@${pkg.authorName}`,
            ['📁 Category']: pkg.category,
            [`${icons.star} Rating`]: `${pkg.rating ?? 'N/A'} (${pkg.ratingCount ?? 0} reviews)`,
            ['📥 Installs']: String(pkg.installCount ?? 0),
            ...(pkg.tags?.length ? { [`${icons.tag} Tags`]: pkg.tags.join(' · ') } : {}),
        }),
    ].join('\n');

    return boxen(body, {
        padding: 1, borderColor: '#7C4DFF', borderStyle: 'round', dimBorder: true,
    });
}

/** Renders a titled panel */
export function panel(title: string, content: string): string {
    return boxen(content, {
        title, titleAlignment: 'left',
        padding: 1, borderColor: '#7C4DFF', borderStyle: 'round', dimBorder: true,
    });
}

/** Renders a compact skill list item (for search results) */
export function skillListItem(pkg: {
    packageId: string; displayName: string; version: string;
    description: string; authorName: string; category: string;
    rating?: number; installCount?: number;
}): string {
    return [
        `  ${icons.package} ${colors.primary(pkg.displayName)}  ${colors.muted(`v${pkg.version}`)}`,
        `     ${colors.muted(pkg.description)}`,
        `     ${colors.muted(`by @${pkg.authorName}  •  ${pkg.category}  •  ${icons.star} ${pkg.rating ?? 'N/A'}  •  📥 ${pkg.installCount ?? 0}`)}`,
    ].join('\n');
}
