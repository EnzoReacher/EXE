import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseArguments, parseEnv, verifyReviewPreflight } from "./review-preflight.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const script = path.join(root, "scripts", "review-preflight.mjs");

function withEnv(contents, callback) {
  const directory = mkdtempSync(path.join(tmpdir(), "exe-review-preflight-"));
  const file = path.join(directory, ".env.local");
  try {
    writeFileSync(file, contents);
    return callback(file);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe("owner-review preflight", () => {
  it("accepts a local-only public configuration and required fictional review material", () => {
    withEnv("NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=public-test-key\n", (file) => {
      const result = verifyReviewPreflight(file, root);
      expect(result.code).toBe(0);
      expect(result.messages.join(" ")).toContain("fictional DOCX");
    });
  });

  it("rejects a hosted URL and private credentials without echoing their values", () => {
    withEnv("NEXT_PUBLIC_SUPABASE_URL=https://project.example.test\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=public-test-key\n", (file) => {
      expect(verifyReviewPreflight(file, root).code).toBe(1);
    });
    withEnv("NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=public-test-key\nSUPABASE_SERVICE_ROLE_KEY=private-sentinel\n", (file) => {
      const result = verifyReviewPreflight(file, root);
      expect(result.code).toBe(2);
      expect(result.messages.join(" ")).not.toContain("private-sentinel");
    });
  });

  it("rejects missing settings and accepts an explicit local configuration", () => {
    withEnv("NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321\n", (file) => {
      expect(verifyReviewPreflight(file, root).code).toBe(1);
    });
    withEnv("NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=public-sentinel\n", (file) => {
      const result = spawnSync(process.execPath, [script, "--config", file], { cwd: root, encoding: "utf8" });
      expect(result.status).toBe(0);
    });
  });

  it("parses ordinary dotenv values and permits only the explicit CLI shape", () => {
    expect(parseEnv("export A=one\nB='two'\n# C=three\n")).toEqual({ A: "one", B: "two" });
    expect(parseArguments([])).toEqual({ envFile: ".env.local" });
    expect(parseArguments(["--config", "test.env"])).toEqual({ envFile: "test.env" });
    expect(parseArguments(["--wrong", "test.env"])).toBeNull();
    expect(parseArguments(["--config"])).toBeNull();
  });
});
