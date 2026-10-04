// One ticket body for the board page: which issue the page may ask for, how its markdown goes to GitHub's renderer, and what the page gets back.
import { NAME, OWNER } from './board_comments.mjs';

/** @param {unknown} raw @returns {number | null} */
export function issueNumber(raw) {
  return typeof raw === 'string' && /^[1-9]\d{0,6}$/.test(raw) ? Number(raw) : null;
}

/** @param {number} n @returns {string[]} */
export function issueArgs(n) {
  return ['api', `repos/${OWNER}/${NAME}/issues/${n}`];
}

export const MARKDOWN_ARGS = ['api', 'markdown', '--input', '-'];

// GitHub's renderer drops <Month> as an unknown tag, so every < outside code and autolinks goes in as text.
/** @param {unknown} markdown @returns {string} */
export function keepPlaceholders(markdown) {
  /** @type {string | null} */
  let fence = null;
  return (typeof markdown === 'string' ? markdown : '')
    .split('\n')
    .map((line) => {
      const mark = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
      if (fence) {
        const closes = mark && mark[0] === fence[0] && mark.length >= fence.length;
        if (closes && line.trim() === mark) fence = null;
        return line;
      }
      if (mark) {
        fence = mark;
        return line;
      }
      return line.replace(/(`+)(?:.*?[^`])?\1(?!`)|<(?!https?:\/\/[^\s>]+>)/g, (m) =>
        m === '<' ? '&lt;' : m,
      );
    })
    .join('\n');
}

/** @param {unknown} markdown @returns {string} */
export function markdownInput(markdown) {
  return JSON.stringify({
    text: keepPlaceholders(markdown),
    mode: 'gfm',
    context: `${OWNER}/${NAME}`,
  });
}

/** @param {Record<string, unknown>} api @param {string} html */
export function issueView(api, html) {
  return {
    number: api.number,
    title: api.title ?? '',
    state: api.state ?? null,
    url: api.html_url ?? null,
    updatedAt: api.updated_at ?? null,
    isPull: Boolean(api.pull_request),
    html,
  };
}
