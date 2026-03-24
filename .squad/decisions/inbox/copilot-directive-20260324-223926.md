### 2026-03-24T22:39:26Z: User directive
**By:** Juanma (via Copilot)
**What:** After a spec's implementation is complete, Squad learnings and memories must be synced BACK into the spec artifacts (not squad → tasks, but squad-knowledge → spec enrichment). This is the reverse direction of `squask sync`. It should happen after a "nap" (cooldown period) from the Squad, not immediately after execution. The bridge must control this step so it's reproducible.
**Why:** User request — closes the knowledge flywheel. Specs should get smarter after each implementation cycle. Currently `squask sync` only goes forward (spec → squad context). The reverse path (squad learnings → spec) doesn't exist yet.
