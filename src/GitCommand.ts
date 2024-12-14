'use strict';
import * as child from 'child_process';
import { getCurrentWorkspaceFolder } from './getFolder';
const os = require('os');


export class GitCommand {
    constructor() { }

    public runCommand(command): string {
        const path = getCurrentWorkspaceFolder();

        // ネットワークドライブ
        if (path.startsWith('\\')) {
            const platform = os.platform();
            if (platform != 'win32') {
                throw new Error('Network drive path is not supported outside of Windows');
            }

            const pwshCommand = `pwsh -WorkingDirectory ${path} -Command ${command}`
            const stdout = child.execSync(pwshCommand, {
                encoding: 'utf8'
            });
            return stdout.toString();
        }

        // 通常動作
        const stdout = child.execSync(command, {
            cwd: path,
            encoding: 'utf8'
        });
        return stdout.toString();
    }
}
