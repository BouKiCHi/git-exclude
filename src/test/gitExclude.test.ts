import * as assert from 'assert';
import { parseSkippedFiles } from '../GitExclude';

suite('GitExclude Test Suite', () => {
  test('parseSkippedFiles extracts only S-marked entries', () => {
    const input = [
      'H package.json',
      'S src/config/local.json',
      'S src/debug/file with spaces.txt',
      'M src/other.ts',
      'S '
    ].join('\n');

    const actual = parseSkippedFiles(input);

    assert.deepStrictEqual(actual, [
      'src/config/local.json',
      'src/debug/file with spaces.txt'
    ]);
  });
});
