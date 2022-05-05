'use strict';
import * as vscode from 'vscode';

/**
 * パスをURIから取得
 * @param uri URI
 * @returns パス
 */
export function getPathFromUri(uri : vscode.Uri) : string | undefined {
    if (!uri) return undefined;
    var ws = vscode.workspace.getWorkspaceFolder(uri);
    if (!ws) return undefined;
    return ws.uri.fsPath;
}

/**
 * パスを取得
 * @returns パス
 */
export function getCurrentWorkspaceFolder(): string | undefined {
    let ac = vscode.window.activeTextEditor;
    if (ac && ac.document.uri.scheme == 'file') {
        return getPathFromUri(ac.document.uri);
    }

    let ws = vscode.workspace.workspaceFolders;
    if (!ws)
        return undefined;
    return getPathFromUri(ws[0].uri);
}
