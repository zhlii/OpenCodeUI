import { memo, useMemo, useSyncExternalStore } from 'react'
import { useSyntaxHighlight } from '../hooks/useSyntaxHighlight'
import { themeStore } from '../store/themeStore'
import { CopyButton } from './ui'
import { useInView } from '../hooks/useInView'

interface CodeBlockProps {
  code: string
  language?: string
  className?: string
  style?: React.CSSProperties
  /** 是否显示语言标签和复制按钮的 header */
  showHeader?: boolean
  /** 最大高度 */
  maxHeight?: number
  /** 长行自动换行 */
  wordwrap?: boolean
}

export const CodeBlock = memo(function CodeBlock({
  code,
  language,
  className = '',
  style,
  showHeader = true,
  maxHeight,
  wordwrap,
}: CodeBlockProps) {
  const { codeWordWrap } = useSyncExternalStore(themeStore.subscribe, themeStore.getSnapshot)
  const resolvedWordWrap = wordwrap ?? codeWordWrap

  // Lazy load highlighting when close to viewport
  const { ref, inView } = useInView({ triggerOnce: true, rootMargin: '200px' })

  // Auto-detect tree structure if language is missing or text
  const effectiveLanguage = useMemo(() => {
    if (language && language !== 'text') return language

    // Check for tree structure characters
    if (code.includes('├──') || code.includes('└──') || (code.includes('│') && code.includes('──'))) {
      return 'yaml' // YAML formatting often looks good for trees
    }

    return language || 'text'
  }, [code, language])

  const { output: html } = useSyntaxHighlight(code, { lang: effectiveLanguage, enabled: inView })

  const containerStyle = maxHeight ? { ...style, maxHeight } : style

  if (!showHeader) {
    // 无 header 的紧凑模式
    return (
      <div
        ref={ref}
        className={`rounded-lg overflow-hidden bg-bg-300/50 contain-content ${className}`}
        style={containerStyle}
      >
        <div
          className={
            resolvedWordWrap ? 'overflow-y-auto overflow-x-hidden custom-scrollbar' : 'overflow-auto custom-scrollbar'
          }
          style={maxHeight ? { maxHeight } : undefined}
        >
          {!html ? (
            <pre
              className={`p-2 m-0 font-mono text-text-200 text-xs leading-relaxed ${
                resolvedWordWrap ? 'whitespace-pre-wrap break-words [overflow-wrap:anywhere]' : ''
              }`}
            >
              <code>{code}</code>
            </pre>
          ) : (
            <div
              className={`shiki-wrapper text-xs leading-relaxed [&_pre]:p-2 [&_pre]:m-0 [&_pre]:bg-transparent! [&_code]:font-mono ${
                resolvedWordWrap
                  ? '[&_pre]:!whitespace-pre-wrap [&_pre]:break-words [&_pre]:[overflow-wrap:anywhere] [&_code]:!whitespace-pre-wrap [&_code]:break-words [&_code]:[overflow-wrap:anywhere]'
                  : ''
              }`}
              suppressHydrationWarning
              dangerouslySetInnerHTML={{ __html: html as string }}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={ref}
      className={`rounded-lg overflow-hidden border border-border-200/50 bg-bg-300 w-full max-w-full flex flex-col contain-content ${className}`}
      style={style}
    >
      {/* Header with Language and Copy */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-bg-200/50 border-b border-border-200/50 select-none">
        <span className="text-xs text-text-400 font-medium uppercase tracking-wider">{language || 'text'}</span>
        <CopyButton text={code} position="static" className="!p-1" />
      </div>

      {/* Scrollable Content */}
      <div
        className={
          resolvedWordWrap ? 'overflow-y-auto overflow-x-hidden custom-scrollbar' : 'overflow-auto custom-scrollbar'
        }
        style={maxHeight ? { maxHeight } : undefined}
      >
        {!html ? (
          <pre
            className={`p-3 m-0 font-mono text-text-200 text-xs ${
              resolvedWordWrap ? 'whitespace-pre-wrap break-words [overflow-wrap:anywhere]' : ''
            }`}
          >
            <code>{code}</code>
          </pre>
        ) : (
          <div
            className={`shiki-wrapper text-xs [&_pre]:p-3 [&_pre]:m-0 [&_pre]:bg-transparent! [&_code]:font-mono ${
              resolvedWordWrap
                ? '[&_pre]:!whitespace-pre-wrap [&_pre]:break-words [&_pre]:[overflow-wrap:anywhere] [&_code]:!whitespace-pre-wrap [&_code]:break-words [&_code]:[overflow-wrap:anywhere]'
                : ''
            }`}
            suppressHydrationWarning
            dangerouslySetInnerHTML={{ __html: html as string }}
          />
        )}
      </div>
    </div>
  )
})
