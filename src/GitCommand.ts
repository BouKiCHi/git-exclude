'use strict';
import * as child from 'child_process';
import * as os from 'os';
import { getCurrentWorkspaceFolder } from './getFolder';

export class GitCommand {
  constructor() {}

  private quoteForPowerShell(value: string): string {
    return `'${value.replace(/'/g, "''")}'`;
  }

  public runCommand(command: string, args: string[] = []): string {
    const workspacePath = getCurrentWorkspaceFolder();
    if (!workspacePath) {
      throw new Error('No workspace folder is available.');
    }

    // ネットワークドライブ (UNC) は PowerShell の WorkingDirectory を使って実行する。
    if (workspacePath.startsWith('\\')) {
      if (os.platform() !== 'win32') {
        throw new Error('Network drive path is not supported outside of Windows');
      }

      const psCommand = `& ${this.quoteForPowerShell(command)} ${args
        .map((arg) => this.quoteForPowerShell(arg))
        .join(' ')}`;
      const stdout = child.execFileSync(
        'pwsh',
        [
          '-NoProfile',
          '-NonInteractive',
          '-WorkingDirectory',
          workspacePath,
          '-Command',
          psCommand
        ],
        {
          encoding: 'utf8'
        }
      );
      return stdout.toString();
    }

    const stdout = child.execFileSync(command, args, {
      cwd: workspacePath,
      encoding: 'utf8'
    });
    return stdout.toString();
  }
}
