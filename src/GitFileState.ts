'use strict';
import * as vscode from 'vscode';
import { FileItem } from './FileItem';
import { GitCommand } from './GitCommand';

export interface GitFileState {
  isTracked: boolean;
  isSkipWorktree: boolean;
  isAssumeUnchanged: boolean;
}

const untrackedFileState: GitFileState = {
  isTracked: false,
  isSkipWorktree: false,
  isAssumeUnchanged: false
};

export function parseGitFileState(lsFilesOutput: string): GitFileState {
  const status = lsFilesOutput.trimStart().charAt(0);

  return {
    isTracked: status.length > 0,
    isSkipWorktree: status === 'S' || status === 's',
    isAssumeUnchanged: status === status.toLowerCase() && status.length > 0
  };
}

export function getGitFileState(fileUri?: vscode.Uri): GitFileState {
  const file = new FileItem(fileUri).file?.relativeSlashPath;
  if (!file) return untrackedFileState;

  try {
    const result = new GitCommand().runCommand('git', [
      'ls-files',
      '-v',
      '--',
      file
    ]);
    return parseGitFileState(result);
  } catch {
    return untrackedFileState;
  }
}
