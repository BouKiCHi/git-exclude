'use strict';
import * as vscode from 'vscode';

export function getActiveTextFileUrl() {
    let editor = vscode.window.activeTextEditor;
    if (!editor) return null;
    return editor.document.uri || null;
}
