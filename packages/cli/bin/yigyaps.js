#!/usr/bin/env node

/**
 * YigYaps CLI — Creator Tools
 * 
 * License: Apache 2.0
 */

import { Command } from "commander";
import chalk from "chalk";
import { initCommand } from "../src/commands/init.js";
import { validateCommand } from "../src/commands/validate.js";

const program = new Command();

program
    .name("yigyaps")
    .description("CLI tools for YigYaps skill creators")
    .version("0.1.0");

program
    .command("init")
    .description("Scaffold a new YigYaps skill package")
    .argument("[name]", "Name of the skill")
    .action(initCommand);

program
    .command("validate")
    .description("Validate the current skill package structure")
    .action(validateCommand);

program.parse();
