import * as assert from 'assert';
import { RelativeFile } from '../RelativeFile';

suite('RelativeFile Test Suite', () => {
  test('converts Windows separators to slash style', () => {
    const workspace = {
      uri: { fsPath: 'C:\\repo' }
    } as any;
    const fileUri = { fsPath: 'C:\\repo\\src\\file.ts' } as any;

    const relativeFile = new RelativeFile(workspace, fileUri);

    assert.strictEqual(relativeFile.relativePath, 'src\\file.ts');
    assert.strictEqual(relativeFile.relativeSlashPath, 'src/file.ts');
  });
});
