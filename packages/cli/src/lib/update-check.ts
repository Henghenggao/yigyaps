import updateNotifier from "update-notifier";
import { brandGradient } from "./ui/theme.js";
import boxen from "boxen";

/**
 * Checks for package updates and notifies the user
 */
export async function checkForUpdates(pkg: any) {
  const notifier = updateNotifier({
    pkg,
    updateCheckInterval: 1000 * 60 * 60 * 24, // Check once a day
  });

  if (notifier.update) {
    const { latest, current } = notifier.update;

    const message =
      `Update available: ${brandGradient(current)} → ${brandGradient.multiline(latest)}\n` +
      `Run ${brandGradient.multiline("npm install -g " + pkg.name)} to update.`;

    console.log(
      "\n" +
        boxen(message, {
          padding: 1,
          margin: 1,
          align: "center",
          borderColor: "yellow",
          borderStyle: "round",
          title: "✦ Update Available ✦",
          titleAlignment: "center",
        }),
    );
  }
}
