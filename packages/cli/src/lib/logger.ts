import { colors } from "./ui/theme.js";

/**
 * CLI Logger
 *
 * Consistent output styling with support for hints.
 */
export const logger = {
  info: (msg: string) => {
    console.log(colors.accent("●"), msg);
  },
  success: (msg: string) => {
    console.log(colors.success("✔"), msg);
  },
  warn: (msg: string) => {
    console.log(colors.warning("▲"), msg);
  },
  error: (msg: string, hint?: string) => {
    console.error(colors.error("✖"), colors.error(msg));
    if (hint) {
      console.error(colors.warning(`\n💡 Suggested fix: ${hint}`));
    }
  },
  bold: (msg: string) => {
    console.log(colors.primary.bold(msg));
  },

  hint: (msg: string) => {
    console.log(colors.muted(`💡 ${msg}`));
  },
};
