'use strict';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { GitExclude } from './GitExclude';
import { GitExcludeBatch, getSelectedUris } from './GitExcludeBatch';
import { getGitFileState } from './GitFileState';
import { GitCommand } from './GitCommand';
import { resolveGitRepositoryPathsFromUri } from './GitPath';

export function activate(context: vscode.ExtensionContext) {
  var oc = vscode.window.createOutputChannel('git-exclude');
  let contextUpdateVersion = 0;
  let contextUpdateQueue = Promise.resolve();
  const gitCommand = new GitCommand();
  let gitWatchers: fs.FSWatcher[] = [];
  const contextRefreshTimer = setInterval(() => {
    if (vscode.window.state.focused) {
      void updateActiveEditorContext();
    }
  }, 5000);

  function updateActiveEditorContext() {
    const version = ++contextUpdateVersion;
    const fileUri = vscode.window.activeTextEditor?.document.uri;

    contextUpdateQueue = contextUpdateQueue
      .catch(() => undefined)
      .then(async () => {
        if (version !== contextUpdateVersion) return;

        const state = getGitFileState(fileUri);
        if (version !== contextUpdateVersion) return;

        await vscode.commands.executeCommand(
          'setContext',
          'gitExclude.isTracked',
          state.isTracked
        );
        await vscode.commands.executeCommand(
          'setContext',
          'gitExclude.isSkipWorktree',
          state.isSkipWorktree
        );
        await vscode.commands.executeCommand(
          'setContext',
          'gitExclude.isAssumeUnchanged',
          state.isAssumeUnchanged
        );
      });

    return contextUpdateQueue;
  }

  function disposeGitWatchers() {
    while (gitWatchers.length > 0) {
      gitWatchers.pop()?.close();
    }
  }

  function watchGitIndex(pathToWatch: string) {
    if (!fs.existsSync(pathToWatch)) return;

    try {
      const watcher = fs.watch(pathToWatch, { persistent: false }, () => {
        void updateActiveEditorContext();
      });
      gitWatchers.push(watcher);
    } catch {
      // Ignore repositories or file systems that do not support watching.
    }
  }

  function refreshGitWatchers() {
    disposeGitWatchers();

    const activeUri = vscode.window.activeTextEditor?.document.uri;
    const { gitPath } = resolveGitRepositoryPathsFromUri(gitCommand, activeUri);
    if (!gitPath) return;

    watchGitIndex(gitPath);
  }

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => {
      refreshGitWatchers();
      void updateActiveEditorContext();
    })
  );
  context.subscriptions.push(
    vscode.window.onDidChangeWindowState((state) => {
      if (state.focused) {
        void updateActiveEditorContext();
      }
    })
  );
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      refreshGitWatchers();
      void updateActiveEditorContext();
    })
  );
  context.subscriptions.push({
    dispose: () => {
      disposeGitWatchers();
      clearInterval(contextRefreshTimer);
    }
  });
  void updateActiveEditorContext();
  refreshGitWatchers();

  function GitExcludeInstance(fileUri?: vscode.Uri) {
    return new GitExclude(fileUri, oc);
  }

  function useExplorerSelection(selectedUris?: readonly vscode.Uri[]) {
    return selectedUris !== undefined && selectedUris.length > 0;
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('GitExclude.showHelp', async () => {
      const readme = vscode.env.language.toLowerCase().startsWith('ja')
        ? 'README.ja.md'
        : 'README.md';
      const readmeUri = vscode.Uri.joinPath(context.extensionUri, readme);
      await vscode.commands.executeCommand('markdown.showPreview', readmeUri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('GitExclude.editGitExclude', () => {
      GitExcludeInstance().editGitExclude();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('GitExclude.showFileStatus', async (fileUri) => {
      GitExcludeInstance(fileUri).showFileStatus();
      await updateActiveEditorContext();
    })
  );

  // explorer
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'GitExclude.appendGitExcludeUri',
      async (fileUri, selectedUris) => {
        if (useExplorerSelection(selectedUris)) {
          await new GitExcludeBatch(oc).appendToExclude(
            getSelectedUris(fileUri, selectedUris)
          );
          return;
        }
        GitExcludeInstance(fileUri).appendGitExcludeUri();
      }
    )
  );

  // skip-worktree
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'GitExclude.skipGitWorktreeUri',
      async (fileUri, selectedUris) => {
        if (useExplorerSelection(selectedUris)) {
          await new GitExcludeBatch(oc).updateIndex(
            getSelectedUris(fileUri, selectedUris),
            '--skip-worktree'
          );
          await updateActiveEditorContext();
          return;
        }
        GitExcludeInstance(fileUri).setSkipGitWorktree();
        await updateActiveEditorContext();
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'GitExclude.noSkipGitWorktreeUri',
      async (fileUri, selectedUris) => {
        if (useExplorerSelection(selectedUris)) {
          await new GitExcludeBatch(oc).updateIndex(
            getSelectedUris(fileUri, selectedUris),
            '--no-skip-worktree'
          );
          await updateActiveEditorContext();
          return;
        }
        GitExcludeInstance(fileUri).setNoSkipGitWorktree();
        await updateActiveEditorContext();
      }
    )
  );

  // assume-unchanged
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'GitExclude.setAssumeUnchangedUri',
      async (fileUri, selectedUris) => {
        if (useExplorerSelection(selectedUris)) {
          await new GitExcludeBatch(oc).updateIndex(
            getSelectedUris(fileUri, selectedUris),
            '--assume-unchanged'
          );
          await updateActiveEditorContext();
          return;
        }
        GitExcludeInstance(fileUri).setAssumeUnchangedGitWorktree();
        await updateActiveEditorContext();
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'GitExclude.noAssumeUnchangedUri',
      async (fileUri, selectedUris) => {
        if (useExplorerSelection(selectedUris)) {
          await new GitExcludeBatch(oc).updateIndex(
            getSelectedUris(fileUri, selectedUris),
            '--no-assume-unchanged'
          );
          await updateActiveEditorContext();
          return;
        }
        GitExcludeInstance(fileUri).setNoAssumeUnchangedGitWorktree();
        await updateActiveEditorContext();
      }
    )
  );

  // SCM
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'GitExclude.appendGitExcludeUriSCM',
      (state) => {
        GitExcludeInstance(state?.resourceUri).appendGitExcludeUri();
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'GitExclude.skipGitWorktreeUriSCM',
      async (state) => {
        GitExcludeInstance(state?.resourceUri).setSkipGitWorktree();
        await updateActiveEditorContext();
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'GitExclude.setAssumeUnchangedSCM',
      async (state) => {
        GitExcludeInstance(state?.resourceUri).setAssumeUnchangedGitWorktree();
        await updateActiveEditorContext();
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('GitExclude.showAllSkipFile', () => {
      GitExcludeInstance().showAllSkipFile();
    })
  );
}
// this method is called when your extension is deactivated
export function deactivate() {}
