import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Mark } from '@tiptap/core'
import TextAlign from '@tiptap/extension-text-align'
import { useEffect } from 'react'
import { 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify 
} from 'lucide-react'
import Paragraph from '@tiptap/extension-paragraph'

// Create custom paragraph with alignment support
const CustomParagraph = Paragraph.extend({
  addAttributes() {
    return {
      textAlign: {
        default: 'left',
        parseHTML: element => element.style.textAlign || 'left',
        renderHTML: attributes => {
          if (attributes.textAlign === 'left') return {}
          return { style: `text-align: ${attributes.textAlign}` }
        },
      },
    }
  },
})

const Variable = Mark.create({
  name: 'variable',
  
  parseHTML() {
    return [
      { tag: 'span', class: 'variable-mark' },
    ]
  },

  renderHTML() {
    return ['span', { 
      class: 'variable-mark bg-blue-100 px-1 rounded cursor-pointer',
    }]
  }
})

interface MessageEditorProps {
  value: string
  onChange: (html: string) => void
}

function AlignmentButtons({ editor }: { editor: any }) {
  if (!editor) {
    return null
  }

  return (
    <div className="flex gap-1 mb-2">
      <button
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={`p-2 rounded hover:bg-gray-100 ${
          editor.isActive({ textAlign: 'left' }) ? 'bg-gray-200' : ''
        }`}
        title="Align left"
      >
        <AlignLeft className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={`p-2 rounded hover:bg-gray-100 ${
          editor.isActive({ textAlign: 'center' }) ? 'bg-gray-200' : ''
        }`}
        title="Align center"
      >
        <AlignCenter className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={`p-2 rounded hover:bg-gray-100 ${
          editor.isActive({ textAlign: 'right' }) ? 'bg-gray-200' : ''
        }`}
        title="Align right"
      >
        <AlignRight className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        className={`p-2 rounded hover:bg-gray-100 ${
          editor.isActive({ textAlign: 'justify' }) ? 'bg-gray-200' : ''
        }`}
        title="Justify"
      >
        <AlignJustify className="w-4 h-4" />
      </button>
    </div>
  )
}

export function MessageEditor({ value, onChange }: MessageEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: false, // Disable default paragraph to use our custom one
        code: false,
      }),
      CustomParagraph,
      Variable,
      TextAlign.configure({
        types: ['paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
        defaultAlignment: 'left',
      }),
    ],
    content: value.replace(/~([A-Za-z][A-Za-z0-9_]*)~/g, 
      (_, name) => `<span class="variable-mark">~${name}~</span>`
    ),
    editorProps: {
      attributes: {
        class: 'w-full p-2 border border-gray-300 rounded focus:outline-1 focus:outline-blue-500 min-h-[8rem] prose prose-sm max-w-none',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
        .replace(/<span class="variable-mark">~([A-Za-z][A-Za-z0-9_]*)~<\/span>/g, '~$1~')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
      onChange(html)
    },
  })

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(
        value.replace(/~([A-Za-z][A-Za-z0-9_]*)~/g,
          (_, name) => `<span class="variable-mark">~${name}~</span>`
        )
      )
    }
  }, [value, editor])

  return (
    <div className="space-y-2">
      <AlignmentButtons editor={editor} />
      <EditorContent editor={editor} />
      <p className="text-sm text-gray-500 mt-1">
        Tip: Use ~VariableName~ to insert dynamic content (e.g., ~Name~, ~Course~)
      </p>
    </div>
  )
} 