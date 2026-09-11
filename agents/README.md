# agents/ — Start here (for AI coding agents)

Read these files **before** making any change to this repo, in this order:

| File | Purpose |
|------|---------|
| [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) | What the product is, the folder structure, and how data flows |
| [TASK_LOG.md](TASK_LOG.md) | What is done, in progress, and pending. **Update it when you finish a task** |
| [rules/dos-and-donts.md](rules/dos-and-donts.md) | Coding conventions and hard rules for this project |
| [rules/git-commit.md](rules/git-commit.md) | How to stage, commit and push |

To understand why each library or API was chosen, see [../docs/tech-stack/](../docs/tech-stack/README.md).

## Workflow for every task
1. Read the four files above.
2. Check `TASK_LOG.md` so you don't redo or contradict finished work.
3. Do the work in the module layout described in `PROJECT_OVERVIEW.md`.
4. Run the relevant tests (`npm run test:auth`, `npm run test:resume`, …, run from `Backend/`).
5. Update `TASK_LOG.md` (and the module README / `docs/tech-stack` if you added a library or API).
6. Commit per `rules/git-commit.md`.
