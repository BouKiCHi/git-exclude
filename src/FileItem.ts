'use strict';
import * as vscode from 'vscode';
import { getActiveTextFileUrl } from './getActiveTextFileUrl';
import { RelativeFile } from './RelativeFile';

export class FileItem {
  fileUri: vscode.Uri | undefined;
  file: RelativeFile | undefined;

  constructor(fileUri: vscode.Uri | undefined) {
    const f = fileUri || getActiveTextFileUrl() || undefined;
    this.fileUri = f;
    if (!f) return;
    this.file = this.getWorkspaceRelativePath(f);
  }

  private getWorkspaceRelativePath(fileUri: vscode.Uri) {
    if (fileUri.scheme !== 'file') return undefined;
    const wf = vscode.workspace.getWorkspaceFolder(fileUri);
    if (!wf) return undefined;
    return new RelativeFile(wf, fileUri);
  }
}

