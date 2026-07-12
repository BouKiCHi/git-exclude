'use strict';
import * as vscode from 'vscode';
import * as path from 'path';

export class RelativeFile {
    workspace: vscode.WorkspaceFolder;
    fileUri: vscode.Uri;
    relativePath: string;
    relativeSlashPath: string;
    relativeDirectory: string;
    constructor(wf: vscode.WorkspaceFolder, fileUri: vscode.Uri) {
        this.workspace = wf;
        this.fileUri = fileUri;

        const isWindowsPath = /^[A-Za-z]:[\\/]/;
        const pathApi = isWindowsPath.test(wf.uri.fsPath) || isWindowsPath.test(fileUri.fsPath)
            ? path.win32
            : path;

        this.relativePath = pathApi.relative(wf.uri.fsPath, fileUri.fsPath);
        this.relativeDirectory = pathApi.dirname(this.relativePath);


        this.relativeSlashPath = this.relativePath.replace(/\\/g, '/');
    }
}
