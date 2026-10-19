import {createHash} from 'node:crypto';

// Content-based versions stay stable between builds and change with the CSS bytes.
export function versionStylesheet(html, css) {
  const reference = /href="styles\.css(?:\?v=[a-f0-9]+)?"/g;
  if ([...html.matchAll(reference)].length !== 1) {
    throw new Error('Expected exactly one styles.css reference in the generated HTML');
  }
  const version = createHash('sha256').update(css).digest('hex').slice(0, 12);
  return html.replace(reference, `href="styles.css?v=${version}"`);
}
