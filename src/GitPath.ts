'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { GitCommand } from './GitCommand';
import { getCurrentWorkspaceFolder } from './getFolder';

export class GitPath {
    gitCommand: GitCommand;
    gitPath: string | undefined;
    gitExcludePath: string | undefined;

    constructor(gitCommand) {
        this.gitCommand = gitCommand;
        this.gitPath = this.getGitPath();
        this.gitExcludePath = this.getGitExcludePath();
    }

    private getGitExcludePath(): string | undefined {
        if (!this.gitPath) return undefined;
        return path.join(this.gitPath, "info", "exclude");
    }

    private getGitPath(): string | undefined {
        var gitPath = this.gitCommand.runCommand("git rev-parse --git-dir");
        if (!gitPath) return undefined;
        var wf = getCurrentWorkspaceFolder();
        return path.resolve(wf, gitPath).trim();
    }

    public prepareGitExclude(): string | null {
        if (!fs.existsSync(this.gitPath)) {
            vscode.window.showInformationMessage("Not git repository.");
            return null;
        }

        let exclude = this.gitExcludePath;
        let gitInfoDir = path.dirname(exclude);

        // infoディレクトリ、無ければ作成
        if (!fs.existsSync(gitInfoDir)) fs.mkdirSync(gitInfoDir);

        if (!fs.existsSync(exclude)) {
            fs.writeFileSync(exclude, "", 'utf-8');
            vscode.window.showInformationMessage("Create new Exclude file.");
        }

        return exclude;
    }
}
