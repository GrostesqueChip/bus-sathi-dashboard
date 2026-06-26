'use client';

import { useMemo } from 'react';

// Minimal, dependency-free, XSS-safe markdown renderer.
// Strategy: escape ALL html first, then inject only our own whitelisted tags.
// Supports: fenced code, inline code, bold, italic, links (http/https only),
// headings, unordered + ordered lists, paragraphs / line breaks.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inline(text: string): string {
  let t = text;
  // links [label](http...)
  t = t.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_m, label, url) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer" class="font-semibold text-indigo-600 underline underline-offset-2 hover:text-indigo-700">${label}</a>`
  );
  // bold **text**
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>');
  // italic *text* or _text_
  t = t.replace(/(^|[^*])\*([^*\n]+)\*([^*]|$)/g, '$1<em>$2</em>$3');
  t = t.replace(/(^|[^_])_([^_\n]+)_([^_]|$)/g, '$1<em>$2</em>$3');
  // inline code `code`
  t = t.replace(
    /`([^`]+)`/g,
    '<code class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.85em] text-slate-800">$1</code>'
  );
  return t;
}

function renderBlocks(src: string): string {
  const lines = src.split('\n');
  const out: string[] = [];
  let list: { type: 'ul' | 'ol'; items: string[] } | null = null;

  const flush = () => {
    if (!list) return;
    const tag = list.type;
    const cls = tag === 'ul' ? 'my-1 ml-4 list-disc space-y-1' : 'my-1 ml-4 list-decimal space-y-1';
    out.push(`<${tag} class="${cls}">${list.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${tag}>`);
    list = null;
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (ul) {
      if (!list || list.type !== 'ul') { flush(); list = { type: 'ul', items: [] }; }
      list.items.push(ul[1]);
    } else if (ol) {
      if (!list || list.type !== 'ol') { flush(); list = { type: 'ol', items: [] }; }
      list.items.push(ol[1]);
    } else if (h) {
      flush();
      out.push(`<div class="mt-2 mb-1 font-bold text-slate-900">${inline(h[2])}</div>`);
    } else if (line.trim() === '') {
      flush();
      out.push('<div class="h-2"></div>');
    } else {
      flush();
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  flush();
  return out.join('');
}

function toHtml(src: string): string {
  const escaped = escapeHtml(src);
  const parts = escaped.split(/```/);
  let html = '';
  parts.forEach((part, i) => {
    if (i % 2 === 1) {
      const code = part.replace(/^[a-zA-Z0-9_-]*\n/, '');
      html += `<pre class="my-2 overflow-x-auto rounded-xl bg-slate-900 p-3 text-[12.5px] leading-5"><code class="font-mono text-slate-100">${code.replace(/\n$/, '')}</code></pre>`;
    } else {
      html += renderBlocks(part);
    }
  });
  return html;
}

export default function Markdown({ content, className }: { content: string; className?: string }) {
  const html = useMemo(() => toHtml(content), [content]);
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
