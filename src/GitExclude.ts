'use strict';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { FileItem } from './FileItem';
import { GitCommand } from './GitCommand';
import { GitPath } from './GitPath';

export class GitExclude {
  gitCommand: GitCommand;
  fileItem: FileItem;
  output: vscode.OutputChannel;

  constructor(fileUri?: vscode.Uri, output?: vscode.OutputChannel) {
    this.fileItem = new FileItem(fileUri);
    this.gitCommand = new GitCommand();
    this.output = output;
  }

  // git ls-files -v
  public showFileStatus() {
    let file = this.fileItem.file.relativeSlashPath;
    let command = 'git ls-files -v ' + file;
    let result = this.gitCommand.runCommand(command);
    let output = this.output;
    output.appendLine(`>${command}`);
    output.appendLine(result);
    output.show();
  }

  // git update-index --assume-unchanged
  public setAssumeUnchangedGitWorktree() {
    let file = this.fileItem.file.relativeSlashPath;
    this.gitCommand.runCommand('git update-index --assume-unchanged ' + file);
    let text = vscode.l10n.t('{0} is assumed to be unchanged.', file);
    vscode.window.showInformationMessage(text);
  }

  // git update-index --no-assume-unchanged
  public setNoAssumeUnchangedGitWorktree() {
    let file = this.fileItem.file.relativeSlashPath;
    this.gitCommand.runCommand(
      'git update-index --no-assume-unchanged ' + file
    );
    let text = vscode.l10n.t(
      '{0} is restored from the state assumed to be unchanged.',
      file
    );
    vscode.window.showInformationMessage(text);
  }

  // git update-index --skip-worktree
  public setSkipGitWorktree() {
    let file = this.fileItem.file.relativeSlashPath;
    this.gitCommand.runCommand('git update-index --skip-worktree ' + file);
    let text = vscode.l10n.t(
      '{0} is skipping file changes in the local repository.',
      file
    );
    vscode.window.showInformationMessage(text);
  }

  // git update-index --no-skip-worktree
  public setNoSkipGitWorktree() {
    let file = this.fileItem.file.relativeSlashPath;
    this.gitCommand.runCommand('git update-index --no-skip-worktree ' + file);
    let text = vscode.l10n.t(
      '{0} is restored from skipping file changes in the local repository.',
      file
    );
    vscode.window.showInformationMessage(text);
  }

  public appendGitExcludeUri() {
    let gp = new GitPath(this.gitCommand);

    let file = this.fileItem.file.relativeSlashPath;

    let exclude = gp.prepareGitExclude();
    if (!exclude) return;
    fs.appendFileSync(exclude, '/' + file + '\n');
    vscode.window.showInformationMessage(
      vscode.l10n.t('{0} is appended.', file)
    );
    this.openFile(exclude);
  }

  public openFile(file) {
    vscode.workspace.openTextDocument(file).then((doc) => {
      vscode.window.showTextDocument(doc);
    });
  }

  public editGitExclude() {
    let gp = new GitPath(this.gitCommand);
    let file = gp.prepareGitExclude();
    if (!file) return;
    this.openFile(file);
  }

  public async showAllSkipFile() {
    try {
      const skippedFiles = await this.getSkippedFiles();
      if (skippedFiles.length === 0) {
        vscode.window.showInformationMessage(
          vscode.l10n.t(
            'There are no files marked as skip in the current repository.'
          )
        );
      } else {
        this.output.clear();
        this.output.appendLine(
          vscode.l10n.t('Files marked as skip in the current repository:')
        );
        skippedFiles.forEach((file) => this.output.appendLine(file));
        this.output.show();
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        vscode.l10n.t('Error retrieving the list of skip files: {0}', error)
      );
    }
  }

  private async getSkippedFiles(): Promise<string[]> {
    const result = this.gitCommand.runCommand('git ls-files -v');
    return result
      .split('\n')
      .filter((line) => line.startsWith('S '))
      .map((line) => line.substring(2).trim());
  }
}
