# Frontend Agent Rules

- Keep the Vite development server running at all times while working unless the user explicitly asks to stop it.
- After any frontend change, smoke test the affected UI before reporting completion.
- For smoke tests, confirm the dev server is listening, open or refresh `http://localhost:5173/`, and exercise the changed route or flow. Broaden the test when touching routing, auth, backend API integration, or shared components.

## Git Workflow

- Every repository-changing task must start on a new task branch.
- Create task branches from an up-to-date `main` branch unless the user names a different base.
- When the user asks for follow-on work after a branch or PR already contains the previous finished work, create the next task branch from that finished branch unless the user explicitly asks to restart from `main`.
- Use a gitflow-style branch prefix that matches the task type. Choose the narrowest accurate prefix:
  - `feat/<short-task-name>` for user-facing features or strategy capabilities.
  - `fix/<short-task-name>` for bug fixes.
  - `docs/<short-task-name>` for documentation, research notes, protocol changes, and agent-rule updates.
  - `data/<short-task-name>` for market-data layout, metadata, manifests, and mirrored data-root README work.
  - `model/<short-task-name>` for modeling, ML, feature, labeling, training, or evaluation changes.
  - `test/<short-task-name>` for test-only work.
  - `chore/<short-task-name>` for maintenance that does not fit the categories above.
- Do not use `codex/` as a branch prefix in this repository.
- Do not place task commits directly on `main`.
- Git commits must be made file by file. If a task changes 10 files, make 10 separate commits.
- Stage only the file being committed.
- Each commit message must clearly name the file and purpose of that file's change.
- Git operations do not require additional user permission. Commit, push, branch, and related Git operations may be performed without asking first.
- If a Git operation produces unwanted behavior, the user will revert it manually.
- Never mix unrelated files in the same commit, even when changes were made during the same task.
- When a simple task is finished, push the task branch to the configured private GitHub remote and open a pull request targeting `main`.
- Do not merge the pull request just because the task is finished. Wait for the user to invoke the merge command.
- Preserve the one-file-per-commit history when merging. Do not squash unless the user explicitly asks for a squash merge.

## Stacked Pull Request Protocol

- Use stacked pull requests when a task is large enough to split into dependent implementation jobs. The agent must decide whether sharding is appropriate automatically.
- Before editing files on a multi-step task, classify the task as simple or multi-step. If the task spans multiple implementation layers, phases, or reviewable milestones, shard it proactively.
- Treat these as mandatory stack triggers:
  - The task changes strategy code, tests, documentation, and generated market-data README mirrors in the same request.
  - The task creates or changes more than one diagnostic, gate family, report family, data contract, or artifact directory.
  - The task includes both implementation and large local artifact generation.
  - The task asks for broad or deep research plus implementation plus documentation.
  - The task is expected to produce more than one coherent review milestone.
- For large research or evaluation jobs, split the stack by dependency stage, such as protocol or agent-rule updates, config/data-contract paths, label or source artifact construction, candidate evaluation, null/cost/MBP gates, tests, report generation, mirrored market-data READMEs, and final research-note documentation.
- Do not put a broad research system, all gates, all generated README mirrors, and all final notes into one implementation branch when those pieces can be reviewed as dependent stages.
- Break the task into concrete implementation jobs with clear dependency order, branch name, PR target, and success criteria for each job.
- Prefer small reviewable shards over one broad branch when work touches multiple layers such as data contracts, strategy code, APIs, UI, tests, and documentation.
- Keep each shard scoped to one coherent job. Do not create artificial stacks for tiny tasks where one branch and one PR is clearer.
- Stack branch and PR convention:
  - Create the first shard branch from up-to-date `main`, for example `docs/stacked-pr-rules`.
  - Open the first shard PR against `main`.
  - Create the second shard branch from the first shard branch, not from `main`.
  - Open the second shard PR against the first shard branch.
  - Continue in dependency order: branch C starts from branch B and PR C targets branch B.
  - Use the same gitflow-style prefixes for stacked branches, choosing the prefix by shard type.
- Preserve the one-file-per-commit rule inside every stack branch.
- When a lower stack branch changes, update higher stack branches by rebasing or merging the parent branch into the child branch, resolving only mechanical conflicts without asking.
- Protect the stack dependency graph. A branch that is the base of another open pull request must not be deleted, pruned, or auto-deleted after merge until every child pull request has been retargeted away from that branch or merged.
- Before merging or deleting any stacked branch, inspect open pull requests for `baseRefName` and `headRefName` relationships so dependent pull requests are known explicitly.
- If GitHub branch deletion would close or orphan a dependent pull request, disable branch deletion for that merge and keep the parent branch alive until the child pull request is safely retargeted.

## Merge Command Protocol

- When the user says `merge`, treat it as a request to merge all pull requests for the current task into `main` sequentially and gracefully.
- Identify every relevant pull request. Prefer the PR or PR stack associated with the current branch. If there are multiple plausible unrelated PRs, ask the user which task or stack to merge.
- If the task uses a stack, identify the full stack order before merging.
- Merge stacked PRs from the base of the stack toward the tip. Merge the PR whose base is `main` first, then update or retarget the next PR so it can merge into `main`, and continue upward until every PR in the stack has been merged or a blocker requires user input.
- Inspect PR status, branch names, and outstanding checks before each PR merge.
- During stacked merges, do not use branch auto-deletion for any merged PR while another open PR still targets that branch as its base. Retarget the child PR first, or keep the merged branch alive until the whole stack is merged.
- After a lower stacked PR is merged into `main`, update local `main`, retarget the next child PR to `main`, verify that GitHub still shows it open and mergeable, then continue.
- Delete or prune stacked branches only after confirming no open pull request uses the branch as either `baseRefName` or `headRefName`.
- If each PR can merge cleanly, merge it into `main` while preserving the one-file-per-commit task history.
- After each successful merge, update local `main` from `origin/main`, then continue to the next PR in the sequence.
- After the full sequence succeeds, switch back to `main`, update it from `origin/main`, and report every merged PR, branch, and commit range.
- If GitHub or Git reports conflicts, resolve them locally when the resolution is mechanical and low-risk.
- If a conflict requires a product, strategy, data, or research judgment, stop and ask the user what to keep instead of guessing.
- If checks are failing or required review is missing on any PR in the sequence, report the blocker, leave the remaining PRs unmerged, and do not force-merge unless the user explicitly instructs that exact action.
