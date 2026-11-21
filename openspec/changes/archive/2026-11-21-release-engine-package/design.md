# Design

- **Version:** 0.1.0, not 1.0.0. The calibration is unchecked against references (issue #6), and engine-packages semver makes any sound change at least minor. The VZ package started the same way.
- **License field:** `MIT AND Apache-2.0`, since the package contains msfa's Apache-2.0 code. `NOTICE` ships in the tarball (checked by `pnpm pack`).
- **Publishing:** only through the workflow (`.github/workflows/publish-yamaha-dx7-engine.yml`), from a tag on `main` after this change is merged, never by hand from a laptop.
- **Check:** after it runs, the package version is listed by `gh api /users/dblodorn/packages/npm/yamaha-dx7-engine/versions`, and a scratch project outside the workspace installs it from the registry with the local `GITHUB_PACKAGES_TOKEN` and renders INIT VOICE.
