import { zodToJsonSchema } from "zod-to-json-schema";
import { TemplateMetaSchema } from "../src/index";
import fsExtra from "fs-extra/esm";
import path from "node:path";

const main = async () => {
  const jsonSchema = zodToJsonSchema(TemplateMetaSchema);
  const jsonPath = path.resolve(process.cwd(), "./schemas/meta.json");
  await fsExtra.outputFile(jsonPath, JSON.stringify(jsonSchema, null, 3));
};

main();
