// Minimal Deno surface used by evo4.ts and legacy.ts, so the package type-checks under tsc as well as Deno.
declare namespace Deno {
  const args: string[];
  const pid: number;
  const env: { get(k: string): string | undefined };
  function cwd(): string;
  function readTextFile(p: string): Promise<string>;
  function readTextFileSync(p: string): string;
  function writeTextFile(p: string, s: string, o?: { append?: boolean }): Promise<void>;
  function mkdir(p: string, o?: { recursive?: boolean }): Promise<void>;
  function stat(p: string): Promise<unknown>;
  function remove(p: string, o?: { recursive?: boolean }): Promise<void>;
  function rename(from: string, to: string): Promise<void>;
  function readDir(p: string): AsyncIterable<{ name: string; isFile: boolean; isDirectory: boolean }>;
  function exit(code?: number): never;
}

declare module "npm:ajv@8.17.1/dist/2020.js" {
  const Ajv2020: unknown;
  export default Ajv2020;
}

// The shared Gemini client imports the SDK through Deno's npm: specifier; tsc only needs its shape.
declare module "npm:@google/genai@2.14.0" {
  export class GoogleGenAI {
    constructor(o: { apiKey: string });
    models: { generateContent(req: unknown): Promise<unknown> };
  }
}
