'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { GitCommand } from './GitCommand';
import { getCurrentWorkspaceFolder } from './getFolder';

export interface GitRepositoryPaths {
  gitPath: string | undefined;
  gitExcludePath: string | undefined;
}

export function resolveGitRepositoryPaths(
  gitCommand: Pick<GitCommand, 'runCommand'>,
  workspacePath?: string
): GitRepositoryPaths {
  const resolveWorkspacePath = workspacePath ?? getCurrentWorkspaceFolder();

  try {
    const gitPath = gitCommand.runCommand(
      'git',
      ['rev-parse', '--git-dir'],
      workspacePath
    );
    if (!gitPath || !resolveWorkspacePath) {
      return { gitPath: undefined, gitExcludePath: undefined };
    }

    const resolvedGitPath = path.resolve(resolveWorkspacePath, gitPath.trim());
    const excludePath = gitCommand.runCommand(
      'git',
      ['rev-parse', '--git-path', 'info/exclude'],
      workspacePath
    );

    return {
      gitPath: resolvedGitPath,
      gitExcludePath: excludePath ? path.resolve(resolveWorkspacePath, excludePath.trim()) : undefined
    };
  } catch {
    return { gitPath: undefined, gitExcludePath: undefined };
  }
}

export function resolveGitRepositoryPathsFromUri(
  gitCommand: Pick<GitCommand, 'runCommand'>,
  fileUri?: vscode.Uri
): GitRepositoryPaths {
  if (!fileUri || fileUri.scheme !== 'file') {
    return { gitPath: undefined, gitExcludePath: undefined };
  }

  const workspacePath = path.dirname(fileUri.fsPath);
  return resolveGitRepositoryPaths(gitCommand, workspacePath);
}

export class GitPath {
  gitCommand: GitCommand;
  gitPath: string | undefined;
  gitExcludePath: string | undefined;
  workspacePath: string | undefined;

  constructor(gitCommand: GitCommand, workspacePath?: string) {
    this.gitCommand = gitCommand;
    this.workspacePath = workspacePath;
    const paths = resolveGitRepositoryPaths(gitCommand, workspacePath);
    this.gitPath = paths.gitPath;
    this.gitExcludePath = paths.gitExcludePath;
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
