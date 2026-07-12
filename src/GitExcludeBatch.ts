'use strict';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { GitCommand } from './GitCommand';
import {
  createGitExcludeEntry,
  hasGitExcludeEntry
} from './GitExcludePattern';

interface RepositoryTargets {
  root: string;
  paths: string[];
}

interface RepositoryGroups {
  groups: RepositoryTargets[];
  failed: number;
}

interface RepositoryTarget {
  root: string;
  relativePath: string;
}

interface BatchResult {
  updated: number;
  unchanged: number;
  failed: number;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function getSelectedUris(
  primaryUri?: vscode.Uri,
  selectedUris?: readonly vscode.Uri[]
): vscode.Uri[] {
  const candidates = selectedUris?.length
    ? selectedUris
    : primaryUri
      ? [primaryUri]
      : [];
  const seen = new Set<string>();

  return candidates.filter((uri) => {
    const key = uri.toString();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function countUnmatchedSelections(
  selectedPaths: readonly string[],
  trackedFiles: readonly string[]
): number {
  return selectedPaths.filter(
    (selectedPath) =>
      !(
        (selectedPath === '.' && trackedFiles.length > 0) ||
        trackedFiles.some(
          (trackedFile) =>
            trackedFile === selectedPath ||
            trackedFile.startsWith(`${selectedPath}/`)
        )
      )
  ).length;
}

export function chunkPaths(
  paths: readonly string[],
  maximumArgumentLength = 12000
): string[][] {
  const chunks: string[][] = [];
  let chunk: string[] = [];
  let chunkLength = 0;

  paths.forEach((file) => {
    const argumentLength = file.length + 3;
    if (chunk.length > 0 && chunkLength + argumentLength > maximumArgumentLength) {
      chunks.push(chunk);
      chunk = [];
      chunkLength = 0;
    }
    chunk.push(file);
    chunkLength += argumentLength;
  });

  if (chunk.length > 0) chunks.push(chunk);
  return chunks;
}

export async function resolveRepositoryTarget(
  uri: vscode.Uri,
  gitCommand: Pick<GitCommand, 'runCommandAsync'>,
  repositoryRootCache = new Map<string, Promise<string>>()
): Promise<RepositoryTarget> {
  if (uri.scheme !== 'file') {
    throw new Error('Only local files are supported.');
  }

  const startPath = (await fs.promises.stat(uri.fsPath)).isDirectory()
    ? uri.fsPath
    : path.dirname(uri.fsPath);
  const cacheKey = process.platform === 'win32'
    ? startPath.toLowerCase()
    : startPath;
  let rootPromise = repositoryRootCache.get(cacheKey);
  if (!rootPromise) {
    rootPromise = gitCommand
      .runCommandAsync('git', ['rev-parse', '--show-toplevel'], startPath)
      .then((root) => path.resolve(root.trim()));
    repositoryRootCache.set(cacheKey, rootPromise);
  }

  let root: string;
  try {
    root = await rootPromise;
  } catch (error) {
    repositoryRootCache.delete(cacheKey);
    throw error;
  }
  const relativePath = path.relative(root, uri.fsPath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error('The selected path is outside of its Git repository.');
  }

  return {
    root,
    relativePath: relativePath ? relativePath.replace(/\\/g, '/') : '.'
  };
}

export class GitExcludeBatch {
  private readonly gitCommand: Pick<GitCommand, 'runCommandAsync'>;
  private readonly output: vscode.OutputChannel;
  private readonly repositoryRootCache = new Map<string, Promise<string>>();

  constructor(
    output: vscode.OutputChannel,
    gitCommand: Pick<GitCommand, 'runCommandAsync'> = new GitCommand()
  ) {
    this.output = output;
    this.gitCommand = gitCommand;
  }

  private async groupByRepository(
    uris: readonly vscode.Uri[]
  ): Promise<RepositoryGroups> {
    const groups = new Map<string, RepositoryTargets>();
    let failed = 0;

    for (const uri of uris) {
      try {
        const target = await resolveRepositoryTarget(
          uri,
          this.gitCommand,
          this.repositoryRootCache
        );
        const { root, relativePath } = target;

        const key = process.platform === 'win32' ? root.toLowerCase() : root;
        let group = groups.get(key);
        if (!group) {
          group = { root, paths: [] };
          groups.set(key, group);
        }

        if (!group.paths.includes(relativePath)) {
          group.paths.push(relativePath);
        }
      } catch (error) {
        failed += 1;
        this.reportError(uri.fsPath, error);
      }
    }

    return { groups: [...groups.values()], failed };
  }

  private reportError(target: string, error: unknown) {
    this.output.appendLine(`${target}: ${getErrorMessage(error)}`);
  }

  public async updateIndex(uris: readonly vscode.Uri[], flag: string) {
    this.output.clear();
    const result: BatchResult = { updated: 0, unchanged: 0, failed: 0 };
    const repositories = await this.groupByRepository(uris);
    result.failed += repositories.failed;

    for (const { root, paths } of repositories.groups) {
      const processedFiles = new Set<string>();

      for (const selectedPaths of chunkPaths(paths)) {
        let trackedFiles: string[];
        try {
          const trackedOutput = await this.gitCommand.runCommandAsync(
            'git',
            ['ls-files', '-z', '--', ...selectedPaths],
            root
          );
          trackedFiles = [
            ...new Set(trackedOutput.split('\0').filter(Boolean))
          ];
        } catch (error) {
          result.failed += selectedPaths.length;
          this.reportError(root, error);
          continue;
        }

        const unmatchedSelectionCount = countUnmatchedSelections(
          selectedPaths,
          trackedFiles
        );
        result.unchanged += unmatchedSelectionCount;

        const unprocessedFiles = trackedFiles.filter(
          (file) => !processedFiles.has(file)
        );

        for (const trackedPaths of chunkPaths(unprocessedFiles)) {
          try {
            await this.gitCommand.runCommandAsync(
              'git',
              ['update-index', flag, '--', ...trackedPaths],
              root
            );
            trackedPaths.forEach((file) => processedFiles.add(file));
            result.updated += trackedPaths.length;
          } catch (error) {
            result.failed += trackedPaths.length;
            this.reportError(root, error);
          }
        }
      }
    }

    this.showUpdateResult(result);
  }

  private showUpdateResult(result: BatchResult) {
    const message = vscode.l10n.t(
      '{0} file(s) updated. {1} selection(s) had no tracked files. {2} item(s) failed.',
      result.updated,
      result.unchanged,
      result.failed
    );

    if (result.failed > 0) {
      this.output.show();
      vscode.window.showWarningMessage(message);
    } else {
      vscode.window.showInformationMessage(message);
    }
  }

  public async appendToExclude(uris: readonly vscode.Uri[]) {
    this.output.clear();
    const result: BatchResult = { updated: 0, unchanged: 0, failed: 0 };
    const repositories = await this.groupByRepository(uris);
    result.failed += repositories.failed;

    for (const { root, paths } of repositories.groups) {
      try {
        const excludeOutput = await this.gitCommand.runCommandAsync(
          'git',
          ['rev-parse', '--git-path', 'info/exclude'],
          root
        );
        const excludePath = path.resolve(root, excludeOutput.trim());
        await fs.promises.mkdir(path.dirname(excludePath), { recursive: true });

        let content = '';
        try {
          content = await fs.promises.readFile(excludePath, 'utf8');
        } catch (error) {
          const code = (error as NodeJS.ErrnoException).code;
          if (code !== 'ENOENT') throw error;
        }

        const additions: string[] = [];
        for (const file of paths) {
          try {
            const entry = createGitExcludeEntry(file);
            if (
              hasGitExcludeEntry(content, entry) ||
              additions.includes(entry)
            ) {
              result.unchanged += 1;
            } else {
              additions.push(entry);
            }
          } catch (error) {
            result.failed += 1;
            this.reportError(path.join(root, file), error);
          }
        }

        if (additions.length > 0) {
          try {
            await fs.promises.appendFile(
              excludePath,
              `${additions.join('\n')}\n`
            );
            result.updated += additions.length;
          } catch (error) {
            result.failed += additions.length;
            this.reportError(excludePath, error);
          }
        }
      } catch (error) {
        result.failed += paths.length;
        this.reportError(root, error);
      }
    }

    this.showExcludeResult(result);
  }

  private showExcludeResult(result: BatchResult) {
    const message = vscode.l10n.t(
      '{0} item(s) added to exclude. {1} already existed. {2} failed.',
      result.updated,
      result.unchanged,
      result.failed
    );

    if (result.failed > 0) {
      this.output.show();
      vscode.window.showWarningMessage(message);
    } else {
      vscode.window.showInformationMessage(message);
    }
  }
}
