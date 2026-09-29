// Issue comments past the snapshot's first page, and the open question records among them (.claude/skills/issue-review/references/question-record.md).
const REPOSITORY = 'repository(owner: "MustaMohamed", name: "MoneyApp")';

/** @param {string[]} comments @returns {number} */
export function openQuestions(comments) {
  return comments.filter((c) => c.split('\n')[0].replace(/\r$/, '') === 'Question: open').length;
}

// The number is written into the query text: graphql() sends every variable as a string and issue(number:) takes an Int.
/** @param {(query: string, variables?: object) => any} graphql @param {number} number @param {string} cursor @returns {string[]} */
export function earlierComments(graphql, number, cursor) {
  const pages = [];
  let before = cursor;
  while (before) {
    const data = graphql(
      `query($cursor: String) { ${REPOSITORY} { issue(number: ${number}) { comments(last: 100, before: $cursor) { pageInfo { hasPreviousPage startCursor } nodes { body } } } } }`,
      { cursor: before },
    );
    const page = data.repository.issue.comments;
    pages.unshift(page.nodes.map((k) => k.body));
    before = page.pageInfo.hasPreviousPage ? page.pageInfo.startCursor : null;
  }
  return pages.flat();
}
