import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { parseSkippedFiles } from '../GitExclude';
import {
  chunkPaths,
  countUnmatchedSelections,
  GitExcludeBatch,
  getSelectedUris,
  resolveRepositoryTarget
} from '../GitExcludeBatch';
import {
  createGitExcludeEntry,
  hasGitExcludeEntry
} from '../GitExcludePattern';
import { parseGitFileState } from '../GitFileState';
import { GitCommand } from '../GitCommand';
import {
  resolveGitRepositoryPaths,
  resolveGitRepositoryPathsFromUri
} from '../GitPath';

function createOutputChannelStub(lines: string[] = []): vscode.OutputChannel {
  return {
    name: 'test',
    append: () => undefined,
    appendLine: (value) => {
      lines.push(value);
    },
    replace: () => undefined,
    clear: () => undefined,
    show: () => undefined,
    hide: () => undefined,
    dispose: () => undefined
  };
}

suite('GitExclude Test Suite', () => {
  test('parseSkippedFiles extracts only S-marked entries', () => {
    const input = [
      'H package.json',
      'S src/config/local.json',
      's src/config/other.json',
      'S src/debug/file with spaces.txt',
      'S  leading space.txt',
      'M src/other.ts',
      'S '
    ].join('\n');

    const actual = parseSkippedFiles(input);

    assert.deepStrictEqual(actual, [
      'src/config/local.json',
      'src/config/other.json',
      'src/debug/file with spaces.txt',
      ' leading space.txt'
    ]);
  });

  test('parseGitFileState detects skip-worktree and assume-unchanged', () => {
    assert.deepStrictEqual(parseGitFileState('S src/config.json\n'), {
      isTracked: true,
      isSkipWorktree: true,
      isAssumeUnchanged: false
    });
    assert.deepStrictEqual(parseGitFileState('h src/config.json\n'), {
      isTracked: true,
      isSkipWorktree: false,
      isAssumeUnchanged: true
    });
    assert.deepStrictEqual(parseGitFileState('s src/config.json\n'), {
      isTracked: true,
      isSkipWorktree: true,
      isAssumeUnchanged: true
    });
    assert.deepStrictEqual(parseGitFileState(''), {
      isTracked: false,
      isSkipWorktree: false,
      isAssumeUnchanged: false
    });
  });

  test('getSelectedUris removes duplicate Explorer selections', () => {
    const first = vscode.Uri.file('/workspace/first file.ts');
    const second = vscode.Uri.file('/workspace/second.ts');

    const actual = getSelectedUris(first, [first, first, second]);

    assert.deepStrictEqual(
      actual.map((uri) => uri.toString()),
      [first.toString(), second.toString()]
    );
  });

  test('countUnmatchedSelections supports folders and mixed selections', () => {
    const actual = countUnmatchedSelections(
      ['src', 'README.md', 'untracked.txt'],
      ['src/extension.ts', 'src/test/extension.test.ts', 'README.md']
    );

    assert.strictEqual(actual, 1);
    assert.strictEqual(countUnmatchedSelections(['.'], ['src/extension.ts']), 0);
  });

  test('chunkPaths keeps command arguments below the configured size', () => {
    assert.deepStrictEqual(chunkPaths(['one', 'two', 'three'], 12), [
      ['one', 'two'],
      ['three']
    ]);
  });

  test('createGitExcludeEntry escapes pattern characters and spaces', () => {
    const entry = createGitExcludeEntry('config/file [1]*?.json');

    assert.strictEqual(entry, '/config/file\\ \\[1\\]\\*\\?.json');
    assert.strictEqual(hasGitExcludeEntry(`${entry}\n`, entry), true);
    assert.strictEqual(
      hasGitExcludeEntry('/config/file [1]*?.json\n', entry),
      false
    );
    assert.strictEqual(
      hasGitExcludeEntry(
        '/config/file [1]*?.json\n',
        '/config/file [1]*?.json'
      ),
      true
    );
    assert.strictEqual(hasGitExcludeEntry(`${entry}  \n`, entry), false);
    assert.throws(() => createGitExcludeEntry('.'));
    assert.throws(() => createGitExcludeEntry('line\nbreak'));
  });

  test('resolveRepositoryTarget uses the Git root returned for the file', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'git-exclude-'));
    const repositoryRoot = path.join(tempRoot, 'nested-repository');
    const filePath = path.join(repositoryRoot, 'src', 'file.ts');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, '');

    try {
      const target = await resolveRepositoryTarget(vscode.Uri.file(filePath), {
        runCommandAsync: async (_command, _args, workspacePath) => {
          assert.strictEqual(workspacePath, path.dirname(filePath));
          return `${repositoryRoot}\n`;
        }
      });

      assert.deepStrictEqual(target, {
        root: repositoryRoot,
        relativePath: 'src/file.ts'
      });
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('resolveRepositoryTarget caches files in the same directory', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'git-exclude-'));
    const firstPath = path.join(tempRoot, 'first.ts');
    const secondPath = path.join(tempRoot, 'second.ts');
    fs.writeFileSync(firstPath, '');
    fs.writeFileSync(secondPath, '');
    const cache = new Map<string, Promise<string>>();
    let commandCount = 0;
    const gitCommand = {
      runCommandAsync: async () => {
        commandCount += 1;
        return `${tempRoot}\n`;
      }
    };

    try {
      await resolveRepositoryTarget(vscode.Uri.file(firstPath), gitCommand, cache);
      await resolveRepositoryTarget(vscode.Uri.file(secondPath), gitCommand, cache);
      assert.strictEqual(commandCount, 1);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('resolveGitRepositoryPaths uses the provided workspace path', () => {
    const workspacePath = path.join(os.tmpdir(), 'workspace');
    const gitDir = path.join(workspacePath, '.git');
    const excludePath = path.join(gitDir, 'info', 'exclude');
    const gitCommand: Pick<GitCommand, 'runCommand'> = {
      runCommand: (_command: string, args: string[], passedWorkspacePath?: string) => {
        assert.strictEqual(passedWorkspacePath, workspacePath);
        if (args[1] === '--git-dir') return gitDir;
        if (args[1] === '--git-path') return path.relative(workspacePath, excludePath);
        throw new Error(`Unexpected Git arguments: ${args.join(' ')}`);
      }
    };

    const actual = resolveGitRepositoryPaths(gitCommand, workspacePath);

    assert.deepStrictEqual(actual, {
      gitPath: gitDir,
      gitExcludePath: excludePath
    });
  });

  test('resolveGitRepositoryPathsFromUri resolves from the file directory', () => {
    const filePath = path.join(os.tmpdir(), 'repo', 'nested', 'file.ts');
    const fileDir = path.dirname(filePath);
    const gitDir = path.join(fileDir, '.git');
    const excludePath = path.join(gitDir, 'info', 'exclude');
    const gitCommand: Pick<GitCommand, 'runCommand'> = {
      runCommand: (_command: string, args: string[], passedWorkspacePath?: string) => {
        assert.strictEqual(passedWorkspacePath, fileDir);
        if (args[1] === '--git-dir') return gitDir;
        if (args[1] === '--git-path') return path.relative(fileDir, excludePath);
        throw new Error(`Unexpected Git arguments: ${args.join(' ')}`);
      }
    };

    const actual = resolveGitRepositoryPathsFromUri(
      gitCommand,
      vscode.Uri.file(filePath)
    );

    assert.deepStrictEqual(actual, {
      gitPath: gitDir,
      gitExcludePath: excludePath
    });
  });

  test('GitExcludeBatch expands and updates selected tracked files', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'git-exclude-'));
    const sourceDirectory = path.join(tempRoot, 'src');
    const firstPath = path.join(sourceDirectory, 'first.ts');
    const secondPath = path.join(sourceDirectory, 'second.ts');
    fs.mkdirSync(sourceDirectory, { recursive: true });
    fs.writeFileSync(firstPath, '');
    fs.writeFileSync(secondPath, '');
    let updateArguments: readonly string[] | undefined;
    const gitCommand = { runCommandAsync: async (_command: string, args: string[]) => {
      if (args.includes('--show-toplevel')) return `${tempRoot}\n`;
      if (args.includes('ls-files')) return 'src/first.ts\0src/second.ts\0';
      if (args.includes('update-index')) {
        updateArguments = args;
        return '';
      }
      throw new Error(`Unexpected Git arguments: ${args.join(' ')}`);
    } };

    try {
      await new GitExcludeBatch(createOutputChannelStub(), gitCommand).updateIndex(
        [vscode.Uri.file(firstPath), vscode.Uri.file(secondPath)],
        '--skip-worktree'
      );

      assert.deepStrictEqual(updateArguments, [
        'update-index',
        '--skip-worktree',
        '--',
        'src/first.ts',
        'src/second.ts'
      ]);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('GitExcludeBatch writes to the shared worktree exclude path', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'git-exclude-'));
    const filePath = path.join(tempRoot, 'file [1]*?.json');
    const worktreeGitPath = path.join(
      tempRoot,
      '.git',
      'worktrees',
      'linked'
    );
    const excludePath = path.join(tempRoot, '.git', 'info', 'exclude');
    fs.mkdirSync(worktreeGitPath, { recursive: true });
    fs.mkdirSync(path.dirname(excludePath), { recursive: true });
    fs.writeFileSync(filePath, '');
    const gitCommand = { runCommandAsync: async (_command: string, args: string[]) => {
      if (args.includes('--show-toplevel')) return `${tempRoot}\n`;
      if (args.includes('--git-dir')) return `${worktreeGitPath}\n`;
      if (args.includes('--git-path')) return `${excludePath}\n`;
      throw new Error(`Unexpected Git arguments: ${args.join(' ')}`);
    } };

    try {
      await new GitExcludeBatch(
        createOutputChannelStub(),
        gitCommand
      ).appendToExclude([vscode.Uri.file(filePath)]);

      assert.strictEqual(
        fs.readFileSync(excludePath, 'utf8'),
        '/file\\ \\[1\\]\\*\\?.json\n'
      );
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('GitExcludeBatch processes separate repositories independently', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'git-exclude-'));
    const firstRoot = path.join(tempRoot, 'first');
    const secondRoot = path.join(tempRoot, 'second');
    const firstPath = path.join(firstRoot, 'file.ts');
    const secondPath = path.join(secondRoot, 'file.ts');
    fs.mkdirSync(firstRoot, { recursive: true });
    fs.mkdirSync(secondRoot, { recursive: true });
    fs.writeFileSync(firstPath, '');
    fs.writeFileSync(secondPath, '');
    const updatedRoots: string[] = [];
    const gitCommand = {
      runCommandAsync: async (
        _command: string,
        args: string[],
        workspacePath?: string
      ) => {
        if (args.includes('--show-toplevel')) return `${workspacePath}\n`;
        if (args.includes('ls-files')) return 'file.ts\0';
        if (args.includes('update-index')) {
          updatedRoots.push(workspacePath ?? '');
          return '';
        }
        throw new Error(`Unexpected Git arguments: ${args.join(' ')}`);
      }
    };

    try {
      await new GitExcludeBatch(
        createOutputChannelStub(),
        gitCommand
      ).updateIndex(
        [vscode.Uri.file(firstPath), vscode.Uri.file(secondPath)],
        '--skip-worktree'
      );

      assert.deepStrictEqual(updatedRoots.sort(), [firstRoot, secondRoot].sort());
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('GitExcludeBatch continues after a chunk fails', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'git-exclude-'));
    const selectedDirectory = path.join(tempRoot, 'src');
    fs.mkdirSync(selectedDirectory, { recursive: true });
    const trackedFiles = [
      `src/${'a'.repeat(6000)}`,
      `src/${'b'.repeat(6000)}`,
      `src/${'c'.repeat(6000)}`
    ];
    const outputLines: string[] = [];
    let updateCount = 0;
    const gitCommand = {
      runCommandAsync: async (_command: string, args: string[]) => {
        if (args.includes('--show-toplevel')) return `${tempRoot}\n`;
        if (args.includes('ls-files')) return `${trackedFiles.join('\0')}\0`;
        if (args.includes('update-index')) {
          updateCount += 1;
          if (updateCount === 2) throw new Error('chunk failed');
          return '';
        }
        throw new Error(`Unexpected Git arguments: ${args.join(' ')}`);
      }
    };

    try {
      await new GitExcludeBatch(
        createOutputChannelStub(outputLines),
        gitCommand
      ).updateIndex(
        [vscode.Uri.file(selectedDirectory)],
        '--skip-worktree'
      );

      assert.strictEqual(updateCount, 3);
      assert.strictEqual(
        outputLines.some((line) => line.includes('chunk failed')),
        true
      );
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
