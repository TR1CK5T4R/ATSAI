GIT AUTO-COMMIT RULES (apply to every task in this project)

After you finish each logical unit of work (a feature, a bug fix, a config change, a refactor), and after any tests/build you ran for it pass, do this automatically without asking me:

1. Run `git status` and review what changed.
2. Stage only the files you changed for this task, using explicit paths. Never use `git add .` or `git add -A`.
3. NEVER stage or commit: .env, .env.*, (except .env.example), node_modules/, dist/, uploads/, *.log, server.log, any file containing API keys, tokens, or passwords. If a secret appears in a diff, stop, unstage it, tell me, and do not commit.
4. Commit using Conventional Commits:
   <type>(<scope>): <short imperative summary, max 72 chars>
   Types: feat, fix, refactor, docs, chore, test, style, perf, build, ci
   Scopes: backend, frontend, auth, resume, interview, courses, db, deploy
   Add a 1-3 line body explaining WHY if the change is not obvious.
   Example: feat(interview): add answer endpoint with latency logging
5. One logical change per commit. If a task touched unrelated things, make separate commits.
6. Work on a branch, not main. If you are on main, first run `git checkout -b feat/<short-task-name>` and commit there.
7. After committing, run `git push -u origin HEAD`. If push fails (non-fast-forward), run `git pull --rebase origin <branch>`, resolve any conflicts carefully, and push again. Never use `--force`.
8. Never rewrite history (`reset --hard`, `rebase -i`, `commit --amend` on pushed commits) unless I explicitly ask.
9. After each commit, reply with one line: the commit hash, message, and number of files changed.