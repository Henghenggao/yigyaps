import { brandGradient } from './theme.js';

const LOGO = `
 __   __ _       __   __
 \\ \\ / /(_) __ _ \\ \\ / /  __ _  _ __   ___
  \\ V / | |/ _\` | \\ V /  / _\` || '_ \\ / __|
   | |  | | (_| |  | |  | (_| || |_) |\\__ \\
   |_|  |_|\\__, |  |_|   \\__,_|| .__/ |___/
            |___/               |_|
`;

export function showBanner(version: string) {
    console.log(brandGradient(LOGO));
    console.log(brandGradient.multiline(`  ✦  The MCP Skill Marketplace  v${version}  ✦\n`));
}
