// Spaces, tabs, CR and LF only: `String.prototype.trim` also strips NBSP and the other Unicode spaces.
export function stripNameEdges(name: string): string {
  return name.replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, '');
}
