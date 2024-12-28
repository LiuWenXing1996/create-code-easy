import { Program } from "@/program";
import { version } from "@/../package.json";

export const read = async () => {
  const program = new Program({
    processArgs: process.argv,
    version,
    name: "create",
  });
  await program.parse();
};
