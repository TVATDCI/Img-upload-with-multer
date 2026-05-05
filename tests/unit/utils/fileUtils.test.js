import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { deleteFile } from '../../../src/utils/fileUtils.js';

describe('fileUtils.deleteFile', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('deletes an existing file', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'file-utils-'));
    const filePath = path.join(tempDir, 'sample.txt');
    fs.writeFileSync(filePath, 'test');

    deleteFile(filePath);

    expect(fs.existsSync(filePath)).toBe(false);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('does nothing when the file does not exist', () => {
    const unlinkSpy = jest.spyOn(fs, 'unlinkSync');

    deleteFile(path.join(os.tmpdir(), 'missing-file.txt'));

    expect(unlinkSpy).not.toHaveBeenCalled();
  });

  test('logs an error when unlink throws', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {
      throw new Error('permission denied');
    });

    deleteFile('/tmp/protected-file.txt');

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to delete file /tmp/protected-file.txt:',
      'permission denied'
    );
  });
});
