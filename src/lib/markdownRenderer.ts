/* ─── Markdown renderer with math + ASCII support ─── */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderSlideMarkdown(text: string): string {
  if (!text) return '';

  // Process block math $$...$$ first
  let processed = text.replace(/\$\$([^$]+)\$\$/g, (_m, eq: string) =>
    `<div class="math-block">${escapeHtml(eq.trim())}</div>`
  );
  // Process inline math $...$
  processed = processed.replace(/\$([^$\n]+)\$/g, (_m, eq: string) =>
    `<span class="math-inline">${escapeHtml(eq.trim())}</span>`
  );

  const lines = processed.split('\n');
  const html: string[] = [];
  let inUl = false;
  let inParagraph = false;
  let inCode = false;
  const codeLines: string[] = [];

  const closeParagraph = () => { if (inParagraph) { html.push('</p>'); inParagraph = false; } };
  const closeList = () => { if (inUl) { html.push('</ul>'); inUl = false; } };

  const inlineFormat = (line: string) =>
    line
      .replace(/\*\*(.+?)\*\*/g, (_m, c: string) => `<strong>${escapeHtml(c)}</strong>`)
      .replace(/\*(.+?)\*/g, (_m, c: string) => `<em>${escapeHtml(c)}</em>`)
      .replace(/`(.+?)`/g, (_m, c: string) => `<code>${escapeHtml(c)}</code>`);

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    // Code block fences
    if (/^```/.test(line)) {
      if (!inCode) {
        closeParagraph(); closeList();
        inCode = true;
        codeLines.length = 0;
      } else {
        inCode = false;
        html.push(`<pre class="ascii-block">${escapeHtml(codeLines.join('\n'))}</pre>`);
      }
      continue;
    }
    if (inCode) { codeLines.push(line); continue; }

    if (/^## (.+)/.test(line)) {
      closeParagraph(); closeList();
      html.push(`<h2>${inlineFormat(line.replace(/^## /, ''))}</h2>`);
      continue;
    }
    if (/^### (.+)/.test(line)) {
      closeParagraph(); closeList();
      html.push(`<h3>${inlineFormat(line.replace(/^### /, ''))}</h3>`);
      continue;
    }
    if (/^# (.+)/.test(line)) {
      closeParagraph(); closeList();
      html.push(`<h2>${inlineFormat(line.replace(/^# /, ''))}</h2>`);
      continue;
    }
    if (/^[-*] (.+)/.test(line)) {
      closeParagraph();
      if (!inUl) { html.push('<ul>'); inUl = true; }
      html.push(`<li>${inlineFormat(line.replace(/^[-*] /, ''))}</li>`);
      continue;
    }
    if (/^\d+\. (.+)/.test(line)) {
      closeParagraph();
      if (!inUl) { html.push('<ul>'); inUl = true; }
      html.push(`<li>${inlineFormat(line.replace(/^\d+\. /, ''))}</li>`);
      continue;
    }
    if (line.trim() === '') { closeParagraph(); closeList(); continue; }
    closeList();
    if (!inParagraph) { html.push('<p>'); inParagraph = true; }
    else html.push(' ');
    html.push(inlineFormat(line));
  }
  closeParagraph(); closeList();
  if (inCode) html.push(`<pre class="ascii-block">${escapeHtml(codeLines.join('\n'))}</pre>`);

  return html.join('');
}

export { escapeHtml };