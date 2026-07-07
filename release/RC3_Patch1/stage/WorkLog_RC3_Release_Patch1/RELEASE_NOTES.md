# WorkLog RC3 Release Patch1

## Version

1.0.0-rc3.1-sp3

## Scope

RC3 Release Patch1 only. No new features, no version number change, no repository restructuring.

## Completed Patches

- P0-001 Calendar Default Today
  - Entering Work defaults Calendar to Today.
- P0-002 Today 與 Calendar 同步
  - Verified existing shared date state satisfies the requirement.
  - No Code Change Required.
- P0-003 Suggestion Card Position Optimization
  - Dashboard order: Calendar, Today, Suggestion Card.
  - Desktop layout: Calendar left; Today and Suggestion Card right.
  - Narrow layout: Calendar, Today, Suggestion Card.
- P0-004 Book Creation Return Flow
  - Verified existing Library save flow returns to Library and shows the new item immediately.
  - No Code Change Required.
- P0-007 Google Login Only
  - Login UI keeps only the Google login button.
  - Local QA login uses fixed session data.

## Developer QA

- Full Regression Check: PASS
- Build Verification: PASS
- Chrome Extension Verification: PASS
- Web Version Verification: PASS
- Static File Validation: PASS
- JavaScript Syntax Check: PASS
- Manifest Validation: PASS
- Version Consistency Check: PASS

## Generated Release Artifacts

- Web Build folder
- WorkLog_RC3_Web.zip
- WorkLog_RC3_ChromeExtension.zip
- WorkLog_RC3_Release_Patch1.zip
