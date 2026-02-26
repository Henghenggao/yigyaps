import chalk from 'chalk';

/**
 * CLI Logger
 * 
 * Consistent output styling with support for hints.
 */
export const logger = {
    info: (msg: string) => {
        console.log(chalk.blue('ℹ'), msg);
    },
    success: (msg: string) => {
        console.log(chalk.green('✅'), msg);
    },
    warn: (msg: string) => {
        console.log(chalk.yellow('⚠️'), msg);
    },
    error: (msg: string, hint?: string) => {
        console.error(chalk.red('❌'), chalk.red(msg));
        if (hint) {
            console.error(chalk.yellow(`\n💡 Suggested fix: ${hint}`));
        }
    },
    bold: (msg: string) => {
        console.log(chalk.bold(msg));
    },

    hint: (msg: string) => {
        console.log(chalk.dim(`💡 ${msg}`));
    },
};
