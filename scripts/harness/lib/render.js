const fs = require('node:fs');
const { resolveInside } = require('./paths');

const SECTION_START = /^<!-- harness:section ([A-Za-z0-9_-]+) -->$/;
const SECTION_START_PREFIX = '<!-- harness:section';
const SECTION_END = '<!-- harness:endsection -->';
const SECTION_END_PREFIX = '<!-- harness:endsection';

function extractSection(text, name) {
  const sections = new Map();
  let current;

  for (const line of text.split(/\r?\n/)) {
    const start = SECTION_START.exec(line);
    if (start) {
      const sectionName = start[1];
      if (current) throw new Error(`nested section: ${sectionName}`);
      if (sections.has(sectionName)) throw new Error(`duplicate section: ${sectionName}`);
      current = { name: sectionName, lines: [] };
      continue;
    }
    if (line === SECTION_END) {
      if (!current) throw new Error('unexpected end section');
      sections.set(current.name, `${current.lines.join('\n').trim()}\n`);
      current = undefined;
      continue;
    }
    if (line.includes(SECTION_START_PREFIX) || line.includes(SECTION_END_PREFIX)) {
      throw new Error('malformed section marker');
    }
    if (current) current.lines.push(line);
  }

  if (current) throw new Error(`missing end section: ${current.name}`);
  if (!sections.has(name)) throw new Error(`missing section: ${name}`);
  return sections.get(name);
}

function read(root, relativePath) {
  return fs.readFileSync(resolveInside(root, relativePath), 'utf8');
}

function unresolvedPlaceholder(target) {
  throw new Error(`${target.id}: unresolved placeholder`);
}

function renderPlaceholder(root, target, variables, declared, included, body) {
  const include = /^include:([^#{}\r\n]+)(?:#([A-Za-z0-9_-]+))?$/.exec(body);
  if (include) {
    const [, sourcePath, section] = include;
    if (!declared.has(sourcePath)) {
      throw new Error(`${target.id}: undeclared include ${sourcePath}`);
    }
    if (included.has(sourcePath)) {
      throw new Error(`${target.id}: duplicate include ${sourcePath}`);
    }
    included.add(sourcePath);
    const text = read(root, sourcePath);
    return section ? extractSection(text, section) : text;
  }
  if (body.startsWith('include:')) unresolvedPlaceholder(target);

  const variable = /^(raw|json):([^{}\r\n]+)$/.exec(body);
  if (variable) {
    const [, mode, key] = variable;
    if (!Object.hasOwn(variables, key)) {
      throw new Error(`${target.id}: missing variable ${key}`);
    }
    const value = String(variables[key]);
    return mode === 'json' ? JSON.stringify(value) : value;
  }

  unresolvedPlaceholder(target);
}

function renderTemplate(root, target, variables, declared, included, template) {
  let cursor = 0;
  let output = '';

  while (cursor < template.length) {
    const start = template.indexOf('{{', cursor);
    const strayEnd = template.indexOf('}}', cursor);
    if (strayEnd !== -1 && (start === -1 || strayEnd < start)) {
      unresolvedPlaceholder(target);
    }
    if (start === -1) {
      output += template.slice(cursor);
      break;
    }

    output += template.slice(cursor, start);
    const end = template.indexOf('}}', start + 2);
    const nestedStart = template.indexOf('{{', start + 2);
    if (end === -1 || (nestedStart !== -1 && nestedStart < end)) {
      unresolvedPlaceholder(target);
    }
    const body = template.slice(start + 2, end);
    output += renderPlaceholder(root, target, variables, declared, included, body);
    cursor = end + 2;
  }

  return output;
}

function renderTarget(root, notice, target) {
  const declared = new Set(target.sources);
  const included = new Set();
  const variables = { notice, ...(target.variables || {}) };
  const template = read(root, target.template);
  const output = renderTemplate(root, target, variables, declared, included, template);

  for (const sourcePath of declared) {
    if (!included.has(sourcePath)) {
      throw new Error(`${target.id}: missing include ${sourcePath}`);
    }
  }

  return output.endsWith('\n') ? output : `${output}\n`;
}

function renderAll(root, manifest) {
  return new Map(
    manifest.targets.map((target) => [
      target.path,
      renderTarget(root, manifest.generatedNotice, target),
    ]),
  );
}

module.exports = { extractSection, renderAll, renderTarget };
