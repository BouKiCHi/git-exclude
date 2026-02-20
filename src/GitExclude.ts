'use strict';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { FileItem } from './FileItem';
import { GitCommand } from './GitCommand';
import { GitPath } from './GitPath';

export function parseSkippedFiles(lsFilesOutput: string): string[] {
  return lsFilesOutput
    .split('\n')
    .filter((line) => line.startsWith('S '))
    .map((line) => line.substring(2).trim())
    .filter((line) => line.length > 0);
}

export class GitExclude {
  gitCommand: GitCommand;
  fileItem: FileItem;
  output?: vscode.OutputChannel;

  constructor(fileUri?: vscode.Uri, output?: vscode.OutputChannel) {
    this.fileItem = new FileItem(fileUri);
    this.gitCommand = new GitCommand();
    this.output = output;
  }

  private getTargetRelativeFile(): string | null {
    const file = this.fileItem.file?.relativeSlashPath;
    if (!file) {
      vscode.window.showErrorMessage(
        vscode.l10n.t('Please select a file in the current workspace.')
      );
      return null;
    }
    return file;
  }

  private showError(error: unknown, action: string) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(
      vscode.l10n.t('Failed to {0}: {1}', action, message)
    );
  }

  private runUpdateIndex(
    flag: string,
    file: string,
    successMessage: string,
    errorAction: string
  ) {
    try {
      this.gitCommand.runCommand('git', ['update-index', flag, file]);
      vscode.window.showInformationMessage(vscode.l10n.t(successMessage, file));
    } catch (error) {
      this.showError(error, errorAction);
    }
  }

  // git ls-files -v
  public showFileStatus() {
    const file = this.getTargetRelativeFile();
    if (!file) return;

    try {
      const result = this.gitCommand.runCommand('git', ['ls-files', '-v', file]);
      const output =
        this.output ?? vscode.window.createOutputChannel('git-exclude');
      output.appendLine(`>git ls-files -v ${file}`);
      output.appendLine(result);
      output.show();
    } catch (error) {
      this.showError(error, 'show file status');
    }
  }

  // git update-index --assume-unchanged
  public setAssumeUnchangedGitWorktree() {
    const file = this.getTargetRelativeFile();
    if (!file) return;
    this.runUpdateIndex(
      '--assume-unchanged',
      file,
      '{0} is assumed to be unchanged.',
      'set assume-unchanged'
    );
  }

  // git update-index --no-assume-unchanged
  public setNoAssumeUnchangedGitWorktree() {
    const file = this.getTargetRelativeFile();
    if (!file) return;
    this.runUpdateIndex(
      '--no-assume-unchanged',
      file,
      '{0} is restored from the state assumed to be unchanged.',
      'unset assume-unchanged'
    );
  }

  // git update-index --skip-worktree
  public setSkipGitWorktree() {
    const file = this.getTargetRelativeFile();
    if (!file) return;
    this.runUpdateIndex(
      '--skip-worktree',
      file,
      '{0} is skipping file changes in the local repository.',
      'set skip-worktree'
    );
  }

  // git update-index --no-skip-worktree
  public setNoSkipGitWorktree() {
    const file = this.getTargetRelativeFile();
    if (!file) return;
    this.runUpdateIndex(
      '--no-skip-worktree',
      file,
      '{0} is restored from skipping file changes in the local repository.',
      'unset skip-worktree'
    );
  }

  private hasExcludeEntry(excludePath: string, file: string): boolean {
    const content = fs.readFileSync(excludePath, 'utf8');
    const candidate = `/${file}`;
    return content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .some((line) => line === candidate);
  }

  public appendGitExcludeUri() {
    const gp = new GitPath(this.gitCommand);

    const file = this.getTargetRelativeFile();
    if (!file) return;

    const exclude = gp.prepareGitExclude();
    if (!exclude) return;
    try {
      if (this.hasExcludeEntry(exclude, file)) {
        vscode.window.showInformationMessage(
          vscode.l10n.t('{0} is already registered in exclude.', file)
        );
        this.openFile(exclude);
        return;
      }
      fs.appendFileSync(exclude, '/' + file + '\n');
      vscode.window.showInformationMessage(
        vscode.l10n.t('{0} is appended.', file)
      );
      this.openFile(exclude);
    } catch (error) {
      this.showError(error, 'append to .git/info/exclude');
    }
  }

  public openFile(file: string) {
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
        const output =
          this.output ?? vscode.window.createOutputChannel('git-exclude');
        output.clear();
        output.appendLine(
          vscode.l10n.t('Files marked as skip in the current repository:')
        );
        skippedFiles.forEach((file) => output.appendLine(file));
        output.show();
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        vscode.l10n.t('Error retrieving the list of skip files: {0}', error)
      );
    }
  }

  private async getSkippedFiles(): Promise<string[]> {
    const result = this.gitCommand.runCommand('git', ['ls-files', '-v']);
    return parseSkippedFiles(result);
  }
}
