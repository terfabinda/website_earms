import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Typography from '@tiptap/extension-typography'
import CharacterCount from '@tiptap/extension-character-count'

// Initial template for research chapter
const DEFAULT_CONTENT = `<h1>Chapter — Research Title</h1>
<p>Start writing your research here. This collaborative workspace supports real-time co-authoring with your supervisors, inline comments, track changes, and version history. Use the toolbar above for formatting.</p>
<h2>1. Introduction</h2>
<p>Provide background, problem statement and objectives. Your supervisor can highlight text and leave comments — look for the <mark>highlight</mark> tool in the toolbar.</p>
<blockquote><p><em>Tip: All changes are auto-saved locally and can be submitted as a chapter version to your supervisor via the Project Flow API.</em></p></blockquote>
<h2>2. Placeholder Table</h2>
<table><tbody><tr><th>Milestone</th><th>Status</th><th>Due</th></tr><tr><td>Literature Review</td><td>In Progress</td><td>Oct 2025</td></tr></tbody></table>
<ul data-type="taskList"><li data-type="taskItem" data-checked="false">Draft methodology section</li><li data-type="taskItem" data-checked="true">Collect preliminary data</li></ul>
<p></p>`

function ToolbarButton({ active, onClick, title, children, disabled }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`px-2 py-1.5 rounded text-sm flex items-center justify-center min-w-[30px] min-h-[30px] border ${active ? 'bg-primary text-on-primary border-primary' : 'bg-surface hover:bg-surface-variant text-on-surface border-outline-variant'} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  )
}

export function TipTapEditor({
  storageKey = 'earms_tiptap_default',
  initialContent,
  onSave,
  onContentChange,
  collaborators = [],
  chapterLabel = 'Chapter 1',
  readOnly = false,
  showHeader = true,
}) {
  const [saveStatus, setSaveStatus] = useState('saved')
  const [commentInput, setCommentInput] = useState('')
  const [comments, setComments] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey + ':comments') || '[]') } catch { return [] }
  })
  const [showShare, setShowShare] = useState(false)
  const [shareEmails, setShareEmails] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey + ':share') || '[]') } catch { return [] }
  })
  const [newShare, setNewShare] = useState('')
  const fileRef = useRef(null)

  const editor = useEditor({
    editable: !readOnly,
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Placeholder.configure({ placeholder: 'Start writing your research chapter…  (Type / for commands)' }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ inline: false, allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
      Typography,
      CharacterCount,
    ],
    content: (() => {
      try {
        const saved = localStorage.getItem(storageKey)
        if (saved) return saved
      } catch {}
      return initialContent || DEFAULT_CONTENT
    })(),
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML()
      try { localStorage.setItem(storageKey, html) } catch {}
      setSaveStatus('saving')
      onContentChange?.(html, ed)
      // debounce saved
      setTimeout(() => setSaveStatus('saved'), 600)
    },
  })

  useEffect(() => {
    if (!editor) return
    editor.setEditable(!readOnly)
  }, [readOnly, editor])

  // load comments persistence
  useEffect(() => { try { localStorage.setItem(storageKey + ':comments', JSON.stringify(comments)) } catch {} }, [comments, storageKey])
  useEffect(() => { try { localStorage.setItem(storageKey + ':share', JSON.stringify(shareEmails)) } catch {} }, [shareEmails, storageKey])

  const addComment = useCallback(() => {
    if (!commentInput.trim()) return
    const sel = editor ? editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ') : ''
    const quote = sel?.slice(0, 80)
    setComments(c => [{ id: Date.now(), text: commentInput.trim(), quote, author: 'You', at: new Date().toISOString() }, ...c])
    setCommentInput('')
  }, [commentInput, editor])

  const handleSave = useCallback(async () => {
    if (!editor) return
    const html = editor.getHTML()
    const text = editor.getText()
    setSaveStatus('saving')
    try { localStorage.setItem(storageKey, html) } catch {}
    if (onSave) await onSave({ html, text, json: editor.getJSON() })
    setSaveStatus('saved')
  }, [editor, onSave, storageKey])

  const handleExportDocx = useCallback(() => {
    if (!editor) return
    const html = editor.getHTML()
    const blob = new Blob([`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${chapterLabel}</title></head><body>${html}</body></html>`], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${chapterLabel.replace(/\s+/g, '_')}.html`
    a.click()
    URL.revokeObjectURL(url)
  }, [editor, chapterLabel])

  const handleImageUpload = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file || !editor) return
    const reader = new FileReader()
    reader.onload = () => {
      editor.chain().focus().setImage({ src: reader.result }).run()
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [editor])

  if (!editor) return <div className="p-8 text-center text-on-surface-variant">Loading editor…</div>

  const wordCount = editor.storage.characterCount.words()

  return (
    <div className="flex flex-col bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden shadow-sm">
      {showHeader && (
        <div className="flex flex-col gap-2 px-3 md:px-4 py-3 border-b border-outline-variant bg-surface-container-lowest sticky top-0 z-10">
          {/* Top bar: chapter + collaborators + actions */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-on-primary"><span className="material-symbols-outlined text-[18px]">article</span></div>
              <div>
                <h3 className="font-headline-sm font-bold text-on-surface leading-none">{chapterLabel}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${saveStatus === 'saved' ? 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
                    <span className={`w-2 h-2 rounded-full ${saveStatus === 'saved' ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`}></span>
                    {saveStatus === 'saved' ? 'All changes saved' : 'Saving…'}
                  </span>
                  <span className="text-[11px] text-outline hidden sm:inline">{wordCount} words • {editor.storage.characterCount.characters()} chars</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Collaborators */}
              <div className="hidden md:flex items-center -space-x-2 mr-2">
                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBKcVE1T4B00ZtQnTz8zw513QfUxlIBB0D3TCkT6CV9XGmvHfs9Yt6zpoPtsmstiMpuBkqeqRsOaYoagI9UxzJMGu-BfUT5H-CvZgJmuxSNUNLnhcpopDb8yPUOXyxjg74v9aftMYReycGHH-pNuYIwMF2KCiNUDO84eA4h2rkELDiScap5zzvIVZpjoKE4ktM2R63imrbAEoR541iaQ46iKyxd7BN1808kz9h9lbMpyEQnmiuAexWd" alt="you" className="w-7 h-7 rounded-full border-2 border-surface object-cover" />
                {(collaborators.length ? collaborators : [{ name: 'Dr. Supervisor', initials: 'DS', color: 'bg-secondary-fixed' }, { name: 'Co-supervisor', initials: 'CS', color: 'bg-tertiary-fixed' }]).slice(0, 3).map((c, i) => (
                  <div key={i} className={`w-7 h-7 rounded-full border-2 border-surface flex items-center justify-center text-[10px] font-bold ${c.color || 'bg-primary-container text-primary'}`} title={c.name || c.staffNo || 'Collaborator'}>
                    {c.initials || (c.name || c.staffNo || 'C').slice(0, 2).toUpperCase()}
                  </div>
                ))}
                <span className="ml-3 text-[11px] text-on-surface-variant hidden lg:inline">{shareEmails.length ? `${shareEmails.length + 1} collaborators` : '2 collaborators'} • Live</span>
                <span className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              </div>

              <div className="flex items-center gap-1.5">
                <button onClick={() => setShowShare(!showShare)} className="hidden sm:inline-flex items-center gap-1.5 bg-primary text-on-primary px-3 py-1.5 rounded-lg font-label-md text-[13px] hover:bg-surface-tint">
                  <span className="material-symbols-outlined text-[16px]">share</span> Share
                </button>
                <button onClick={handleSave} className="inline-flex items-center gap-1.5 bg-surface-container-high text-on-surface border border-outline-variant px-3 py-1.5 rounded-lg font-label-md text-[13px] hover:bg-surface-variant">
                  <span className="material-symbols-outlined text-[16px]">save</span> Save
                </button>
                <button onClick={handleExportDocx} className="inline-flex items-center gap-1.5 bg-surface-container-high text-on-surface border border-outline-variant px-3 py-1.5 rounded-lg font-label-md text-[13px] hover:bg-surface-variant" title="Export as HTML (Word-compatible)">
                  <span className="material-symbols-outlined text-[16px]">download</span> Export
                </button>
              </div>
            </div>
          </div>

          {/* Share panel */}
          {showShare && (
            <div className="bg-surface-container-low border border-outline-variant rounded-lg p-3">
              <p className="font-label-md text-[12px] text-on-surface-variant uppercase tracking-wide mb-2">Collaborators — invite supervisor / co-author</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {shareEmails.length === 0 && <span className="text-sm text-outline">No additional collaborators yet. Invite via email.</span>}
                {shareEmails.map((e, i) => (
                  <span key={i} className="inline-flex items-center gap-1 bg-primary-container text-on-primary-container px-2.5 py-1 rounded-full text-sm border border-primary-fixed">
                    {e} <button onClick={() => setShareEmails(s => s.filter((_, j) => j !== i))} className="ml-1 hover:text-error">×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={newShare} onChange={e => setNewShare(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (newShare.trim() && newShare.includes('@')) { setShareEmails(s => [...s, newShare.trim()]); setNewShare('') } } }} placeholder="supervisor@university.edu" className="flex-1 border border-outline-variant rounded-lg px-3 py-2 text-sm bg-surface" />
                <button onClick={() => { if (newShare.trim() && newShare.includes('@')) { setShareEmails(s => [...s, newShare.trim()]); setNewShare('') } }} className="bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-label-md">Invite</button>
                <button onClick={() => setShowShare(false)} className="bg-surface-container-high border border-outline-variant px-4 py-2 rounded-lg text-sm">Done</button>
              </div>
              <p className="text-[11px] text-outline mt-2">In production this syncs via Hocuspocus/Yjs CRDT — live cursors, presence, and conflict-free edits. Current build uses local-first autosave + version submission to Project Flow API.</p>
            </div>
          )}

          {/* Toolbar */}
          <div className="flex flex-wrap gap-1.5 items-center bg-surface-container-low rounded-lg p-2 border border-outline-variant">
            <div className="flex gap-1">
              <ToolbarButton title="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}><span className="material-symbols-outlined text-[18px]">undo</span></ToolbarButton>
              <ToolbarButton title="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}><span className="material-symbols-outlined text-[18px]">redo</span></ToolbarButton>
            </div>
            <span className="w-px h-6 bg-outline-variant mx-1" />
            <ToolbarButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold (Ctrl+B)"><span className="font-bold text-sm">B</span></ToolbarButton>
            <ToolbarButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic"><span className="italic text-sm">I</span></ToolbarButton>
            <ToolbarButton active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline"><span className="underline text-sm">U</span></ToolbarButton>
            <ToolbarButton active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough"><span className="line-through text-sm">S</span></ToolbarButton>
            <ToolbarButton active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight().run()} title="Highlight"><span className="material-symbols-outlined text-[18px]">highlight</span></ToolbarButton>
            <ToolbarButton active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()} title="Inline code"><span className="material-symbols-outlined text-[16px]">code</span></ToolbarButton>
            <span className="w-px h-6 bg-outline-variant mx-1" />
            <select
              value={editor.isActive('heading', { level: 1 }) ? 'h1' : editor.isActive('heading', { level: 2 }) ? 'h2' : editor.isActive('heading', { level: 3 }) ? 'h3' : 'p'}
              onChange={e => {
                const v = e.target.value
                if (v === 'p') editor.chain().focus().setParagraph().run()
                else editor.chain().focus().toggleHeading({ level: Number(v.slice(1)) }).run()
              }}
              className="border border-outline-variant rounded px-2 py-1.5 text-sm bg-surface"
              title="Paragraph style"
            >
              <option value="p">Paragraph</option>
              <option value="h1">Heading 1</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
            </select>
            <ToolbarButton active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Align left"><span className="material-symbols-outlined text-[18px]">format_align_left</span></ToolbarButton>
            <ToolbarButton active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Align center"><span className="material-symbols-outlined text-[18px]">format_align_center</span></ToolbarButton>
            <ToolbarButton active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Align right"><span className="material-symbols-outlined text-[18px]">format_align_right</span></ToolbarButton>
            <ToolbarButton active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()} title="Justify"><span className="material-symbols-outlined text-[18px]">format_align_justify</span></ToolbarButton>
            <span className="w-px h-6 bg-outline-variant mx-1" />
            <ToolbarButton active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list"><span className="material-symbols-outlined text-[18px]">format_list_bulleted</span></ToolbarButton>
            <ToolbarButton active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Ordered list"><span className="material-symbols-outlined text-[18px]">format_list_numbered</span></ToolbarButton>
            <ToolbarButton active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()} title="Task list"><span className="material-symbols-outlined text-[18px]">checklist</span></ToolbarButton>
            <ToolbarButton active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote"><span className="material-symbols-outlined text-[18px]">format_quote</span></ToolbarButton>
            <span className="w-px h-6 bg-outline-variant mx-1" />
            <ToolbarButton onClick={() => {
              const url = prompt('Enter URL:')
              if (url) editor.chain().focus().setLink({ href: url }).run()
              else editor.chain().focus().unsetLink().run()
            }} active={editor.isActive('link')} title="Link"><span className="material-symbols-outlined text-[18px]">link</span></ToolbarButton>
            <ToolbarButton onClick={() => fileRef.current?.click()} title="Insert image"><span className="material-symbols-outlined text-[18px]">image</span></ToolbarButton>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            <ToolbarButton onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Insert table"><span className="material-symbols-outlined text-[18px]">table</span></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal rule"><span className="material-symbols-outlined text-[18px]">horizontal_rule</span></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} title="Clear formatting"><span className="material-symbols-outlined text-[18px]">format_clear</span></ToolbarButton>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-outline">
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full"></span> Collaborative • Real-time cursors (local simulation)</span>
            <span>•</span>
            <span>Auto-saves to browser • Submit via Project Flow API to supervisor</span>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row min-h-[420px]">
        {/* Editor paper */}
        <div className="flex-1 bg-[#f8f9fa] p-4 md:p-6 overflow-auto flex justify-center">
          <div className="w-full max-w-[820px] bg-white rounded-lg shadow-sm border border-outline-variant min-h-[500px] p-6 md:p-10 prose prose-sm max-w-none">
            <EditorContent editor={editor} className="tiptap min-h-[400px] outline-none" />
            <style>{`
              .tiptap { outline: none; }
              .tiptap p.is-editor-empty:first-child::before { color: #9ca3af; content: attr(data-placeholder); float: left; height: 0; pointer-events: none; }
              .tiptap h1 { font-size: 1.8em; font-weight: 800; color: #1e3a8a; margin: 0.6em 0 0.3em; }
              .tiptap h2 { font-size: 1.35em; font-weight: 700; color: #1e3a8a; margin: 0.8em 0 0.4em; }
              .tiptap h3 { font-size: 1.15em; font-weight: 600; color: #111827; margin: 0.7em 0 0.3em; }
              .tiptap blockquote { border-left: 3px solid #1e3a8a; padding-left: 1em; color: #4b5563; font-style: italic; margin: 1em 0; }
              .tiptap ul[data-type="taskList"] { list-style: none; padding: 0; }
              .tiptap ul[data-type="taskList"] li { display: flex; gap: 0.5em; align-items: flex-start; }
              .tiptap table { border-collapse: collapse; width: 100%; margin: 1em 0; }
              .tiptap table th, .tiptap table td { border: 1px solid #d1d5db; padding: 6px 10px; }
              .tiptap table th { background: #f3f4f6; font-weight: 600; }
              .tiptap mark { background: #fde68a; padding: 0 2px; border-radius: 2px; }
              .tiptap img { max-width: 100%; border-radius: 8px; margin: 0.8em 0; }
              .tiptap a { color: #1e3a8a; text-decoration: underline; }
              .tiptap hr { border: none; border-top: 1px solid #e5e7eb; margin: 1.2em 0; }
            `}</style>
          </div>
        </div>

        {/* Comments / activity sidebar */}
        <div className="w-full lg:w-[320px] border-t lg:border-t-0 lg:border-l border-outline-variant bg-surface flex flex-col shrink-0">
          <div className="p-3 border-b border-outline-variant bg-surface-container-low flex items-center justify-between">
            <h4 className="font-headline-sm font-bold text-on-surface flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">comment</span> Comments</h4>
            <span className="text-xs bg-primary-container text-on-primary-container px-2 py-0.5 rounded-full">{comments.length}</span>
          </div>

          <div className="p-3 border-b border-outline-variant bg-surface">
            <div className="flex gap-2">
              <input value={commentInput} onChange={e => setCommentInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment() } }} placeholder="Add comment on selection…" className="flex-1 border border-outline-variant rounded-lg px-3 py-2 text-sm bg-surface-container-lowest" />
              <button onClick={addComment} disabled={!commentInput.trim()} className="bg-primary text-on-primary px-3 py-2 rounded-lg text-sm disabled:opacity-40"><span className="material-symbols-outlined text-[18px]">send</span></button>
            </div>
            <p className="text-[11px] text-outline mt-1.5">Select text in the editor, then type a comment. Threads are stored locally; in production they sync with supervisors.</p>
          </div>

          <div className="flex-1 overflow-auto p-3 space-y-3">
            {comments.length === 0 ? (
              <div className="py-10 text-center">
                <span className="material-symbols-outlined text-3xl text-outline">forum</span>
                <p className="text-sm text-on-surface-variant mt-2 font-medium">No comments yet</p>
                <p className="text-xs text-outline mt-1">Highlight text and add feedback for your supervisor or peers.</p>
                <div className="mt-4 space-y-2 text-left">
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs font-bold text-amber-900">Supervisor (mock)</p>
                    <p className="text-xs text-amber-800 mt-1">“Good intro — expand literature gaps in paragraph 2.”</p>
                    <p className="text-[10px] text-amber-700 mt-1">2 hours ago • resolved</p>
                  </div>
                </div>
              </div>
            ) : (
              comments.map(c => (
                <div key={c.id} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary">{c.author}</span>
                    <span className="text-[10px] text-outline">{new Date(c.at).toLocaleString()}</span>
                  </div>
                  {c.quote && <p className="text-xs italic text-on-surface-variant bg-amber-50 border-l-2 border-amber-300 px-2 py-1 mt-1.5 rounded">“{c.quote}”</p>}
                  <p className="text-sm text-on-surface mt-1.5">{c.text}</p>
                  <button onClick={() => setComments(cs => cs.filter(x => x.id !== c.id))} className="text-[11px] text-outline hover:text-error mt-1">Delete • Resolve</button>
                </div>
              ))
            )}

            <div className="pt-3 border-t border-outline-variant">
              <h5 className="font-label-md text-[11px] uppercase tracking-wide text-outline mb-2">Version activity</h5>
              <div className="space-y-2">
                <div className="flex gap-2 text-xs">
                  <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-[10px] font-bold">VS</span>
                  <div><p className="font-medium">Version 2 submitted</p><p className="text-outline">via Project Flow API • today</p></div>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-bold">NC</span>
                  <div><p className="font-medium">Needs Correction</p><p className="text-outline">Supervisor review • yesterday</p></div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 border-t border-outline-variant bg-surface-container-low flex items-center justify-between text-[11px] text-outline">
            <span>Collaborative Word editor</span>
            <span className="font-mono">{wordCount} w</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TipTapEditor
