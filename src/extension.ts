'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('extension.editGitExclude', () => {
        let ge = new GitExclude();
        ge.editGitExclude();
    });
    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand('extension.appendGitExclude', () => {
        let ge = new GitExclude();
        let uri = vscode.window.activeTextEditor.document.uri;
        // console.log(rp);
        ge.appendGitExcludeUri(uri);
    });
    context.subscriptions.push(disposable);
    
    disposable = vscode.commands.registerCommand('extension.appendGitExcludeUri', (fileUri) => {
        let ge = new GitExclude();
        ge.appendGitExcludeUri(fileUri);
    });

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
}

class GitExclude {
    private getGitExcludePath() : string {
        return path.join(vscode.workspace.rootPath,".git","info","exclude");
    }

    private prepareGitExclude() : string {
        let gitExcludeFile = this.getGitExcludePath();
        let gitInfoDir = path.dirname(gitExcludeFile);
        if (!fs.existsSync(gitInfoDir)) fs.mkdirSync(gitInfoDir);

        if (!fs.existsSync(gitExcludeFile)) {
            fs.writeFileSync(gitExcludeFile,"",'utf-8');
            vscode.window.showInformationMessage("Create new Exclude file.");
        }
        return gitExcludeFile;
    }

    public appendGitExcludeUri(fileUri) {
        let wf = vscode.workspace.getWorkspaceFolder(fileUri);
        let rp = path.relative(wf.uri.fsPath, fileUri.fsPath);
        
        this.appendGitExclude(rp);
    }

    public appendGitExclude(filepath) {
        let file = this.prepareGitExclude();
        fs.appendFileSync(file,filepath + "\n");
        vscode.window.showInformationMessage(filepath + "is appended!");
        this.openFile(file);
    }

    public openFile(file) {
        vscode.workspace.openTextDocument(file).then(
            doc => { vscode.window.showTextDocument(doc); }
        );
    }

    public editGitExclude() {
        let file = this.prepareGitExclude();
        this.openFile(file);
    }
}