import { generateScript } from "./scripts/generate.script";
import { preGenerateScript } from "./scripts/pre-generate.script";

// Parse command line arguments
function parseArgs(): { clean: boolean } {
  const args = process.argv.slice(2);
  return {
    clean: args.includes("--clean") || args.includes("--reset"),
  };
}

// Run the script
if (import.meta.main) {
  const args = parseArgs();

  if (args.clean) {
    preGenerateScript()
      .then(() => {
        console.log("\n🎯 Cleanup completed. Ready for fresh generation!");
      })
      .catch((error) => {
        console.error("❌ Cleanup failed:", error);
        process.exit(1);
      });
  } else {
    generateScript();
  }
}
