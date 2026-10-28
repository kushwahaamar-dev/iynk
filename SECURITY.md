# Security

## Reporting a problem

Please report a vulnerability privately, through GitHub's private vulnerability reporting: open the repository's
Security tab and choose "Report a vulnerability". Please do not open a public issue or pull request for it.

Include what you found, the steps to reproduce it, and which version or commit you tested. Do not include anyone
else's data or a working key.

## What is in scope

- The iynk app and server code in this repository.
- Handling of the keys a person pastes into Settings: a way to read them back, log them, send them to a third party,
  or store them where they should not be kept.
- The server token check and the rules that decide who may call the AI and search routes.
- Anything that lets a page run script it should not, such as a gap in the content security policy or in how figure
  pages are loaded.
- Prompt injection that makes the AI route leak data or take an action the person did not ask for.

## What is not in scope

- Findings that need a modified browser, or access to the machine running the app.
- Missing hardening headers with no demonstrated effect.
- Problems in a third-party package with no way to reach it from iynk. Report those upstream.
- Any hosted copy of iynk run by someone else. Tell its operator.

## What to expect

A maintainer reads each report, replies to say whether it is accepted, and tells you when a fix lands. This is a small
open-source project, so no response time is promised.

How a copy handles data is described in [docs/DATA_HANDLING.md](docs/DATA_HANDLING.md).
