import { expect, it } from "vitest";
import { parseDisclosure } from "./disclosure";
it.each([null, [], {}, { provider: null, purpose: "v1", external: true }, { provider: "OpenAI", purpose: "", external: true }, { provider: "OpenAI", purpose: "v1", external: "false" }, { provider: "x".repeat(81), purpose: "v1", external: true }])("rejects malformed sharing metadata", value => expect(() => parseDisclosure(value)).toThrow(/Sharing details/));
it("retains the exact provider/purpose/transmission identity used for acknowledgement", () => expect(parseDisclosure({ provider: "OpenAI", purpose: "scan-rewrite-v1", external: true })).toEqual({ provider: "OpenAI", purpose: "scan-rewrite-v1", external: true }));
