import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DiffViewer } from './DiffViewer'

vi.mock('../hooks/useSyntaxHighlight', () => ({
  useSyntaxHighlight: (code: string, options?: { mode?: 'html' | 'tokens' }) => ({
    output: options?.mode === 'tokens' ? code.split('\n').map(line => [{ content: line, color: '#fff' }]) : null,
    isLoading: false,
  }),
}))

describe('DiffViewer', () => {
  it('uses wrapped rendering without proxy horizontal scrollbar when word wrap is enabled', () => {
    const { container } = render(
      <DiffViewer
        before={'const someRidiculouslyLongIdentifierName = oldValue'}
        after={'const someRidiculouslyLongIdentifierName = newValue'}
        language="ts"
        viewMode="unified"
        wordWrap={true}
      />,
    )

    expect(screen.getByText('const someRidiculouslyLongIdentifierName = oldValue')).toBeInTheDocument()
    expect(screen.getByText('const someRidiculouslyLongIdentifierName = newValue')).toBeInTheDocument()
    expect(container.querySelector('.sticky')).toBeNull()
  })
})
