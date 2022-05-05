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

        this.relativePath = path.relative(wf.uri.fsPath, fileUri.fsPath);
        this.relativeDirectory = path.dirname(this.relativePath);


        this.relativeSlashPath = (process.platform === "win32") ? this.relativePath.replace(/\\/g, '/') : this.relativePath;
    }
}
