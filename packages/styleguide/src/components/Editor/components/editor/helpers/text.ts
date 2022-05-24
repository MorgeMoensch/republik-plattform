import {
  CustomEditor,
  CustomMarksType,
  CustomText,
  NormalizeFn,
} from '../../../custom-types'
import {
  Descendant,
  Editor,
  Element as SlateElement,
  Node,
  NodeEntry,
  Transforms,
  Point,
  Range,
} from 'slate'
import { ReactEditor } from 'slate-react'
import { config as elConfig } from '../../../config/elements'
import { isCorrect } from './structure'
import { configKeys as mKeys, MARKS_WHITELIST } from '../../../config/marks'
import { overlaps } from './tree'

const PSEUDO_EMPTY_STRING = '\u2060'

export const getCharCount = (nodes: (Descendant | Node)[]): number =>
  nodes.map((node) => Node.string(node).length).reduce((a, b) => a + b, 0)

export const getCountDown = (editor: CustomEditor, maxSigns: number): number =>
  maxSigns - getCharCount(editor.children)

export const cleanupMarks: NormalizeFn<CustomText> = ([node, path], editor) => {
  const parent = Editor.parent(editor, path)[0]
  const formatText =
    SlateElement.isElement(parent) && elConfig[parent.type].attrs?.formatText
  if (formatText) return false
  mKeys.forEach((mKey) => {
    if (MARKS_WHITELIST.includes(mKey)) return
    if (node[mKey]) {
      Transforms.unsetNodes(editor, mKey, { at: path })
    }
  })
}

export const selectNearestWord = (
  editor: CustomEditor,
  dryRun?: boolean,
): boolean => {
  if (!editor.selection || !Range.isCollapsed(editor.selection)) return false
  const anchor = Editor.before(editor, editor.selection, { unit: 'word' })
  const focus = Editor.after(editor, editor.selection, { unit: 'word' })
  if (
    anchor &&
    focus &&
    anchor.path.length === focus.path.length &&
    overlaps(anchor.path, focus.path) &&
    Editor.string(editor, { anchor, focus }).split(' ').length === 1
  ) {
    !dryRun && Transforms.select(editor, { anchor, focus })
    return true
  }
  return false
}

export const isMarkActive = (
  editor: CustomEditor,
  mKey: CustomMarksType,
): boolean => {
  // try-catch clause needed for the tests
  let marks
  try {
    marks = Editor.marks(editor)
  } catch (e) {
    // console.warn(e)
  }
  return !!marks && !!marks[mKey]
}

export const toggleMark = (
  editor: CustomEditor,
  mKey: CustomMarksType,
): void => {
  const { selection } = editor
  const isCollapsed = selection && Range.isCollapsed(selection)
  if (isCollapsed) {
    const retry = selectNearestWord(editor)
    if (retry) return toggleMark(editor, mKey)
  }

  const isActive = isMarkActive(editor, mKey)
  if (isActive) {
    Editor.removeMark(editor, mKey)
  } else {
    Editor.addMark(editor, mKey, true)
  }
}

export const toTitle = (text = ''): string =>
  text.replace(/([A-Z])/g, ' $1').replace(/^\w/, (c) => c.toUpperCase())

export const selectPlaceholder = (
  editor: CustomEditor,
  node: NodeEntry<CustomText>,
): void => {
  const at = node[1]
  // this is a hack so that the element is selected before the text change
  // (selecting empty text nodes is a problem)
  Transforms.insertText(editor, PSEUDO_EMPTY_STRING, { at })
  ReactEditor.focus(editor)
  Transforms.select(editor, at)
  setTimeout(() => {
    Transforms.insertText(editor, '', {
      at,
    })
    Transforms.select(editor, at)
  })
}

export const isEmpty = (text?: string) =>
  !text || text === '' || text === PSEUDO_EMPTY_STRING

export const createLinks: NormalizeFn<CustomText> = ([node, path], editor) => {
  const parent = Editor.parent(editor, path)
  const parentNode = parent[0]

  // regex should only return one link!
  const regex =
    /(https?:\/\/(?:www\.|(?!www))[^\s.]+\.[^\s]{2,}|www\.[^\s]+\.[^\s]{2,})/gi
  const linkContent = node.text.match(regex)

  if (linkContent) {
    if (SlateElement.isElement(parentNode) && parentNode.type !== 'link') {
      const linkStartPoint = node.text.indexOf(linkContent[0])
      const linkEndPoint = linkContent[0].length + linkStartPoint

      const href = /^(https?:|\/|#)/.test(linkContent[0])
        ? linkContent[0]
        : 'http://' + linkContent[0]

      Transforms.wrapNodes(
        editor,
        { type: 'link', href, children: [] },
        {
          at: {
            anchor: { path, offset: linkStartPoint },
            focus: { path, offset: linkEndPoint },
          },
          split: true,
        },
      )

      if (
        editor.selection &&
        !Point.equals(
          { path, offset: linkContent[0].length },
          Range.end(editor.selection),
        )
      ) {
        // TODO: double check this clause
        // console.log({ path })
        const nextTextPath = path.map((p, idx) =>
          idx !== path.length - 1 ? p : p + 2,
        )
        // console.log('nextTextPath', nextTextPath)
        // same hack as for placeholders
        setTimeout(() => {
          Transforms.select(editor, nextTextPath)
        })
      }

      return true
    }
  }
  return false
}

export const handlePlaceholders: NormalizeFn<CustomText> = (
  [node, path],
  editor,
) => {
  const parent = Editor.parent(editor, path)
  const parentNode = parent[0]
  const currentIndex = path[path.length - 1]
  const nextSibling = parentNode.children[currentIndex + 1]
  const prevSibling = parentNode.children[currentIndex - 1]
  const redundantSibling =
    (nextSibling && isCorrect(nextSibling, node.template)) ||
    (prevSibling && isCorrect(prevSibling, node.template))
  // console.log({ prevSibling, node, nextSibling, parentNode: parentNode.children })
  if (
    node.end ||
    redundantSibling ||
    !SlateElement.isElement(parentNode) ||
    elConfig[parentNode.type].attrs?.isVoid
  ) {
    if (node.placeholder) {
      Transforms.unsetNodes(editor, 'placeholder', { at: path })
    }
  } else {
    const placeholder = toTitle(parentNode.type) + '\u202F\u202F'
    if (!node.placeholder || node.placeholder !== placeholder) {
      Transforms.setNodes(
        editor,
        {
          placeholder,
        },
        { at: path },
      )
    }
  }
  return false
}
