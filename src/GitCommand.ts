'use strict';
import * as child from 'child_process';
import * as os from 'os';
import { getCurrentWorkspaceFolder } from './getFolder';

type ExecFileSync = (
  command: string,
  args: readonly string[],
  options?: child.ExecFileSyncOptionsWithStringEncoding
) => string | Buffer;

export class GitCommand {
  private readonly execFileSyncFn: ExecFileSync;
  private readonly getWorkspaceFolderFn: () => string | undefined;

  constructor(
    execFileSyncFn: ExecFileSync = child.execFileSync,
    getWorkspaceFolderFn: () => string | undefined = getCurrentWorkspaceFolder
  ) {
    this.execFileSyncFn = execFileSyncFn;
    this.getWorkspaceFolderFn = getWorkspaceFolderFn;
  }

  private quoteForPowerShell(value: string): string {
    return `'${value.replace(/'/g, "''")}'`;
  }

  public runCommand(command: string, args: string[] = []): string {
    const workspacePath = this.getWorkspaceFolderFn();
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
      const stdout = this.execFileSyncFn(
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

    const stdout = this.execFileSyncFn(command, args, {
      cwd: workspacePath,
      encoding: 'utf8'
    });
    return stdout.toString();
  }
}
