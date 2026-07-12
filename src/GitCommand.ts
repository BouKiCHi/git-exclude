'use strict';
import * as child from 'child_process';
import * as os from 'os';
import { getCurrentWorkspaceFolder } from './getFolder';

const gitOutputBufferSize = 16 * 1024 * 1024;

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

  private runExecFile(
    command: string,
    args: string[],
    options: child.ExecFileOptionsWithStringEncoding
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      child.execFile(command, args, options, (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(stdout.toString());
      });
    });
  }

  public runCommandAsync(
    command: string,
    args: string[] = [],
    workspacePath = this.getWorkspaceFolderFn()
  ): Promise<string> {
    if (!workspacePath) {
      return Promise.reject(new Error('No workspace folder is available.'));
    }

    if (workspacePath.startsWith('\\')) {
      if (os.platform() !== 'win32') {
        return Promise.reject(
          new Error('Network drive path is not supported outside of Windows')
        );
      }

      const psCommand = `& ${this.quoteForPowerShell(command)} ${args
        .map((arg) => this.quoteForPowerShell(arg))
        .join(' ')}`;
      return this.runExecFile(
        'pwsh',
        [
          '-NoProfile',
          '-NonInteractive',
          '-WorkingDirectory',
          workspacePath,
          '-Command',
          psCommand
        ],
        { encoding: 'utf8', maxBuffer: gitOutputBufferSize }
      );
    }

    return this.runExecFile(command, args, {
      cwd: workspacePath,
      encoding: 'utf8',
      maxBuffer: gitOutputBufferSize
    });
  }

  public runCommand(
    command: string,
    args: string[] = [],
    workspacePath = this.getWorkspaceFolderFn()
  ): string {
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
          encoding: 'utf8',
          maxBuffer: gitOutputBufferSize
        }
      );
      return stdout.toString();
    }

    const stdout = this.execFileSyncFn(command, args, {
      cwd: workspacePath,
      encoding: 'utf8',
      maxBuffer: gitOutputBufferSize
    });
    return stdout.toString();
  }
}
