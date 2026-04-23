type CaretPositionSupport = {
  caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null
  caretRangeFromPoint?: (x: number, y: number) => Range | null
}

function getFirstTextDescendant(node: Node | null): Text | null {
  if (!node) return null
  if (node.nodeType === Node.TEXT_NODE) {
    return node as Text
  }

  for (const child of Array.from(node.childNodes)) {
    const textNode = getFirstTextDescendant(child)
    if (textNode) {
      return textNode
    }
  }

  return null
}

function getLastTextDescendant(node: Node | null): Text | null {
  if (!node) return null
  if (node.nodeType === Node.TEXT_NODE) {
    return node as Text
  }

  const children = Array.from(node.childNodes)
  for (let index = children.length - 1; index >= 0; index -= 1) {
    const textNode = getLastTextDescendant(children[index])
    if (textNode) {
      return textNode
    }
  }

  return null
}

function coerceTextCaret(
  container: HTMLElement,
  node: Node,
  offset: number
): { node: Text; offset: number } | null {
  if (!container.contains(node)) {
    return null
  }

  if (node.nodeType === Node.TEXT_NODE) {
    const textNode = node as Text
    return {
      node: textNode,
      offset: Math.min(Math.max(offset, 0), textNode.data.length),
    }
  }

  const clampedOffset = Math.max(0, Math.min(offset, node.childNodes.length))
  const nextTextNode = getFirstTextDescendant(node.childNodes[clampedOffset] ?? null)
  if (nextTextNode) {
    return { node: nextTextNode, offset: 0 }
  }

  const previousTextNode = getLastTextDescendant(node.childNodes[clampedOffset - 1] ?? null)
  if (previousTextNode) {
    return { node: previousTextNode, offset: previousTextNode.data.length }
  }

  const fallbackNode = getFirstTextDescendant(node)
  return fallbackNode ? { node: fallbackNode, offset: 0 } : null
}

export function getRenderedOffsetAtPoint(
  container: HTMLElement,
  clientX: number,
  clientY: number
): { node: Text; offset: number } | null {
  const support = document as unknown as CaretPositionSupport

  if (typeof support.caretPositionFromPoint === 'function') {
    const result = support.caretPositionFromPoint(clientX, clientY)
    if (result) {
      const caret = coerceTextCaret(container, result.offsetNode, result.offset)
      if (caret) {
        return caret
      }
    }
  }

  if (typeof support.caretRangeFromPoint === 'function') {
    const range = support.caretRangeFromPoint(clientX, clientY)
    if (range) {
      const caret = coerceTextCaret(container, range.startContainer, range.startOffset)
      if (caret) {
        return caret
      }
    }
  }

  return null
}

export function computeRenderedTextOffset(container: HTMLElement, target: Text, targetOffset: number) {
  let renderedOffset = 0
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)

  while (walker.nextNode()) {
    const current = walker.currentNode as Text
    if (current === target) {
      return renderedOffset + Math.min(targetOffset, current.data.length)
    }
    renderedOffset += current.data.length
  }

  return null
}

export function mapRenderedOffsetToRawMarkdown(raw: string, renderedOffset: number) {
  if (renderedOffset <= 0) return 0

  let rawIndex = 0
  let consumed = 0
  const length = raw.length

  while (rawIndex < length && consumed < renderedOffset) {
    const currentChar = raw[rawIndex]
    const remainder = raw.slice(rawIndex)
    const atLineStart = rawIndex === 0 || raw[rawIndex - 1] === '\n'

    if (atLineStart) {
      const headingMatch = remainder.match(/^#{1,6}\s+/)
      if (headingMatch) {
        rawIndex += headingMatch[0].length
        continue
      }

      const listMatch = remainder.match(/^\s*(?:[-*+]|\d+\.)\s+/)
      if (listMatch) {
        rawIndex += listMatch[0].length
        continue
      }

      const blockquoteMatch = remainder.match(/^>\s?/)
      if (blockquoteMatch) {
        rawIndex += blockquoteMatch[0].length
        continue
      }
    }

    if (currentChar === '*' || currentChar === '_' || currentChar === '~') {
      const emphasisMatch = remainder.match(/^(\*\*|__|\*|_|~~)/)
      if (emphasisMatch) {
        rawIndex += emphasisMatch[0].length
        continue
      }
    }

    if (currentChar === '`') {
      const codeFenceMatch = remainder.match(/^`+/)
      if (codeFenceMatch) {
        rawIndex += codeFenceMatch[0].length
        continue
      }
    }

    if (currentChar === '[') {
      const linkMatch = remainder.match(/^\[([^\]]*)\]\([^)]+\)/)
      if (linkMatch) {
        const visibleText = linkMatch[1]
        const remainingNeeded = renderedOffset - consumed
        if (remainingNeeded <= visibleText.length) {
          return rawIndex + 1 + remainingNeeded
        }
        rawIndex += linkMatch[0].length
        consumed += visibleText.length
        continue
      }
    }

    rawIndex += 1
    consumed += 1
  }

  return rawIndex
}

export function resolveMarkdownCaretOffsetFromEvent(
  container: HTMLElement,
  clientX: number,
  clientY: number,
  rawMarkdown: string
): number | null {
  const caret = getRenderedOffsetAtPoint(container, clientX, clientY)
  if (!caret) return null

  const renderedOffset = computeRenderedTextOffset(container, caret.node, caret.offset)
  if (renderedOffset === null) return null

  return mapRenderedOffsetToRawMarkdown(rawMarkdown, renderedOffset)
}
