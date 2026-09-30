import React, { useState } from 'react'

export default function TopBar({ lab, onExport, onShare }) {
  const [historyOpen,setHistoryOpen]=useState(false)
  return <header className="topbar">
    <div className="brand"><div className="figma-mark">M</div><strong>Motion Lab</strong></div>
    <div className="crumb">Drafts / <b>{lab.sourceContext?.title || (lab.editorMode==='prototype'?'IPTV Focus Prototype':'Bookmark motion')}</b>{lab.sourceContext&&<span className="source-badge">UI Studio</span>}</div>
    <div className="mode-switch">
      <button className={lab.editorMode==='animate'?'active':''} onClick={()=>lab.setEditorMode('animate')}>Animate</button>
      <button className={lab.editorMode==='prototype'?'active':''} onClick={()=>lab.setEditorMode('prototype')}>Prototype</button>
    </div>
    <div className="top-spacer" />
    <div className="history-controls">
      <button className="icon-btn" disabled={!lab.canUndo} title={lab.canUndo?`Undo: ${lab.undoLabel} · ⌘Z`:'Nothing to undo'} onClick={lab.undo}>↶</button>
      <button className="icon-btn" disabled={!lab.canRedo} title={lab.canRedo?`Redo: ${lab.redoLabel} · ⇧⌘Z`:'Nothing to redo'} onClick={lab.redo}>↷</button>
      <button className={'history-button '+(historyOpen?'active':'')} onClick={()=>setHistoryOpen(v=>!v)}>History <span>{lab.undoDepth}</span></button>
      {historyOpen&&<div className="history-menu">
        <div className="history-menu-head"><b>Command history</b><span>{lab.undoDepth} undo · {lab.redoDepth} redo</span></div>
        <div className="history-list">
          {lab.historyEntries.length?lab.historyEntries.slice(0,12).map((item,i)=><div className="history-item" key={item.id}><i/><span>{item.label}</span>{i===0&&<small>Current</small>}</div>):<div className="history-empty">No edits yet</div>}
        </div>
        <div className="history-shortcuts"><span>⌘ Z</span> Undo <span>⇧ ⌘ Z</span> Redo</div>
      </div>}
    </div>
    <span className="saved">{lab.canUndo?'● Edited':'✓ Saved'}</span>
    <button className="button subtle" onClick={onShare}>Share</button>
    <button className="button dark" onClick={onExport}>Export</button>
  </header>
}
