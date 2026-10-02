# Opportunity Links — M6b Design

## Purpose and two lanes

M6b helps a signed-in job seeker keep track of external job pages they found independently. It does not search for jobs, determine suitability, or verify that a vacancy exists.

### Lane A — private opportunity tracker

An authenticated owner can save one HTTPS link and attach it to one of their own saved target jobs. The private record contains:

- the target job reference;
- user-provided HTTPS URL;
- optional company name (up to 120 characters);
- optional private note (up to 1,000 characters);
- private process state: `saved`, `preparing`, `applied`, `closed`, or `dismissed`;
- created and updated dates.

“Saved” means the owner stored a reference to a page they found. It does **not** mean EXE checked the page, verified the vacancy, confirmed the role is open, or concluded that it matches the owner’s CV. Opening the action takes the user to an external website.

The UI states: “This link was saved by you.” “EXE does not check whether the vacancy is still open.” “Opening the link takes you to an external website.” “A saved link is not a confirmed job match.”

### Lane B — future team-curated sources

M6b provides only a typed, empty catalog contract for sources a team may curate in the future. A curated source is a team-reviewed directory or career source—not an individual listing and not a recommendation for a particular user. Its eventual record requires a title, URL, source type, role-family/audience tag, country/location scope, checked date, active state, source note, and approval state.

The catalog is deliberately empty in this prototype. No real source, listing, implied endorsement, freshness promise, completeness claim, or user-match claim is displayed before CP2 research and documented team curation.

## Privacy and security boundary

Opportunity records are private by default and owner-scoped with database RLS. They are not available to other authenticated users, anonymous visitors, M6a reviewer links, saved-work list data, or any public page. A link can reference only the same owner’s target job; deleting that target job cascades to its private opportunity records.

Only user-entered metadata and the URL are stored. The application does not fetch, open server-side, scrape, crawl, preview, download, parse, resolve redirects for, or call APIs for the supplied URL. Client links use `target="_blank"` with `rel="noopener noreferrer"` and clearly disclose the external navigation.

Server validation requires an absolute HTTPS URL, blocks embedded credentials, rejects malformed/overlong values, and bounds all optional text/status fields. Browser validation improves usability but is not relied upon for security.

## Deliberately excluded

M6b excludes job-board APIs, web scraping, crawling, automated ingestion, account automation, external URL fetching, page previews, vacancy verification, match scoring, recommendations, alerts, applications/submission automation, payments, employer/recruiter access, public profiles, and public listing catalogs.

## Remaining limits

An owner is responsible for deciding whether to visit an external page and for keeping their own status current. External websites have their own terms, privacy practices, availability, and security. Curated sources, target segment, pricing, competitor claims, and any relevance positioning remain dependent on CP2 research and explicit team approval.
