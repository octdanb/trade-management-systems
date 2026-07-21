---
name: release
description: Cut a versioned release (git tag, GitHub Release, semver-tagged docker images) via a release/X.Y.Z branch. Use when asked to release, version, or ship a new version.
---

# Cutting a release

Releases are branch-name driven — CI does everything.

## Steps

1. Make sure the source branch is green (checks + image builds in Actions).
2. Create and push the release branch from the commit to ship:

```sh
git checkout -b release/X.Y.Z
git push -u origin release/X.Y.Z
```

3. CI (`.github/workflows/ci.yml`) then:
   - validates `X.Y.Z` is semver (malformed → the `version` job fails),
   - runs all checks/tests,
   - builds and pushes both images tagged `X.Y.Z` (+ branch/sha tags):
     `ghcr.io/<owner>/<repo>/backend` and `.../frontend`,
   - creates git tag `vX.Y.Z` and a GitHub Release with generated notes.

4. Verify: the Actions run is green and the release appears under
   `https://github.com/<owner>/<repo>/releases`.

## Notes

- **Idempotent**: re-pushing the same release branch (e.g. after a fix) will
  NOT duplicate the release — it skips if tag `vX.Y.Z` exists. To re-cut the
  same version, delete the GitHub release and the `vX.Y.Z` tag first.
- Pushing a `vX.Y.Z` git tag directly also builds semver-tagged images (but
  skips the GitHub Release job, which is branch-triggered).
- `latest` follows the repo's **default branch**, not releases.
- Pre-releases like `release/1.2.0-rc.1` are accepted by the version regex.
