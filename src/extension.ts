'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as child from 'child_process';

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand('GitExclude.editGitExclude', () => {
        (new GitExclude()).editGitExclude();
    }));
    
    // explorer
    context.subscriptions.push(vscode.commands.registerCommand('GitExclude.appendGitExcludeUri', (fileUri) => {
        (new GitExclude()).appendGitExcludeUri(fileUri);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('GitExclude.skipGitWorktreeUri', (fileUri) => {
        (new GitExclude()).skipGitWorktree(fileUri);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('GitExclude.noSkipGitWorktreeUri', (fileUri) => {
        (new GitExclude()).noSkipGitWorktree(fileUri);
    }));


    // SCM
    context.subscriptions.push(vscode.commands.registerCommand('GitExclude.appendGitExcludeUriSCM', (state) => {
        (new GitExclude()).appendGitExcludeUri(state.resourceUri);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('GitExclude.skipGitWorktreeUriSCM', (state) => {
        (new GitExclude()).skipGitWorktree(state.resourceUri);
    }));
}

// this method is called when your extension is deactivated
export function deactivate() {
}

class GitExclude {
    private getGitExcludePath() : string {
        return path.join(vscode.workspace.rootPath,".git","info","exclude");
    }

    private getGitPath() : string {
        return path.join(vscode.workspace.rootPath,".git");
    }

    private prepareGitExclude() : string {
        if (!fs.existsSync(this.getGitPath())) {
            vscode.window.showInformationMessage("Not git repository.");
            return null;
        }
        let gitExcludeFile = this.getGitExcludePath();
        let gitInfoDir = path.dirname(gitExcludeFile);
        if (!fs.existsSync(gitInfoDir)) fs.mkdirSync(gitInfoDir);

        if (!fs.existsSync(gitExcludeFile)) {
            fs.writeFileSync(gitExcludeFile,"",'utf-8');
            vscode.window.showInformationMessage("Create new Exclude file.");
        }
        return gitExcludeFile;
    }

    public getSelectedItemUri(fileUri) {
        let editor = vscode.window.activeTextEditor; 
        if (fileUri === undefined && editor) fileUri = editor.document.uri;
        if (fileUri === undefined) return null;
        return fileUri;
    }

    public skipGitWorktree(fileUri) {
        fileUri = this.getSelectedItemUri(fileUri);
        if (!fileUri) return;
        let file = this.getWorkspaceRelativePath(fileUri);
        this.runCommand("git update-index --skip-worktree " + file);
        vscode.window.showInformationMessage(file + " is skipped from worktree.");
    }

    public noSkipGitWorktree(fileUri) {
        fileUri = this.getSelectedItemUri(fileUri);
        if (!fileUri) return;
        let file = this.getWorkspaceRelativePath(fileUri);
        this.runCommand("git update-index --no-skip-worktree " + file);
        vscode.window.showInformationMessage(file + " is in worktree.");
    }

    public runCommand(command) {
        let data = child.execSync(command, {
            cwd: vscode.workspace.rootPath,
            encoding: 'utf8'
        });
        // console.log(data.toString());
    }

    private getWorkspaceRelativePath(fileUri) {
        let wf = vscode.workspace.getWorkspaceFolder(fileUri);
        let rp = path.relative(wf.uri.fsPath, fileUri.fsPath);
        if (process.platform === "win32") rp = rp.replace(/\\/g,'/');
        return rp;
    }

    public appendGitExcludeUri(fileUri) {
        fileUri = this.getSelectedItemUri(fileUri);
        if (!fileUri) return;
        this.appendGitExclude(this.getWorkspaceRelativePath(fileUri));
    }

    public appendGitExclude(filepath) {
        let file = this.prepareGitExclude();
        if (!file) return;
        fs.appendFileSync(file, "/" + filepath + "\n");
        vscode.window.showInformationMessage(filepath + " is appended.");
        this.openFile(file);
    }

    public openFile(file) {
        vscode.workspace.openTextDocument(file).then(
            doc => { vscode.window.showTextDocument(doc); }
        );
    }

    public editGitExclude() {
        let file = this.prepareGitExclude();
        if (!file) return;
        this.openFile(file);
    }
}