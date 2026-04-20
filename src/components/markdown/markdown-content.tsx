import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

type MarkdownContentProps = {
  content: string
  className?: string
  tone?: 'default' | 'inverted'
}

function buildComponents(tone: MarkdownContentProps['tone']): Components {
  const isInverted = tone === 'inverted'
  const mutedText = isInverted ? 'text-primary-foreground/80' : 'text-muted-foreground'
  const border = isInverted ? 'border-primary-foreground/25' : 'border-border'
  const softBackground = isInverted ? 'bg-primary-foreground/10' : 'bg-slate-50'

  return {
    a({ children, node: _node, ...props }) {
      return (
        <a
          {...props}
          className={`font-medium underline underline-offset-2 ${
            isInverted ? 'text-primary-foreground' : 'text-pink-700'
          }`}
          rel="noreferrer"
          target="_blank"
        >
          {children}
        </a>
      )
    },
    blockquote({ children }) {
      return (
        <blockquote className={`my-3 border-l-2 ${border} pl-3 italic ${mutedText}`}>
          {children}
        </blockquote>
      )
    },
    code({ children, className, node: _node, ...props }) {
      const languageMatch = /language-(\w+)/.exec(className ?? '')
      return (
        <code
          {...props}
          className={
            languageMatch
              ? `block overflow-x-auto whitespace-pre rounded-md ${softBackground} px-3 py-2 font-mono text-xs leading-5`
              : `rounded ${softBackground} px-1.5 py-0.5 font-mono text-[0.85em]`
          }
        >
          {children}
        </code>
      )
    },
    h1({ children }) {
      return <h1 className="mb-2 mt-4 text-xl font-semibold leading-tight">{children}</h1>
    },
    h2({ children }) {
      return <h2 className="mb-2 mt-4 text-lg font-semibold leading-tight">{children}</h2>
    },
    h3({ children }) {
      return <h3 className="mb-2 mt-3 text-base font-semibold leading-tight">{children}</h3>
    },
    hr() {
      return <hr className={`my-4 ${border}`} />
    },
    input({ node: _node, ...props }) {
      return (
        <input
          {...props}
          className="mr-2 h-3.5 w-3.5 rounded border-border text-primary"
          disabled
          type="checkbox"
        />
      )
    },
    li({ children }) {
      return <li className="my-1 pl-1">{children}</li>
    },
    ol({ children }) {
      return <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>
    },
    p({ children }) {
      return <p className="my-2 leading-6">{children}</p>
    },
    pre({ children }) {
      return <pre className="my-3 overflow-x-auto rounded-md text-left">{children}</pre>
    },
    table({ children }) {
      return (
        <table className={`my-3 block w-full overflow-x-auto rounded-md border ${border} text-left text-sm`}>
          {children}
        </table>
      )
    },
    tbody({ children }) {
      return <tbody className="divide-y divide-border">{children}</tbody>
    },
    td({ children }) {
      return <td className={`border-r ${border} px-3 py-2 last:border-r-0`}>{children}</td>
    },
    th({ children }) {
      return (
        <th className={`border-r ${border} ${softBackground} px-3 py-2 font-semibold last:border-r-0`}>
          {children}
        </th>
      )
    },
    thead({ children }) {
      return <thead className={`border-b ${border}`}>{children}</thead>
    },
    ul({ children }) {
      return <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>
    },
  }
}

export function MarkdownContent({
  content,
  className = '',
  tone = 'default',
}: MarkdownContentProps) {
  if (!content.trim()) return null

  return (
    <div
      className={`markdown-content min-w-0 text-sm leading-6 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 ${className}`}
    >
      <ReactMarkdown
        components={buildComponents(tone)}
        remarkPlugins={[remarkGfm]}
        skipHtml
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

export function getMarkdownPlainTextPreview(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, ' code block ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^[\s-]*\[[ xX]\]\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/[*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
