// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const { currentUser, browserClient, auth } = vi.hoisted(() => ({
  currentUser: vi.fn(),
  browserClient: vi.fn(),
  auth: { getUser: vi.fn(), onAuthStateChange: vi.fn() },
}));
vi.mock("@/lib/supabase/server", () => ({ getCurrentUser: currentUser }));
vi.mock("@/lib/supabase/client", () => ({ createSupabaseBrowserClient: browserClient }));
import Home from "./page";

beforeEach(() => {
  currentUser.mockResolvedValue(null);
  browserClient.mockReturnValue({ auth });
  auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
  auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
});
afterEach(() => { cleanup(); vi.resetAllMocks(); });

it.each([false, true])("preserves landing CTA destinations (signed in: %s)", async signedIn => {
  const user = signedIn ? { id: "fictional" } : null;
  currentUser.mockResolvedValue(user);
  auth.getUser.mockResolvedValue({ data: { user }, error: null });
  render(await Home());

  const header = within(screen.getByRole("navigation", { name: "Main navigation" }));
  await header.findByRole("link", { name: signedIn ? /Go to workspace/ : /Get started/ });
  const links = await screen.findAllByRole("link", { name: signedIn ? /Go to workspace/ : /Get started/ });
  expect(links).toHaveLength(3);
  for (const link of links) expect(link.getAttribute("href")).toBe(signedIn ? "/app" : "/sign-up");
  if (signedIn) expect(header.queryByRole("link", { name: "Sign in" })).toBeNull();
  else {
    expect((await header.findByRole("link", { name: /Get started/ })).getAttribute("href")).toBe("/sign-up");
    expect(header.getByRole("link", { name: /Sign in/ }).getAttribute("href")).toBe("/sign-in");
  }
});

it("shows only the concise landing copy, real anchors and visible fictional distinction", async () => {
  render(await Home());
  await screen.findByRole("link", { name: /Create account/ });
   expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Your experience.Your next CV.");
   expect(screen.getByText("One truthful experience profile → CV versions tailored to different jobs.")).toBeTruthy();
  expect(screen.getAllByRole("heading", { level: 2 }).map(h => h.textContent)).toEqual([
    "See the difference.", "Three simple steps", "FAQs", "Ready for your next application?",
  ]);
  expect(screen.getAllByRole("listitem").map(li => li.textContent)).toEqual([
    "01 — Add your experienceSign in, then paste a CV or describe work, study, projects or volunteering.",
    "02 — Add a target jobReuse your profile. Add a job description, or get a general wording review.",
    "03 — Review your CVAccept, edit or dismiss changes. Preview, export and save named versions.",
  ]);
  for (const [name, target] of [["How it works", "how-it-works"], ["FAQ", "faq"], ["See an example", "example"]]) {
    expect(screen.getByRole("link", { name }).getAttribute("href")).toBe(`#${target}`);
    expect(document.getElementById(target)).toBeTruthy();
  }
  const labels = screen.getAllByText("Fictional example · Not a live AI result");
  expect(labels).toHaveLength(2);
  for (const label of labels) expect(label.closest('[aria-hidden="true"], [hidden]')).toBeNull();
  expect(screen.getByRole("img", { name: /Paper CV for fictional sales assistant Jamie Reed/ })).toBeTruthy();
  expect(document.body.textContent).not.toMatch(/YOUR EXPERIENCE|OWN YOUR NEXT CHAPTER|Scan first|A little clarity|A clearer story|Clearer words|Your experience, your next step/);
});

it("links to one static product example with the exact fictional inputs and outcomes", async () => {
  render(await Home());
  await screen.findByRole("link", { name: /Create account/ });
  const example = screen.getByRole("region", { name: "See the difference." });
  expect(example.id).toBe("example");
  expect(document.querySelectorAll("#example")).toHaveLength(1);
  expect(example.getAttribute("aria-describedby")).toBe("example-caption");
  expect(within(example).getByText("Fictional example · Not a live AI result")).toBeTruthy();
  const scan = within(example).getByRole("article", { name: "Scan" });
  const rewrite = within(example).getByRole("article", { name: "Rewrite" });
  expect(Array.from(scan.querySelectorAll("dt, dd"), el => el.textContent)).toEqual([
    "CV excerpt", "Helped customers choose products.",
    "Target job", "Help customers select products and maintain stock records.",
    "Finding", "Customer support is shown. Stock-record experience is not shown in this excerpt.",
  ]);
  expect(Array.from(rewrite.querySelectorAll("dt, dd"), el => el.textContent)).toEqual([
    "Instruction", "Make this clearer without adding experience.",
    "Result", "Assisted customers with product selection.",
  ]);
  expect(example.querySelector("form, input, textarea, button, a")).toBeNull();
  expect(document.querySelectorAll("main > div > section")[0]).toBe(example);
  expect(example.nextElementSibling?.id).toBe("how-it-works");
});

it("keeps native, initially collapsed FAQs accurate for the authenticated product", async () => {
  render(await Home());
  await screen.findByRole("link", { name: /Create account/ });
  const details = Array.from(document.querySelectorAll("#faq details"));
  expect(details).toHaveLength(4);
  expect(details.map(el => [el.querySelector("summary")?.textContent, el.querySelector("p")?.textContent])).toEqual([
    ["What do I need?", "Sign in and paste an existing CV or describe your experience. A target job description is optional. Work, study, internships and volunteering are welcome across industries."],
    ["Does a missing skill mean I lack it?", "No. It means your CV does not clearly show evidence of it."],
    ["Can I edit and export my CV?", "Yes. Review each proposed change, copy the complete preview, download TXT and save named versions in your account."],
    ["Is this example AI?", "No. This is a static fictional example. Viewing this public page does not send CV content to AI or save a CV. AI review inside your workspace requires your explicit consent."],
  ]);
  for (const detail of details) expect(detail.hasAttribute("open")).toBe(false);
});
