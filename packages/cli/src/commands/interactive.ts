import { p, assertNotCancelled } from "../lib/ui/prompts.js";
import { renderBanner } from "../lib/ui/banner.js";
import { searchCommand } from "./search.js";
import { listCommand } from "./list.js";
import { doctorCommand } from "./doctor.js";
import { whoamiCommand } from "./whoami.js";
import { loginCommand } from "./login.js";
import { logoutCommand } from "./logout.js";
import { getSession } from "../lib/auth.js";

/**
 * Interactive Main Menu
 */
export async function interactiveCommand() {
  renderBanner();

  const session = getSession();
  let isLoggedIn = !!session.apiKey;

  while (true) {
    const choice = assertNotCancelled(
      await p.select({
        message: "What would you like to do?",
        options: [
          {
            value: "browse",
            label: "🔍 Browse Skills",
            hint: "Search and explore the registry",
          },
          {
            value: "list",
            label: "📦 My Library",
            hint: "Show installed skills",
          },
          {
            value: "status",
            label: "⚡ System Status",
            hint: "Run diagnostics & check connectivity",
          },
          {
            value: "account",
            label: isLoggedIn ? "👤 My Profile" : "🔑 Login",
            hint: isLoggedIn
              ? "View account and earnings"
              : "Sign in with GitHub",
          },
          { value: "exit", label: "🚪 Exit", hint: "Quit the CLI" },
        ] as Array<{ value: string; label: string; hint?: string }>,
      }),
    ) as string;

    if (choice === "exit") break;

    switch (choice) {
      case "browse": {
        const query = await p.text({
          message: "Search query (leave empty to browse latest):",
          placeholder: "e.g. twitter, finance, tool...",
        });
        if (!p.isCancel(query)) {
          await searchCommand(query || undefined, {});
        }
        break;
      }
      case "list": {
        await listCommand({});
        await p.note("Press enter to return to the main menu.");
        break;
      }
      case "status": {
        await doctorCommand();
        await p.note("Press enter to return to the main menu.");
        break;
      }
      case "account": {
        if (isLoggedIn) {
          await whoamiCommand();
          const subChoice = await p.select({
            message: "Account actions:",
            options: [
              { value: "back", label: "⬅️ Back to menu" },
              {
                value: "logout",
                label: "🚪 Logout",
                hint: "Sign out of your session",
              },
            ],
          });
          if (subChoice === "logout") {
            await logoutCommand();
            isLoggedIn = false;
          }
        } else {
          await loginCommand({});
          isLoggedIn = true;
        }
        break;
      }
    }

    // Pause before returning to menu
    if (choice !== "exit") {
      await p.note("Press enter to return to the main menu.");
    }
  }
}
