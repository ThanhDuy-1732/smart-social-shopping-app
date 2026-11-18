# Quyết định triển khai

Các quyết định và giới hạn được ghi trong quá trình thực hiện. Phạm vi nghiệm thu là local; không phải chấp thuận mở bán.

Ruling: Fresh directory had no Git repository or existing code; initialized codex/phase-implementation in place — no existing checkout needs protection — costs no branch isolation from future concurrent writers.

Ruling: Execute inline in phases: phase 1 tasks 1–3, phase 2 tasks 4–5, phase 3 tasks 6–9, phase 4 tasks 10–13, phase 5 tasks 14–16 — respects requested phased delivery without dropping any scope — integration remains pending until all phases pass.

Ruling: Docker daemon unavailable; use installed PostgreSQL with a task-owned Unix socket and private data directory for local tests — avoids system service changes — native PostgreSQL prerequisite documented alongside Compose alternative.

Task 1: Ruling: system initdb fails loading ICU; downloaded standalone PostgreSQL binary into ignored .local rather than changing global Homebrew — real DB integration tests now run — reproducibility requires Docker or working native binaries.

Task 1: Ruling: provider evidence recorded but AI selection deferred to task 13 evaluation and payment commercial compatibility unverified — no credentials or contracts supplied — tasks 7/13 cannot be marked production-ready without external validation.

Task 2: Ruling: generated auth schema is 001_auth.sql and app access schema 002_access.sql, not one hand-written 001_identity.sql — pinned library owns its auth tables — subsequent business migrations are numbered from 003.

Task 2: Ruling: provide local-only private mail files until external email credentials exist; production refuses local transport — supports real verification/reset locally without external messages — external email delivery is unverified.

Task 3: Ruling: protect MFA enrollment by revoking all prior sessions in the library user-update hook — upstream rotates only the enrollment session — real two-session RED→GREEN test added and passed.

Task 3: Ruling: shop application rejection permits owner resubmission while resetting review; approved bank information cannot self-edit — avoids unreviewed payout-account changes — operator workflow needed for approved-account changes.

Task 4: Ruling: new/edited products enter pending and moderators explicitly publish — provides actual pre-sale moderation — seller edits temporarily remove products from discovery until review.

Task 4: Ruling: use PostgreSQL full-text search with normalized Vietnamese tokens, no separate search service — matches local scope and avoids provider dependency — advanced typo tolerance and semantic retrieval remain an AI-phase evaluation.

Task 5: Ruling: user explicitly requested local without provider accounts; implement actual local image processing with sharp and MP4 transcoding with installed FFmpeg, rather than fake a cloud callback — no external provider can be tested yet — local filesystem media upload is disabled in production and must be replaced before public launch.

Task 5: Ruling: browser E2E port 3100 was occupied by another project's server; moved only this project's E2E to 14387 — respect unrelated processes — fixed port must remain available during tests.

Task 6: Ruling: reserve stock for 15 minutes, snapshot confirmed quote and policy, then expire via worker — provides bounded local checkout without inventing payment success — hold duration can be adjusted before launch.

Task 6: Ruling: policy reads inside checkout reuse its transaction connection — independent read exhausted the pool under load — saturated-pool RED→GREEN regression test added.

Task 6: Ruling: local shipping matches normalized province/city names or an explicit nationwide rate; no external address service — user has no providers — official address validation remains a production integration decision.

Task 7: Ruling: provider is deliberately unconfigured at user request; public start/webhook routes fail closed, while verified-event business processing is tested via internal fixtures — prevents simulated money being presented as real — live signature verification, provider reconciliation and sandbox tests remain blocked until provider selection/credentials.

Task 7: Ruling: one payment intent per checkout, reused for retries by the future adapter — prevents two independent charges from changing fulfillment state — provider integration must support stable merchant references or revise this with explicit duplicate-charge accounting.

Task 8: Ruling: private orders return NOT_FOUND to unrelated actors rather than revealing existence with FORBIDDEN — protects order enumeration — tests adjusted to this privacy contract.

Task 8: Ruling: approvals create pending refunds only; no provider result means no refunded status — respects local-only execution — external refund submission and sandbox confirmation remain pending.

Task 8: Ruling: block refund approval/confirmation for reserved or already paid-out orders until payout/source is resolved — prevents double spending without a configured recovery mechanism — exceptional refunds after payout require an explicit funding workflow before production.

Task 9: Ruling: recognize fees on remaining item value after refunds, excluding shipping; round half up to VND — makes ledger and payout deterministic — this calculation must be published with merchant terms before live trading.

Task 9: Ruling: payout eligibility waits until both return window and settlement hold have elapsed, and excludes open/pending-refund cases — prevents paying disputed money — policy changes affect only new order snapshots.

Task 9: Ruling: use per-shop financial advisory locks across returns and settlement; return deadlines use database clock, not app clock — prevents clock drift and concurrent payout/refund inconsistencies — RED→GREEN clock-drift test added.

Task 9: Ruling: ledger insertion has unique event keys, payload hashes and deferred balance checks; the application offers no edit/delete journal API — append-only application history — production DB grants/retention controls remain a deployment task.

Task 10: Ruling: public posts publish immediately with report/moderation controls; product sales still require explicit moderation — keeps social sharing usable — moderation staffing and posting quotas must be calibrated before launch.

Task 10: Ruling: use microsecond UTC timestamp plus ID cursors; unblocking does not restore follow relationships — stable paging and explicit user choice — regression tests cover equal timestamps and block behavior.

Task 10: Ruling: shared form submission now preserves input after server validation errors — native automatic reset erased typed data — browser RED→GREEN test confirms shop form retains values and completes successfully after correction.

Task 11: Ruling: suspension hides public posts/comments and pauses approved shops; re-enabling an account does not automatically resume selling — explicit shop restoration preserves its prior approval state — operators must review before reopening a suspended shop.

Task 11: Ruling: platform admins may approve the platform shop they operate, with MFA/permission/audit checks — a self-review prohibition would block the requested single-operator platform store — ordinary shop owners still cannot approve without admin permission; positive/negative tests cover both.

Task 12: Ruling: SSE emits generic revisions and revalidates the session and membership each tick; client also polls — no message content in event payloads — scale and mobile hardware remain launch checks.

Task 12: Ruling: local transactional mail uses a durable outbox and stable delivery key; external Resend retry is bounded by its idempotency retention, stale attempts need review — no credentials supplied — real delivery remains unverified. Auth verification mail remains synchronous to return delivery failures immediately.

Task 12: Ruling: moderators may inspect only explicitly reported chat messages and attached evidence, never general conversation history — privacy boundary retained — reports do not expose surrounding context automatically.

Task 13: Ruling: no AI account or local model is available and user explicitly chose local execution; provide clearly labelled deterministic keyword discovery, not fabricated AI output — provider adapter, semantic benchmark, token costs and sandbox evaluation remain pending until actual provider selection — no private chat or provider credentials are accessed.

Task 13: Ruling: budget is a per-item ceiling, explicitly stated in UI; unknown travel details produce a follow-up question — avoids claiming a total itinerary budget or universal shopping necessities — whole-list optimization awaits real AI evaluation.

Task 13: Ruling: no vector database added; current local retrieval rechecks visible catalog/posts and excludes out-of-stock items — avoids extra infrastructure before measurement — semantic relevance remains unverified. Anonymous local queries are bounded; edge/IP abuse controls must be configured with production ingress rather than trusting arbitrary forwarded headers.

Task 14: Ruling: cache only offline page and app icons; never cache HTML/API/media or replay mutations — online-first private data — offline application shows a safe reconnect page, not saved transactions.

Task 14: Ruling: private layouts hide before history restoration, revalidate identity on focus/visibility/pageshow, and invalidate on cross-tab auth changes — real browser account-switch/back/offline checks passed — preserving drafts on harmless focus is covered by RED→GREEN regression.

Task 14: Ruling: Web Push requires optional VAPID keys/contact; no automatic permission prompt, no live subscription delivery test without credentials/device permission — session-linked subscriptions cascade on logout and payloads contain no private content — physical Android/iOS install, permission-granted/denied delivery and update timing remain explicit hardware/integration checks.

Task 15: Ruling: period GMV uses paid time; cash/refunds/payouts/fees use ledger event time; shop payable is cumulative through range end — avoids mixing sales, fees and liabilities — reports label these bases explicitly.

Task 15: Ruling: measure authenticated daily distinct content views/searches and actual local discovery requests, without retaining raw search text — bounded, privacy-aware metrics — anonymous/off-platform traffic and real AI cost remain unmeasured.

Task 15: Ruling: source is last server-verified linked post/discovery within seven days, snapshotted per shop order; hidden posts lose attribution before checkout — meaningful local attribution without causal claims — a multi-item shop order can contain items outside the source, UI documents linkage rule.

Task 16: Ruling: installed pg_dump 16 cannot dump server 18; built official PostgreSQL 18 client in ignored .local, with only task-owned binary linking changes — native backup and isolated restore now pass — other machines need matching client tools, documented.

Task 16: Ruling: live payment/AI/media/email/push, physical hardware, hosted CI, target load and production restore cannot be truthfully certified without providers/infrastructure/owner targets — finish all local work and record launch blockers — no production readiness claim, deployment, money movement or external messages.

Task 16: Ruling: local dev uses 14388 and tests 14387 to avoid unrelated apps on default ports — no external process stopped — URL/config examples updated consistently.

Task 16: Ruling: emergency environment switches pause new checkout/payout while preserving cancellation and processing existing obligations — reversible operational controls — operator must restart processes after environment changes.

Task 16: Ruling: final discovery check found a sold-out low-price variant could defeat item budget; filter actual in-stock variants and recompute displayed price — RED→GREEN regression passed — still revalidated again at cart/checkout.

Task 16: Ruling: audit --omit=dev still reports 5 high because Better Auth exposes Vitest as optional peer; latest picomatch remains 4.0.7 — no forced major downgrade or false clean-audit claim — deployment packaging and compatible patched tooling remain launch checks.

Final integration: Ruling: keep the local codex branch; no base branch or remote existed, and user authorized local implementation only — no merge/push/deploy decision needed — branch remains available for review.

Final: Ruling: declined live provider behavior/hardware, deployment/hosted CI/capacity, and independent dependency replacement remain the explicitly documented launch checklist — no supplied accounts/targets or compatible patch — no production readiness claim.

Final: Ruling: originalStock records the seller editor baseline; untouched stock is preserved from the locked DB row, explicit stale stock changes are rejected — prevents metadata saves reviving sold stock — seller must reload after a concurrent inventory change.

Final: Ruling: mandatory cancellation refunds cannot be rejected; paid unshipped cancellation restores only its shop order units once; failed payment releases holds atomically with checkout expiration — preserves money obligations and stock — late-paid reconciliation remains enabled and tested against another buyer reservation.

Final: Ruling: wrap signed-in public pages as well as private areas in identity checks; Admin restoration also compares the current permission fingerprint — closes cached private-selection and bank-detail exposure after account/role changes — guest public access remains available after revalidation.

Final: Ruling: reported-message text disclosures are audited in the same transaction before returning previews; numeric cursor ordering and historical maturity selection are explicit — no silent evidence reads or skipped chat pages — longer-history and cutoff regressions pass.

Final: Ruling: local scope gaps were completed: approved-shop name search, validated category attribute and in-stock filters, delivery estimates/related posts, shop return replies and defined cohort cancellation/refund rates — satisfy the approved experience — refund/cancellation rates are current-state cohort metrics, not money-flow percentages.
