'use strict';
import * as vscode from 'vscode';
import { getActiveTextFileUrl } from './getActiveTextFileUrl';
import { RelativeFile } from './RelativeFile';

export class FileItem {
    fileUri: vscode.Uri | undefined;
    file: RelativeFile | undefined;

    constructor(fileUri : vscode.Uri|undefined) {
        let f = fileUri || getActiveTextFileUrl();
        this.fileUri = f;
        if (!f) return;
        this.file = this.getWorkspaceRelativePath(f);
    }

    private getWorkspaceRelativePath(fileUri : vscode.Uri) {
        if (fileUri.scheme != 'file') return undefined;
        let wf = vscode.workspace.getWorkspaceFolder(fileUri);
        return new RelativeFile(wf, fileUri);
    }
}

