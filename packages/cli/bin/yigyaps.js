#!/usr/bin/env node

/**
 * YigYaps CLI — Shim & Error Boundary
 */

import { run } from "../dist/index.js";
import { CliError } from "../dist/lib/errors.js";
import { logger } from "../dist/lib/logger.js";

async function main() {
    try {
        await run();
    } catch (err) {
        if (err instanceof CliError) {
            if (err.message) {
                logger.error(err.message);
            }
            process.exit(err.exitCode);
        }

        // Unexpected errors
        console.error("\n💥 Unexpected error occurred:");
        console.error(err);
        process.exit(2);
    }
}

main();
