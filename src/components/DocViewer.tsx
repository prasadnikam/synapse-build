import Markdown from 'react-markdown'

interface Props {
  content: string | null
  placeholder: string
}

export function DocViewer({ content, placeholder }: Props) {
  if (!content) {
    return (
      <div className="flex items-center justify-center h-40 text-zinc-600 text-sm border border-dashed border-zinc-800 rounded-lg">
        {placeholder}
      </div>
    )
  }
  return (
    <div className="prose prose-invert prose-sm max-w-none bg-zinc-950 rounded-lg border border-zinc-800 p-4 overflow-y-auto max-h-[60vh]">
      <Markdown>{content}</Markdown>
    </div>
  )
}
