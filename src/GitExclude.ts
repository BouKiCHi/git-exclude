'use strict';
import * as vscode from 'vscode';
import * as fs from 'fs';
import { GitCommand } from './GitCommand';
import { FileItem } from './FileItem';
import { GitPath } from './GitPath';

export class GitExclude {
    gitCommand: GitCommand;
    fileItem: FileItem;
    output: vscode.OutputChannel;

    constructor(fileUri? : vscode.Uri, output?: vscode.OutputChannel) {
        this.fileItem = new FileItem(fileUri);
        this.gitCommand = new GitCommand(); 
        this.output = output;
    }

    // git ls-files -v
    public showFileStatus() {
        let file = this.fileItem.file.relativeSlashPath;
        let command = 'git ls-files -v ' + file;
        let result = this.gitCommand.runCommand(command);
        let output = this.output;
        output.appendLine(`>${command}`);
        output.appendLine(result);
        output.show();
    }

    // git update-index --assume-unchanged 
    public setAssumeUnchangedGitWorktree() {
        let file = this.fileItem.file.relativeSlashPath;
        this.gitCommand.runCommand("git update-index --assume-unchanged " + file);
        let text = "{file} is assumed to be unchanged.".replace("{file}", file);
        vscode.window.showInformationMessage(text);
    }

    // git update-index --no-assume-unchanged 
    public setNoAssumeUnchangedGitWorktree() {
        let file = this.fileItem.file.relativeSlashPath;
        this.gitCommand.runCommand("git update-index --no-assume-unchanged " + file);
        let text = "{file} is restored from the state assumed to be unchanged.".replace("{file}", file);
        vscode.window.showInformationMessage(text);
    }

    // git update-index --skip-worktree
    public setSkipGitWorktree() {
        let file = this.fileItem.file.relativeSlashPath;
        this.gitCommand.runCommand("git update-index --skip-worktree " + file);
        let text = `${file} is skipping file changes in the local repository.`;
        vscode.window.showInformationMessage(text);
    }

    // git update-index --no-skip-worktree 
    public setNoSkipGitWorktree() {
        let file = this.fileItem.file.relativeSlashPath;
        this.gitCommand.runCommand("git update-index --no-skip-worktree " + file);
        let text = `${file} is restored from skipping file changes in the local repository.`;
        vscode.window.showInformationMessage(text);
    }

    public appendGitExcludeUri() {
        let gp = new GitPath(this.gitCommand);

        let file = this.fileItem.file.relativeSlashPath;

        let exclude = gp.prepareGitExclude();
        if (!exclude) return;
        fs.appendFileSync(exclude, "/" + file + "\n");
        vscode.window.showInformationMessage(file + " is appended.");
        this.openFile(exclude);
    }

    public openFile(file) {
        vscode.workspace.openTextDocument(file).then(
            doc => { vscode.window.showTextDocument(doc); }
        );
    }

    public editGitExclude() {
        let gp = new GitPath(this.gitCommand);
        let file = gp.prepareGitExclude();
        if (!file) return;
        this.openFile(file);
    }
}
