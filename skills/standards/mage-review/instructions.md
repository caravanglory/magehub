# Magento 2 Code Review Workflow

Run this review before every merge. The goal is not to find every possible issue — it is to find the issues that tests and static analysis miss, and to produce actionable fixes, not just observations.

## When to Use

- Before merging any feature branch
- After a significant rebase or conflict resolution
- When a PR touches security-sensitive areas (auth, input handling, payment, checkout)
- When a PR modifies framework-level code (di.xml, events.xml, db_schema.xml)

## Review Methodology

### Fix-First

Every finding must include a concrete fix. Do not write "this is slow" — write "replace collection load with SearchCriteria pagination at Model/Repository.php:45". The author should be able to apply your suggestion without additional research.

### Confidence Scoring

Rate every finding 1-10:

| Score | Meaning                                                       | Action                          |
| ----- | ------------------------------------------------------------- | ------------------------------- |
| 9-10  | Verified by reading specific code. Concrete bug demonstrated. | Show normally                   |
| 7-8   | High-confidence pattern match. Very likely correct.           | Show normally                   |
| 5-6   | Moderate. Possible false positive.                            | Show with caveat: "verify this" |
| 3-4   | Low confidence. Suspicious but may be fine.                   | Appendix only                   |
| 1-2   | Speculation.                                                  | Suppress unless P0 severity     |

Format: `[SEVERITY] (confidence: N/10) file:line — description`

Example: `[CRITICAL] (confidence: 9/10) Controller/Admin/Export.php:22 — missing _isAllowed() enables unauthorized data export`

### Specificity Standard

Name the exact file, function, and line. Show the exact command to run, not "you should test this" but `vendor/bin/phpcs --standard=Magento2 app/code/Vendor/Module`. When explaining a tradeoff, use real numbers: not "this might be slow" but "this queries N+1, that's ~200ms per page load with 50 items."

### Verify or Flag

Before producing the final review output:

- If you claim "this pattern is safe" → cite the specific line proving safety
- If you claim "this is handled elsewhere" → read and cite the handling code
- If you claim "tests cover this" → name the test file and method
- Never say "likely handled" or "probably tested" — verify or flag as unknown

### Adversarial Mindset

Think like an attacker and a chaos engineer. Look for:

- Edge cases that bypass validation
- Race conditions in status transitions
- Resource leaks in loops or batch operations
- Silent data corruption (wrong results without errors)
- Error handling that swallows exceptions
- Trust boundary violations (guest → admin, frontend → backend)

### Scope Drift Detection

Before reviewing code quality, check: did they build what was requested — nothing more, nothing less?

1. Read the PR description, commit messages, and any TODOS.md or plan documents
2. Identify the stated intent
3. Compare files changed against the intent
4. Flag scope creep (unrelated changes) and missing requirements (planned work not delivered)

This is informational — it does not block the review, but it must be reported.

### Learnings — Compounding Intelligence

The review gets smarter over time by recording reusable patterns. Every session should retrieve prior learnings at the start and log new ones at the end.

#### Storage

```
~/.magehub/learnings/{project-slug}.jsonl
```

Project slug is derived from the git remote URL or directory name: `owner-repo` format.

#### Record Format (JSONL)

```json
{
  "timestamp": "2026-04-22T10:30:00Z",
  "type": "pattern",
  "key": "missing-acl-admin-controller",
  "insight": "Every admin controller extending Action\\Adminhtml\\Action must override _isAllowed(). Magento does not enforce this at the framework level.",
  "confidence": 9,
  "source": "observed",
  "files": ["Controller/Admin/Export.php"],
  "branch": "feature/export"
}
```

**Types:** `pattern` (reusable approach), `pitfall` (what NOT to do), `preference` (user stated), `architecture` (structural decision), `operational` (project-specific quirk)

**Sources:** `observed` (you found it in code), `user-stated` (author told you), `cross-model` (multiple reviewers agree)

**Confidence:** 1-10. Observed and verified = 8-9. Inference you're unsure about = 4-5. User preference = 10.

#### Retrieval (before review)

Before starting the review, search for relevant prior learnings:

```bash
# Ensure directory exists
mkdir -p ~/.magehub/learnings

# Derive project slug
SLUG=$(basename "$(git rev-parse --show-toplevel)" | tr -cd 'a-zA-Z0-9._-')
LEARN_FILE="$HOME/.magehub/learnings/${SLUG}.jsonl"

# If file exists, show recent learnings
if [ -f "$LEARN_FILE" ]; then
  echo "--- PRIOR LEARNINGS ---"
  tail -20 "$LEARN_FILE"
  echo "--- END LEARNINGS ---"
fi
```

If learnings are found, incorporate them into the review:

- When a finding matches a past learning, display: `**Prior learning applied: [key] (confidence N/10)**`
- Adjust confidence upward for known patterns
- Skip explaining patterns the learning already documents

#### Logging (after review)

After the review completes, reflect on the session:

- Did you discover a non-obvious pattern or pitfall?
- Did you encounter a project-specific quirk (build order, env vars, timing)?
- Did a finding you reported with low confidence turn out to be a real issue?

If yes, log it:

```bash
SLUG=$(basename "$(git rev-parse --show-toplevel)" | tr -cd 'a-zA-Z0-9._-')
LEARN_FILE="$HOME/.magehub/learnings/${SLUG}.jsonl"
mkdir -p ~/.magehub/learnings

echo '{"timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","type":"pitfall","key":"collection-load-without-pagination","insight":"getCollection()->load() in admin grids or API endpoints without setPageSize() causes OOM on large catalogs. Always use SearchCriteria with pagination.","confidence":9,"source":"observed","files":["Model/Grid/DataProvider.php"],"branch":"'$(git branch --show-current)'"}' >> "$LEARN_FILE"
```

**Only log genuine discoveries.** A good test: would knowing this save 5+ minutes in a future session? If yes, log it. Do not log obvious things, transient errors, or one-off issues.

#### Cross-Project Learnings (optional)

By default, learnings are scoped to the project. To share patterns across all projects on this machine:

```bash
# Enable cross-project learnings
mkdir -p ~/.magehub
echo '{"cross_project":true}' > ~/.magehub/config.json
```

When enabled, retrieve learnings from all `.jsonl` files in `~/.magehub/learnings/`:

```bash
for f in ~/.magehub/learnings/*.jsonl; do
  [ -f "$f" ] || continue
  grep -i "cache\|acl\|injection" "$f" 2>/dev/null
done
```

## Step-by-Step Review

### Step 0: Detect platform and base branch

First, detect the git hosting platform from the remote URL:

```bash
git remote get-url origin 2>/dev/null
```

- If the URL contains "github.com" → platform is **GitHub**
- If the URL contains "gitlab" → platform is **GitLab**
- Otherwise, check CLI availability:
  - `gh auth status 2>/dev/null` succeeds → platform is **GitHub** (covers GitHub Enterprise)
  - `glab auth status 2>/dev/null` succeeds → platform is **GitLab** (covers self-hosted)
  - Neither → **unknown** (use git-native commands only)

Determine which branch this PR/MR targets, or the repo's default branch if no PR/MR exists. Use the result as "the base branch" in all subsequent steps.

**If GitHub:**

1. `gh pr view --json baseRefName -q .baseRefName` — if succeeds, use it
2. `gh repo view --json defaultBranchRef -q .defaultBranchRef.name` — if succeeds, use it

**If GitLab:**

1. `glab mr view -F json 2>/dev/null` and extract the `target_branch` field — if succeeds, use it
2. `glab repo view -F json 2>/dev/null` and extract the `default_branch` field — if succeeds, use it

**Git-native fallback (if unknown platform, or CLI commands fail):**

1. `git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||'`
2. If that fails: `git rev-parse --verify origin/main 2>/dev/null` → use `main`
3. If that fails: `git rev-parse --verify origin/master 2>/dev/null` → use `master`

If all fail, fall back to `main`.

**If platform is `unknown` AND the user has not specified a base branch:**

The git-native fallback assumes the default branch (`main` or `master`), but this is often wrong for feature-branch workflows (e.g., a task branch based on `big-feature`, which is based on `master`).

Use AskUserQuestion:

> Could not detect the target branch automatically. Your platform is not GitHub or GitLab, or no PR/MR exists yet.
>
> What branch should I compare against?

Options:

- A) `main` (or `master`) — the repository default branch
- B) Another branch — please specify
- C) The parent feature branch of the current branch

If B or C: use the branch name the user provides as `<base_branch>`.

If the user does not respond or cancels: fall back to `main` and proceed, but add a note to the review output: "Base branch assumed to be `main` — verify this is correct."

Print the detected (or user-confirmed) base branch name. In every subsequent `git diff`, `git log`, `git fetch`, `git merge`, and PR/MR creation command, **substitute the detected branch name** wherever the instructions say `<base_branch>`.

**If on the base branch:** Output "Nothing to review — you're on the base branch." and stop.

---

### Step 1: Retrieve prior learnings

Before reading the diff, load relevant learnings from past reviews on this project:

```bash
SLUG=$(basename "$(git rev-parse --show-toplevel)" | tr -cd 'a-zA-Z0-9._-')
LEARN_FILE="$HOME/.magehub/learnings/${SLUG}.jsonl"

if [ -f "$LEARN_FILE" ]; then
  echo "--- PRIOR LEARNINGS ---"
  tail -20 "$LEARN_FILE"
  echo "--- END LEARNINGS ---"
fi
```

If learnings are shown:

- Read them for context on known patterns and pitfalls
- Apply them during the review (adjust confidence, skip redundant explanations)
- When a finding matches a prior learning, display: `**Prior learning applied: [key] (confidence N/10, from [date])**`

If no learnings exist, proceed normally.

### Step 2: Get the diff

Fetch and check whether the current branch is behind `<base_branch>`:

```bash
git fetch origin <base_branch> --quiet

# How many commits is the current branch behind base?
BEHIND=$(git rev-list --count HEAD..origin/<base_branch> 2>/dev/null || echo 0)
```

**If `BEHIND` is 0** (current branch is up-to-date with base):

```bash
git diff origin/<base_branch> --stat
git diff origin/<base_branch>
```

**If `BEHIND` > 0** (current branch is behind base):

The current branch is missing commits from `<base_branch>`. Diffing directly against `origin/<base_branch>` would include those upstream changes — reviewing them is wasted effort and produces false positives.

Instead, create a temporary merge branch so the diff only contains the branch's own changes:

```bash
# Create temp branch from current HEAD
REVIEW_TEMP="review-temp-$(date +%s)"
git branch "$REVIEW_TEMP"

# Merge base into temp branch (prefer merge so we keep both histories)
git checkout "$REVIEW_TEMP"
git merge origin/<base_branch> --no-edit

# If conflicts occur, abort and fall back to direct diff
if [ $? -ne 0 ]; then
  git merge --abort
  git checkout -
  git branch -D "$REVIEW_TEMP"
  echo "WARNING: Merge conflict with <base_branch>. Falling back to direct diff (may include upstream changes)."
  git diff origin/<base_branch> --stat
  git diff origin/<base_branch>
  DIFF_REF="origin/<base_branch>"
else
  # Diff the merged temp branch against base — this shows ONLY branch-specific changes
  git diff origin/<base_branch> --stat
  git diff origin/<base_branch>
  DIFF_REF="origin/<base_branch>"

  # Return to the original branch
  git checkout -
  # Clean up temp branch
  git branch -D "$REVIEW_TEMP"
fi
```

If on the base branch or no diff exists, stop: "Nothing to review."

**Why this matters:** Without the merge step, a branch 50 commits behind `main` would produce a diff that includes all 50 upstream changes — most of which were already reviewed when they landed on `main`. The temporary merge isolates the branch's unique contribution.

### Step 3: Scope check (informational)

Read PR description and commit messages. Compare against files changed. Output:

```
Scope Check: [CLEAN / DRIFT DETECTED]
Intent: <1-line summary of what was requested>
Delivered: <1-line summary of what the diff actually does>
[If drift: list each out-of-scope change]
```

### Step 4: Critical pass

Apply the following categories against the diff. These are the issues that can cause production incidents, security breaches, or data loss.

#### 4.1 SQL & Data Safety

Check every location where SQL is built or executed:

- String interpolation in where clauses, order by, or limit expressions
- User input passed directly to addFieldToFilter without type validation
- Raw SQL in resource models or setup scripts without parameter binding
- DELETE or UPDATE without WHERE conditions
- Schema changes that drop columns with existing data

**Fix pattern:** Use `addFieldToFilter($field, ['eq' => $value])`. For complex queries, use the connection's `select()` with bound parameters. Never concatenate user input into SQL.

#### 4.2 Race Conditions & Concurrency

Check state transitions and shared resource access:

- Plugin that modifies an entity after save without checking if another process changed it
- Status transitions (pending → processing → complete) without optimistic locking
- Inventory decrement without row-level locking
- File writes that overwrite without checking if another process modified the file

**Fix pattern:** Use `FOR UPDATE` in repository load methods. Add `version` or `updated_at` checks before saves. Use Magento's message queue for operations that must be serialized.

#### 4.3 LLM Output Trust Boundary (if applicable)

If the code integrates with LLM APIs or processes AI-generated content:

- LLM output written to database without validation or sanitization
- AI-generated SQL or code executed without review
- User prompts passed to LLM without input length limits or injection guards

**Fix pattern:** Validate all LLM output against a schema before persistence. Treat LLM output as untrusted user input. Set strict token and timeout limits.

#### 4.4 Shell Injection

Check all `exec()`, `shell_exec()`, `system()`, and backtick usage:

- User input in shell command strings
- File paths passed to shell commands without basename/realpath validation
- Environment variables read and passed to shell without sanitization

**Fix pattern:** Use `escapeshellarg()` and `escapeshellcmd()`. Better: replace shell calls with PHP-native equivalents (Symfony Process, ZipArchive, GD/Imagick).

#### 4.5 Enum & Value Completeness

When the diff introduces a new enum value, status, or type constant:

- Grep for all files referencing sibling values of the same enum
- Check switches, if-else chains, validation rules, and UI mappings
- Verify the new value has a human-readable label in i18n files
- Check database default values and constraints

**This category requires reading code outside the diff.** Within-diff review is insufficient.

#### 4.6 Input Validation & XSS

Check all entry points (controllers, API endpoints, GraphQL resolvers):

- Request parameters used without validation or type casting
- User input rendered in HTML without escaping
- File uploads without type, size, or path validation
- Array inputs not validated for expected shape

**Fix pattern:** Use Magento's `InputValidation` utility or custom validators. Escape all output with `$escaper->escapeHtml()`, `escapeHtmlAttr()`, or `escapeJs()`. For file uploads, whitelist extensions and validate MIME type.

#### 4.7 Authorization & ACL

Check every admin-facing entry point:

- Controller extends `Action\Adminhtml\Action` but does not override `_isAllowed()`
- API endpoint in `webapi.xml` without `aclResource` attribute
- GraphQL resolver performs admin-only operations without ACL check
- Frontend controller exposes admin data without store-scoping

**Fix pattern:** Implement `_isAllowed()` in every admin controller. Add `<resource ref="Vendor_Module::action"/>` to webapi.xml routes. Use `$this->_authorization->isAllowed()` in resolvers and services.

### Step 5: Informational pass

Apply these categories. Findings here do not block shipping but should be addressed in follow-up.

#### 5.1 DI & Architecture

- Concrete class injection instead of interface
- ObjectManager usage in business logic
- Empty subclass when virtual type would suffice
- Global preference when area-specific would work
- Constructor with 10+ parameters (consider factory or builder)

#### 5.2 Plugin Safety

- Plugin modifies the return value of a method whose contract specifies void
- Around plugin does not return `$proceed()` result
- Plugin on a method that is already heavily pluginized (check with grep)
- Before plugin throws exception without proper type (should be LocalizedException)

#### 5.3 Observer Usage

- Observer on generic events (`controller_action_predispatch`) doing heavy work
- Observer modifies shared state without transaction safety
- Observer fires additional events that could loop
- No corresponding `events.xml` entry for the observer class

#### 5.4 Caching

- Cacheable block missing `IdentityInterface`
- Hardcoded cache keys without store/context differentiation
- Full cache type flush instead of tag-based invalidation
- Cache save without documented invalidation strategy
- Personalized data in FPC-cached blocks

#### 5.5 Database & Schema

- `db_schema.xml` column added without default value (breaks existing rows)
- Index missing on foreign key column
- Nullable foreign key without business justification
- Setup script not idempotent (fails if run twice)
- Direct table name strings instead of constants

#### 5.6 Collections & Performance

- `getCollection()->load()` without `setPageSize()` in API or grid context
- Collection loaded inside a loop (N+1)
- `addAttributeToSelect('*')` instead of specific fields
- No index on columns used in WHERE, ORDER BY, or JOIN
- EAV attribute loaded individually instead of preloaded with collection

#### 5.7 API & GraphQL

- Resolver bypasses repository and queries collection directly
- Web API returns internal objects instead of data interfaces
- GraphQL schema change breaks backward compatibility
- REST endpoint lacks pagination on list operations
- No rate limiting on public endpoints

#### 5.8 Frontend

- Inline JavaScript in PHTML templates
- Knockout component without proper observable disposal
- RequireJS dependency missing from `requirejs-config.js`
- CSS class names not following BEM or Magento conventions
- Hardcoded URLs instead of `$block->getUrl()`

#### 5.9 i18n

- User-facing string not wrapped in `__()`
- Translation key contains dynamic content (should be `__('Hello %1', $name)`)
- No translation file (`i18n/en_US.csv`) for new strings
- Hardcoded currency or date formats

#### 5.10 Testing

- Business logic without unit test coverage
- Database interaction without integration test
- API endpoint without functional test
- Test mocks the framework instead of the module's dependencies
- Test names do not describe the behavior being verified

#### 5.11 Documentation Staleness

- README describes a workflow that the diff changes
- CHANGELOG does not mention the changes
- `CLAUDE.md` or developer docs reference modified APIs
- Inline comments contradict the code

### Step 6: Cross-reference checklists

For each file type in the diff, apply the domain-specific checklist:

**PHP class files:** DI, security input validation, ACL, strict_types, service contracts
**XML config files (di.xml, events.xml, etc.):** Schema reference, area scoping, node naming conventions
**db_schema.xml / InstallSchema:** Index coverage, nullable rules, backward compatibility
**PHTML templates:** Escaping, i18n, no inline JS, URL generation
**JavaScript / Knockout:** Memory leaks, observable disposal, RequireJS deps
**webapi.xml / graphql schema:** ACL binding, backward compatibility, pagination
**system.xml / config.xml:** Backend validation, default values, scope visibility
**Upgrade scripts:** Idempotency, data migration safety, rollback capability

### Step 7: Output format

```
Pre-Landing Review: N issues (X critical, Y informational)
════════════════════════════════════════════════════════════

Scope Check: [CLEAN / DRIFT DETECTED]
Intent: <summary>
Delivered: <summary>

## Critical Findings
[SEVERITY] (confidence: N/10) file:line — description
  Fix: concrete fix

[SEVERITY] (confidence: N/10) file:line — description
  Fix: concrete fix

## Informational Findings
[SEVERITY] (confidence: N/10) file:line — description
  Fix: concrete fix
  [If confidence < 7: "Medium confidence — verify this is actually an issue"]

## Verification Claims
[For each "this is safe" claim in the review]
- Claim: <what you said is safe>
  Evidence: <file:line proving it>

## Action Items
- [ ] Fix critical finding #1
- [ ] Fix critical finding #2
- [ ] Address informational: <description>
- [ ] Run tests: <specific test command>
- [ ] Update docs: <which doc file>
```

### Step 8: Test command suggestions

For every fix suggested, tell the author how to verify it:

```bash
# PHPCS
vendor/bin/phpcs --standard=Magento2 app/code/Vendor/Module

# Unit tests
vendor/bin/phpunit app/code/Vendor/Module/Test/Unit

# Integration tests
vendor/bin/phpunit app/code/Vendor/Module/Test/Integration

# API functional tests
vendor/bin/phpunit dev/tests/api-functional/testsuite/Magento/WebApi

# Static analysis (if configured)
vendor/bin/phpstan analyse app/code/Vendor/Module
```

## Important Rules

- Read the FULL diff before commenting. Do not flag issues already addressed.
- Fix-first, not read-only. Suggest concrete fixes, not just problems.
- Be terse. One line problem, one line fix. No preamble.
- Only flag real problems. Skip anything that's fine.
- If uncertain about a security-sensitive change, flag it and recommend additional review by a security-focused teammate.
- Never commit, push, or create PRs as part of the review — the reviewer's job is to produce findings, not to merge.

### Step 9: Log learnings

After the review output is complete, reflect on the session:

1. Did any commands fail unexpectedly?
2. Did you take a wrong approach and have to backtrack?
3. Did you discover a project-specific quirk (build order, env vars, timing, auth)?
4. Did a finding you reported with low confidence turn out to be a real issue?
5. Did you find a non-obvious pattern that would help future reviews?

If yes to any, log an operational or pitfall learning:

```bash
SLUG=$(basename "$(git rev-parse --show-toplevel)" | tr -cd 'a-zA-Z0-9._-')
LEARN_FILE="$HOME/.magehub/learnings/${SLUG}.jsonl"
mkdir -p ~/.magehub/learnings

# Example: log a discovered pitfall
echo '{"timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","type":"pitfall","key":"missing-acl-in-export-controllers","insight":"Export controllers in this project consistently omit _isAllowed(). The pattern is: any admin controller with a download action needs explicit ACL. Check every new admin controller.","confidence":9,"source":"observed","files":["Controller/Admin/Export.php","Controller/Admin/Download.php"],"branch":"'$(git branch --show-current)'"}' >> "$LEARN_FILE"
```

**What to log:**

- `pattern` — reusable approach that worked well
- `pitfall` — what NOT to do, with evidence of where it happened
- `operational` — project-specific quirks (CLI flags, env vars, build order)
- `architecture` — structural decisions that affect review strategy

**What NOT to log:**

- Obvious things (e.g., "SQL injection is bad")
- One-off transient errors (network blips, rate limits)
- Things the user already knows

**Good test:** would knowing this save 5+ minutes in a future session? If yes, log it.

**Calibration event:** If you reported a finding with confidence < 7 and it turned out to be a real issue, that is a calibration event. Log it so future reviews catch the same pattern with higher confidence:

```bash
echo '{"timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","type":"pitfall","key":"under-confidence-nullable-foreign-key","insight":"Reported nullable foreign key at confidence 5/10 but it caused a production integrity issue. Always flag nullable FKs in db_schema.xml at confidence 8+ unless documented as intentional.","confidence":9,"source":"observed","files":["etc/db_schema.xml"],"branch":"'$(git branch --show-current)'"}' >> "$LEARN_FILE"
```

If the review exits early (no diff, base branch, etc.), skip this step.
