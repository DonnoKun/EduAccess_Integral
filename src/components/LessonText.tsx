import { Fragment, type ReactNode } from 'react';

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : <Fragment key={i}>{part.replace(/\*\*/g, '')}</Fragment>);
}

/** Renders the small markdown subset AI lessons use (headings, bullet lists, bold) without raw symbols. */
export default function LessonText({ text, className = '' }: { text: string; className?: string }) {
  const blocks: ReactNode[] = [];
  let para: string[] = [];
  let list: string[] = [];
  const flush = () => {
    if (para.length) { blocks.push(<p key={blocks.length} className="lesson-text break-words">{inline(para.join(' '))}</p>); para = []; }
    if (list.length) { blocks.push(<ul key={blocks.length} className="list-disc space-y-2 pl-6">{list.map((li, i) => <li key={i} className="lesson-text break-words">{inline(li)}</li>)}</ul>); list = []; }
  };
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    const bullet = line.match(/^[-*+]\s+(.*)$/);
    if (!line) { flush(); continue; }
    if (heading) { flush(); blocks.push(<h3 key={blocks.length} className="font-semibold break-words">{inline(heading[1])}</h3>); continue; }
    if (bullet) { if (para.length) { const l = list; list = []; flush(); list = l; } list.push(bullet[1]); continue; }
    if (list.length) flush();
    para.push(line);
  }
  flush();
  return <div className={`space-y-3 min-w-0 ${className}`}>{blocks}</div>;
}
