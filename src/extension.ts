'use strict';
import * as vscode from 'vscode';
import { GitExclude } from './GitExclude';

export function activate(context: vscode.ExtensionContext) {
  var oc = vscode.window.createOutputChannel('git-exclude');

  function GitExcludeInstance(fileUri?: vscode.Uri) {
    return new GitExclude(fileUri, oc);
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('GitExclude.editGitExclude', () => {
      GitExcludeInstance().editGitExclude();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('GitExclude.showFileStatus', (fileUri) => {
      GitExcludeInstance(fileUri).showFileStatus();
    })
  );

  // explorer
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'GitExclude.appendGitExcludeUri',
      (fileUri) => {
        GitExcludeInstance(fileUri).appendGitExcludeUri();
      }
    )
  );

  // skip-worktree
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'GitExclude.skipGitWorktreeUri',
      (fileUri) => {
        GitExcludeInstance(fileUri).setSkipGitWorktree();
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'GitExclude.noSkipGitWorktreeUri',
      (fileUri) => {
        GitExcludeInstance(fileUri).setNoSkipGitWorktree();
      }
    )
  );

  // assume-unchanged
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'GitExclude.setAssumeUnchangedUri',
      (fileUri) => {
        GitExcludeInstance(fileUri).setAssumeUnchangedGitWorktree();
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'GitExclude.noAssumeUnchangedUri',
      (fileUri) => {
        GitExcludeInstance(fileUri).setNoAssumeUnchangedGitWorktree();
      }
    )
  );

  // SCM
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'GitExclude.appendGitExcludeUriSCM',
      (state) => {
        GitExcludeInstance(state.resourceUri).appendGitExcludeUri();
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'GitExclude.skipGitWorktreeUriSCM',
      (state) => {
        GitExcludeInstance(state.resourceUri).setSkipGitWorktree();
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'GitExclude.setAssumeUnchangedSCM',
      (state) => {
        GitExcludeInstance(state.resourceUri).setAssumeUnchangedGitWorktree();
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
