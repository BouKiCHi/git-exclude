'use strict';

const specialPatternCharacters = new Set([
  '\\',
  '*',
  '?',
  '[',
  ']',
  '#',
  '!',
  ' '
]);

export function createGitExcludeEntry(relativePath: string): string {
  const normalizedPath = relativePath.replace(/\\/g, '/');
  if (
    !normalizedPath ||
    normalizedPath === '.' ||
    /[\r\n]/.test(normalizedPath)
  ) {
    throw new Error('The selected path cannot be represented in exclude.');
  }

  const escapedPath = [...normalizedPath]
    .map((character) =>
      specialPatternCharacters.has(character) ? `\\${character}` : character
    )
    .join('');
  return `/${escapedPath}`;
}

export function hasGitExcludeEntry(content: string, entry: string): boolean {
  return content.split(/\r?\n/).some((line) => line === entry);
}
