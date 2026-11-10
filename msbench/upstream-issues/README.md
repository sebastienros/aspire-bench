# Upstream issues to file

Each file in this folder is one issue we intend to open on an external repository,
drafted from a finding in [FINDINGS.md](../FINDINGS.md) but not yet filed. Keeping them
here lets us batch the filing, review the wording first, and keep the link between
the issue and its evidence.

## File format

One markdown file per issue, named `<repo-short>-<slug>.md`. A YAML front matter
carries what the filing step needs; the body is the issue text as it should appear
upstream (write for the maintainers, not for this benchmark).

```yaml
---
repo: dotnet/aspire            # owner/name of the target repository
title: Issue title as it should appear upstream
finding: F22                   # finding ID in FINDINGS.md
labels: []                     # optional; only labels the repo already has
status: draft                  # draft | filed
issue:                         # URL once filed
---
```

## Filing

```bash
gh issue create --repo <repo> --title "<title>" --body-file <file-body>
```

After filing, set `status: filed`, put the URL in `issue:`, and add the link to the
finding's **Limits / status** line. Keep the file; it is the record of what was asked.
