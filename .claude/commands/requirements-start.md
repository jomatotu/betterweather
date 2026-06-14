# Requirements Gathering - Start

You are initiating a structured requirements gathering session. Follow this 5-phase process strictly.

## Setup

1. Extract a slug from the user's description (lowercase, hyphens, max 5 words)
2. Create folder: `requirements/YYYY-MM-DD-HHMM-{slug}/`
3. Create `requirements/.current-requirement` with the folder name
4. Create `requirements/index.md` if it doesn't exist
5. Create `00-initial-request.md` with the raw user description

## Phase 1: Codebase Analysis

Analyze the entire project:
- Architecture and tech stack
- Existing components and patterns
- File structure overview

Save findings to `03-context-findings.md` (preliminary).

## Phase 2: Discovery Questions (5 yes/no questions)

Write ALL 5 questions first to `01-discovery-questions.md` BEFORE asking any.

Questions should cover high-level concerns: scope, user impact, integration, data, security.

Rules:
- ✅ Yes/no format only
- ✅ Include smart default in brackets: [Default: Yes] or [Default: No]  
- ✅ One question at a time
- ❌ No open-ended questions
- ❌ No implementation talk
- ❌ User can answer "idk" to accept the default

Ask questions one by one. Record all answers in `02-discovery-answers.md`.

## Phase 3: Autonomous Context Research

After all 5 discovery questions are answered:
- Search relevant files using grep/glob
- Analyze similar existing features
- Document technical constraints, integration points, affected files

Update `03-context-findings.md` with detailed findings.

## Phase 4: Expert/Detail Questions (5 yes/no questions)

Write ALL 5 questions first to `04-detail-questions.md` BEFORE asking any.

Questions must reference actual file paths and component names found in Phase 3.
Questions should cover: edge cases, error handling, specific behavior, performance, compatibility.

Ask one at a time. Record answers in `05-detail-answers.md`.

## Phase 5: Generate Specification

After all detail questions are answered, generate `06-requirements-spec.md`:

```markdown
# Requirements: {Title}

**Generated:** {timestamp}
**Status:** complete

## Overview
{summary}

## Functional Requirements
- FR-01: ...
- FR-02: ...

## Technical Requirements
### Affected Files
- `path/to/file.ts` - reason

### New Components
- Component name and purpose

### Database Changes
- None / description

## Assumptions
- ASSUMED: {anything answered with "idk" or defaulted}

## Implementation Notes
{hints based on codebase patterns}

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
```

Update `metadata.json` status to "complete" and update `requirements/index.md`.

## Metadata Format

`metadata.json`:
```json
{
  "name": "{slug}",
  "description": "{original request}",
  "created": "{ISO timestamp}",
  "status": "in-progress",
  "phase": "discovery",
  "discovery_questions_answered": 0,
  "detail_questions_answered": 0
}
```

## Start Now

Begin Phase 1 immediately: acknowledge the request, analyze the codebase, then ask the first discovery question.
