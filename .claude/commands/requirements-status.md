# Requirements Gathering - Status

Read `requirements/.current-requirement`.

If no active requirement:
```
No active requirement.
Start one with: /requirements-start [description]
Or review existing: /requirements-list
```

If active requirement found, read its `metadata.json` and question files.

Display:
```
📋 Active Requirement: {name}
⏱  Started: {time elapsed}
📍 Phase: {Discovery|Detail|Complete}
✅ Discovery: {X}/5 answered
✅ Detail: {X}/5 answered

Recent answers:
  Q3: [question] → Yes
  Q2: [question] → No (default)
  Q1: [question] → idk → Yes (default)

➡️  Next: {next unanswered question}
```

Then present the next unanswered question to the user and wait for their answer (yes/no/idk).

Record the answer and update metadata.
