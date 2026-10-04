// One ticket body for the board page: which issue the page may ask for, and how its markdown goes through GitHub's renderer.
import { NAME, OWNER } from './board_comments.mjs';

const LT = '';
const ESCAPED_LT = '';

/** @param {unknown} raw @returns {number | null} */
export function issueNumber(raw) {
  return typeof raw === 'string' && /^[1-9]\d{0,6}$/.test(raw) ? Number(raw) : null;
}

/** @param {number} n @returns {string[]} */
export function issueArgs(n) {
  return ['api', `repos/${OWNER}/${NAME}/issues/${n}`];
}

export const MARKDOWN_ARGS = ['api', 'markdown', '--input', '-'];

// GitHub's renderer drops <Month> as an unknown tag, so a < goes in as a private-use character, which passes through prose and code alike.
/** @param {unknown} markdown @returns {string} */
export function maskAngles(markdown) {
  return (typeof markdown === 'string' ? markdown : '')
    .replace(/[]/g, '')
    .replace(/\\<|<(?!https?:\/\/[^\s<>]+>)/g, (m) => (m === '<' ? LT : ESCAPED_LT));
}

// The way back: &lt; everywhere, and inside code the backslash of a \< is text again.
/** @param {string} html @returns {string} */
export function unmaskAngles(html) {
  return html
    .split(/(<pre[\s>][\s\S]*?<\/pre>|<code[\s>][\s\S]*?<\/code>)/)
    .map((part, i) => part.replaceAll(ESCAPED_LT, i % 2 ? '\\&lt;' : '&lt;'))
    .join('')
    .replaceAll(LT, '&lt;')
    .replaceAll('%EE%80%80', '%3C')
    .replaceAll('%EE%80%81', '%5C%3C');
}

/** @param {unknown} markdown @returns {string} */
export function markdownInput(markdown) {
  return JSON.stringify({ text: maskAngles(markdown), mode: 'gfm', context: `${OWNER}/${NAME}` });
}
