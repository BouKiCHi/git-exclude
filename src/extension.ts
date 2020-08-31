'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as child from 'child_process';
import { runInThisContext } from 'vm';

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand('GitExclude.editGitExclude', () => {
        (new GitExclude()).editGitExclude();
    }));
    
    // explorer
    context.subscriptions.push(vscode.commands.registerCommand('GitExclude.appendGitExcludeUri', (fileUri) => {
        (new GitExclude()).appendGitExcludeUri(fileUri);
    }));

    // skip-worktree 
    context.subscriptions.push(vscode.commands.registerCommand('GitExclude.skipGitWorktreeUri', (fileUri) => {
        (new GitExclude()).setSkipGitWorktree(fileUri);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('GitExclude.noSkipGitWorktreeUri', (fileUri) => {
        (new GitExclude()).setNoSkipGitWorktree(fileUri);
    }));

    // assume-unchanged
    context.subscriptions.push(vscode.commands.registerCommand('GitExclude.setAssumeUnchangedUri', (fileUri) => {
        (new GitExclude()).setAssumeUnchangedGitWorktree(fileUri);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('GitExclude.noAssumeUnchangedUri', (fileUri) => {
        (new GitExclude()).setNoAssumeUnchangedGitWorktree(fileUri);
    }));


    // SCM
    context.subscriptions.push(vscode.commands.registerCommand('GitExclude.appendGitExcludeUriSCM', (state) => {
        (new GitExclude()).appendGitExcludeUri(state.resourceUri);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('GitExclude.skipGitWorktreeUriSCM', (state) => {
        (new GitExclude()).setSkipGitWorktree(state.resourceUri);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('GitExclude.setAssumeUnchangedSCM', (state) => {
        (new GitExclude()).setAssumeUnchangedGitWorktree(state.resourceUri);
    }));
}

// this method is called when your extension is deactivated
export function deactivate() {
}

class GitExclude {

    private getGitExcludePath() : string {
        var gitPath = this.getGitPath();
        return path.join(gitPath,"info","exclude");
    }

    private getGitPath() : string {
        var path = this.runCommand("git rev-parse --git-dir");
        return path.trim();
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

    public setAssumeUnchangedGitWorktree(fileUri) {
        fileUri = this.getSelectedItemUri(fileUri);
        if (!fileUri) return;
        let file = this.getWorkspaceRelativePath(fileUri);
        this.runCommand("git update-index --assume-unchanged " + file);
        var text = "{file} is assumed to be unchanged.".replace("{file}", file);
        vscode.window.showInformationMessage(text);
    }

    public setNoAssumeUnchangedGitWorktree(fileUri) {
        fileUri = this.getSelectedItemUri(fileUri);
        if (!fileUri) return;
        let file = this.getWorkspaceRelativePath(fileUri);
        this.runCommand("git update-index --no-assume-unchanged " + file);
        var text = "{file} is restored from the state assumed to be unchanged.".replace("{file}", file);
        vscode.window.showInformationMessage(text);
    }


    public setSkipGitWorktree(fileUri) {
        fileUri = this.getSelectedItemUri(fileUri);
        if (!fileUri) return;
        let file = this.getWorkspaceRelativePath(fileUri);
        this.runCommand("git update-index --skip-worktree " + file);

        let text = `${file} is skipping file changes in the local repository.`;
        vscode.window.showInformationMessage(text);
    }

    public setNoSkipGitWorktree(fileUri) {
        fileUri = this.getSelectedItemUri(fileUri);
        if (!fileUri) return;
        let file = this.getWorkspaceRelativePath(fileUri);
        this.runCommand("git update-index --no-skip-worktree " + file);
        let text = `${file} is restored from skipping file changes in the local repository.`;
        vscode.window.showInformationMessage(text);
    }

    public runCommand(command) : string {
        let stdout = child.execSync(command, {
            cwd: vscode.workspace.rootPath,
            encoding: 'utf8'
        });

        return stdout.toString();
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