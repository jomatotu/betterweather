# Requirements Gathering - End

Read `requirements/.current-requirement` to get the active requirement folder.

If no active requirement: display "No active requirement to end." and stop.

## Display Current State

Show:
- Requirement name
- Current phase
- Questions answered / total

## Options

Ask user to choose:

**1. Generate Spec** - Create `06-requirements-spec.md` with all findings. Mark unanswered questions as "ASSUMED: {default}". Update metadata status to "complete". Clear `.current-requirement`. Update `requirements/index.md`.

**2. Mark Incomplete** - Update metadata status to "incomplete". Add timestamp. Create progress summary. Note remaining work.

**3. Cancel / Delete** - Confirm deletion. Remove requirement folder. Clear `.current-requirement`.
