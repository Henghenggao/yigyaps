import chalk from 'chalk';
import gradient from 'gradient-string';

// Brand gradient: warm orange → magenta → purple
export const brandGradient = gradient('#FF6B35', '#D63384', '#7C4DFF');

export const colors = {
    primary: chalk.hex('#FF6B35'),
    accent: chalk.hex('#7C4DFF'),
    success: chalk.hex('#00E676'),
    warning: chalk.hex('#FFD600'),
    error: chalk.hex('#FF1744'),
    muted: chalk.dim,
    link: chalk.hex('#2979FF').underline,
    label: chalk.bold.hex('#B0BEC5'),
    value: chalk.white,
};

export const icons = {
    success: '✔',
    error: '✖',
    warn: '▲',
    info: '●',
    package: '📦',
    user: '👤',
    star: '⭐',
    tag: '🏷️',
    link: '🔗',
    rocket: '🚀',
};
