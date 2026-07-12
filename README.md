# Git Exclude

[日本語](README.ja.md)

Git Exclude provides local Git exclusion and index-state commands from VS Code.
It can keep untracked local files out of `git status`, or temporarily hide
changes to tracked files.

## Open the menu

- Open a file and choose **GitExclude** from the editor's `...` menu.
- Right-click a file or folder in Explorer and choose **GitExclude**.
- Select multiple files or folders in Explorer to apply Exclude, Skip, or Assume
  operations to them together.
- Run a GitExclude command from the Command Palette (`F1`).

Run **GitExclude: Help** from the Command Palette to open this guide in VS Code.

## Choose the right operation

### Add to exclude

Adds an untracked file or folder to `.git/info/exclude`. This is similar to a
repository-local `.gitignore`: it is not committed or shared with other users.
It does not hide changes to files that Git already tracks.

### Skip changes (`--skip-worktree`)

Sets `git update-index --skip-worktree` for a tracked file. Use the corresponding
**Unskip changes** command before switching branches, pulling changes, or when
you want Git to notice local edits again.

### Mark as unchanged (`--assume-unchanged`)

Sets `git update-index --assume-unchanged` for a tracked file. This flag is a Git
performance hint, not a general-purpose ignore mechanism. Use **Unmark as
unchanged** to restore normal tracking.

`skip-worktree` and `assume-unchanged` can make local changes easy to overlook.
Do not rely on either flag to protect secrets or as a replacement for a proper
`.gitignore` rule.

## File status

Choose **Show file/folder status** to run `git ls-files -v` for the current file.
The common status letters used by this extension are:

| Status | Meaning | Available action |
| --- | --- | --- |
| `H` | Normal tracked file | Set Skip or Assume |
| `S` | `skip-worktree` is set | Unskip changes |
| `h` | `assume-unchanged` is set | Unmark as unchanged |
| `s` | Both flags are set | Unskip and Unmark |

The editor menu changes between the set and unset commands based on this state.

## Recovery from the terminal

If a file does not appear in Git changes, inspect and restore it with:

```sh
git ls-files -v -- path/to/file
git update-index --no-skip-worktree -- path/to/file
git update-index --no-assume-unchanged -- path/to/file
```

Use **Show all skipped files** to list files marked as `skip-worktree` in the
current repository.

## Development

Run the following commands in the repository root:

- `npm ci`: install dependencies
- `npm run compile`: compile TypeScript to `out/`
- `npm run lint`: run ESLint
- `npm test`: run extension tests

See [CHANGELOG.md](CHANGELOG.md) for release history.
