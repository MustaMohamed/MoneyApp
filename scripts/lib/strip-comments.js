// Lines are blanked, not dropped, so line numbers stay valid; backtick quote state spans lines.
function stripComments(lines) {
  let inBlockComment = false;
  let quote = null;
  return lines.map((line) => {
    let result = '';
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inBlockComment) {
        if (ch === '*' && line[i + 1] === '/') {
          inBlockComment = false;
          i++;
        }
        continue;
      }
      if (quote) {
        result += ch;
        if (ch === '\\' && i + 1 < line.length) {
          result += line[i + 1];
          i++;
          continue;
        }
        if (ch === quote) quote = null;
        continue;
      }
      if (ch === "'" || ch === '"' || ch === '`') {
        quote = ch;
        result += ch;
        continue;
      }
      if (ch === '/' && line[i + 1] === '/') break;
      if (ch === '/' && line[i + 1] === '*') {
        inBlockComment = true;
        i++;
        continue;
      }
      result += ch;
    }
    if (quote !== '`') quote = null;
    return result;
  });
}

module.exports = { stripComments };
