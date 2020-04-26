# git-exclude README

 The extension's main function is ignoring update/add file in local git repository.
 This means to be clean repository from test or debug materials, or to be clean from specific user's settings.

## How to use

There are two ways to call this extension.

* Context menu in explorer (Right-Click)
* Command (F1)

## Features

* add the file and the folder of explorer to the exclude of git.

The function is for ignoring files which are not managed by git.

In order to achieve the function, this adds files as a line to.git/info/exclude.
If .git/info/exclude is no existed, create a new one.

The function must be a local repository for git.

* ignore the update of the file being managed by git and release the ignore.

The function is for ignoring files which are managed by git.

Run "git update-index --skip-worktree" to ignore the file updates.

This has also an opposing function, undo the ignoring of updates with "git update-index --no-skip-worktree".
