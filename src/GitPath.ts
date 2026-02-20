'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { GitCommand } from './GitCommand';
import { getCurrentWorkspaceFolder } from './getFolder';

export class GitPath {
  gitCommand: GitCommand;
  gitPath: string | undefined;
  gitExcludePath: string | undefined;

  constructor(gitCommand: GitCommand) {
    this.gitCommand = gitCommand;
    this.gitPath = this.getGitPath();
    this.gitExcludePath = this.getGitExcludePath();
  }

  private getGitExcludePath(): string | undefined {
    if (!this.gitPath) return undefined;
    return path.join(this.gitPath, 'info', 'exclude');
  }

  private getGitPath(): string | undefined {
    try {
      const gitPath = this.gitCommand.runCommand('git', [
        'rev-parse',
        '--git-dir'
      ]);
      if (!gitPath) return undefined;
      const wf = getCurrentWorkspaceFolder();
      if (!wf) return undefined;
      return path.resolve(wf, gitPath.trim());
    } catch {
      return undefined;
    }
  }

  public prepareGitExclude(): string | null {
    if (!this.gitPath || !this.gitExcludePath || !fs.existsSync(this.gitPath)) {
      vscode.window.showInformationMessage(vscode.l10n.t('Not git repository.'));
      return null;
    }

    const exclude = this.gitExcludePath;
    const gitInfoDir = path.dirname(exclude);

    // infoディレクトリ、無ければ作成
    if (!fs.existsSync(gitInfoDir)) fs.mkdirSync(gitInfoDir, { recursive: true });

    if (!fs.existsSync(exclude)) {
      fs.writeFileSync(exclude, '', 'utf-8');
      vscode.window.showInformationMessage(vscode.l10n.t('Create new Exclude file.'));
    }

    return exclude;
  }
}
