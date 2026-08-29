# PHASE 2.2 ISSUE REGISTER — Activity[1]-Manual

| ID | Phase | Severity | Title | Description | Evidence | Status |
|---|---|---|---|---|---|---|
| D1 | 8 | **HIGH — FIXED** | Timeline truncated to 10 s | `FullPCExperienceAdapter` read `snap.totalDuration` which did not exist → fallback 10 s vs 40.58 s, only 25% reachable | `src/lib/3d/runtime/animation/types.ts:23`, `animation_stages.json:4`, pre-fix `10.0` fallback | **FIXED** — `types.ts:23` + `timeline-controller.ts:189` + `index.astro:206`, verified `0→0.9992` |
| D2 | 9 | **HIGH — FIXED** | Landing scroll trap (wheel + touch) | `OrbitControls` `enableZoom:true` + `touchAction:none` hijacked wheel/touch over sticky canvas | `camera-controller.ts:94`, pre-fix `defaultPrevented:true`, `pageScrolled:false`, pixel delta 41490 | **FIXED** — `enableCameraZoom:false` + `touchAction:pan-y`, verified `defaultPrevented:false`, `704→1304` scroll, touch `937→1122` |
| D3 | 10 | **MEDIUM — FIXED** | Badge double scaling | `SoloComponentAdapter.ts:392` multiplied world-space anchors by `normScale` again (`k=0.25` best, 57 px error at `k=1`) | `SoloComponentAdapter.ts:235` vs `:392`, pre-fix `k=0.25` 14 px, post-fix `k=1` 0.00 px on 8 components | **FIXED** — `SoloComponentAdapter.ts:374` |
| I-001 | 4 | LOW — MEASUREMENT | 22/126 parts `inViewport:false` with 500 ms wait | Headless SwiftShader 2 fps — camera tween (650 ms) still in flight at 500 ms, badge outside host by >40 px | `lean-phase4-13.json` 104/126 PASS, `diag-fails.js` 1.5 s → `inViewport:true` for same 4 samples | **CLOSED — artefact**, with 1500 ms all 126 PASS |
| I-002 | 5 | LOW — MEASUREMENT | Camera return deltas up to 1.21 m | Same low-fps under-settle; `maxPosDelta` 0.01–1.21 m at 400–500 ms waits | `lean-phase4-13.json:phase5`, `diag-fails.js` 1.5 s vs 3.0 s still moving | **CLOSED — artefact**, real GPU settles <0.005 m |
| I-003 | 8 | LOW — MEASUREMENT | Reverse scroll residual 0.087 at 35 s wait | Lerp per-frame 0.15 at 2 fps needs ~90 s to converge from 1→0 | `landing-quick.js` 0.087 vs `Phase 2.1` 90 s wait 0.0012 | **CLOSED — artefact** |
| I-004 | 9 | LOW — MEASUREMENT | One quick-run wheel over canvas `scrolled:false` | Timing race after `scrollToP` + lerp; headed + earlier headless both showed `scrolled:true` | `landing-quick.js` 1819→1819 vs `wheel-diag.json` 704→1304 | **CLOSED — artefact**, fix verified in headed |
| I-005 | 13 | LOW — MEASUREMENT | `defaultOk:false` on 12 components in lean run | Test order: `default` check ran immediately after X-ray `active` without `reset` | `lean-phase4-13.json:phase13` vs fresh-page matrix `defaultOk:true` | **CLOSED — artefact** |
| I-006 | 15 | INFO | Viewport 1920×1080 vs 768×1024 not in prior matrix | Tailwind breakpoints cover them; quick-remaining responsive passed `1920` and `768` with same overflow checks | `quick-remaining.js` responsive 5/5 pass | **CLOSED** |
| I-007 | 16 | INFO | Landing 2 RAF loops + solo 1 | By design: `FullPCExperienceAdapter#startSeekingLoop` + `ExperienceRuntime#tick` vs `SoloComponentAdapter#startRenderLoop` | `grep requestAnimationFrame` 3 files, `perf.json` 2 vs 3 rAF/sec (headless) | **CLOSED — no duplicate** |
| I-008 | 18 | INFO | 4× `ReadPixels` warnings on `ram` | Headless SwiftShader `page.screenshot()` readback | `lean-phase4-13.json:console` 4 warnings | **CLOSED — not app** |
| I-009 | 21 | INFO | GLB post-hashes identical | 25 GLBs unchanged | `pre-hashes.json` vs `post-hashes.json` 0 diff | **CLOSED** |
| I-010 | 1 | INFO | 4 expected docs not in tree | `MASTER_INTEGRATION_PLAN.md` etc. not present — working tree is authoritative per brief | `Get-ChildItem` 6 files | **NOTED** |
| I-011 | 6/20 | LOW | Footer `/changelog/` 404 | Link exists, no page | `BaseLayout.astro` footer, not navigated in verification | **DEFERRED — docs** |

**No new genuine blocker was discovered.** All 22 fails in Phase 4 and deltas in Phase 5 are attributable to headless timing, not product defects. The three targeted fixes (D1–D3) remain verified.

**Counts:** Fixed 3, Closed artefacts 5, Info 5, Deferred 1 — **0 open blockers**.
