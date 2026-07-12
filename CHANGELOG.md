# CHANGELOG

### 0.4.7
* Fixed Windows path handling in Linux-based test environments.
* Fixed Git commands targeting the wrong repository in multi-root workspaces.
* Fixed repository-boundary validation for filenames beginning with two dots.
* Added a PowerShell fallback for Windows network-drive workspaces.
* Updated CI to run VS Code tests with a virtual display.

### 0.4.6
* Added batch operations for multiple files and folders.
* Added support for repository-local exclude entries, skip-worktree, and assume-unchanged operations from Explorer and SCM menus.
* Improved Git path resolution for subdirectories, linked worktrees, and Windows network drives.
* Added status display, skipped-file listing, help documentation, and localization updates.
* Added tests for Git state handling, path resolution, exclude patterns, and batch operations.

### 0.4.5
* Hardened git command execution (safer process invocation and argument handling).
* Added guards for missing workspace/file context to avoid runtime errors.
* Reduced duplicated update-index logic and improved maintainability.
* Prevented duplicate entries when appending to `.git/info/exclude`.
* Added/updated localization messages (en/ja/zh-cn).
* Added CI workflow for compile, lint, and test on GitHub Actions.
* Added tests for skip-file parsing logic.

### 0.4.2
* added network drive path suuport for windows.

### 0.4.1
* added some feature from [@cl1107],
 International Chinese Simplified Chinese support, new showAllSkipFile command.

### 0.4.0
* dependencies and vscode engine version are updated.

### 0.3.1
* Removed duplicate commands in package.json

### 0.3.0
* Added "Show current File/Folder status"
* Improved Context menu

### 0.2.0
* Added assume-unchanged stuff.
* Improved getting the path to the git directory when the workspace root is a child directory.

### 0.1.5
* Added a slash when adding files to exclude.

### 0.1.2
* update package.json.

### 0.1.1
* added context menu to scm item.
* update package version.

### 0.1.0
* (unknown)

### 0.0.4
* show message if not a git repository.
* fixed separator problem.

### 0.0.3

* fixed separator to append path to exclude file in Windows.
* added japanese localization text.

## 0.0.2

- Added (no) skip update file check in local repository using git update-index --skip-worktree

## 0.0.1

- Initial release
