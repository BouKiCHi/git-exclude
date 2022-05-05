'use strict';
import * as child from 'child_process';
import { getCurrentWorkspaceFolder } from './getFolder';



export class GitCommand {
    constructor() { }

    public runCommand(command): string {
        let path = getCurrentWorkspaceFolder();

        let stdout = child.execSync(command, {
            cwd: path,
            encoding: 'utf8'
        });

        return stdout.toString();
    }
}
