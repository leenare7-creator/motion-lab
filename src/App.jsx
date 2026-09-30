import React, { useEffect, useState } from 'react'
import { useMotionLab } from './hooks/useMotionLab'
import TopBar from './components/TopBar'
import ToolRail from './components/ToolRail'
import LayersPanel from './components/LayersPanel'
import CanvasStage from './components/CanvasStage'
import Inspector from './components/Inspector'
import Timeline from './components/Timeline'
import PasteDialog from './components/PasteDialog'
import ExportDialog from './components/ExportDialog'

export default function App(){
  const lab=useMotionLab()
  const [pasteOpen,setPasteOpen]=useState(false)
  const [exportOpen,setExportOpen]=useState(false)

  useEffect(()=>{
    const onKeyDown=e=>{
      const mod=e.metaKey||e.ctrlKey
      if(!mod)return
      if(e.key.toLowerCase()==='z'){
        e.preventDefault()
        if(e.shiftKey)lab.redo();else lab.undo()
      }else if(e.ctrlKey&&e.key.toLowerCase()==='y'){
        e.preventDefault();lab.redo()
      }
    }
    window.addEventListener('keydown',onKeyDown)
    return()=>window.removeEventListener('keydown',onKeyDown)
  },[lab.undo,lab.redo])

  return <div className="app">
    <TopBar lab={lab} onExport={()=>setExportOpen(true)} onShare={()=>navigator.clipboard?.writeText(location.href).then(()=>lab.notify('링크를 복사했습니다.'))} />
    <div className="editor-shell">
      <ToolRail />
      <LayersPanel lab={lab} onPaste={()=>setPasteOpen(true)} />
      <CanvasStage lab={lab} />
      <Inspector lab={lab} />
      <Timeline lab={lab} />
    </div>
    <PasteDialog open={pasteOpen} onClose={()=>setPasteOpen(false)} lab={lab}/>
    <ExportDialog open={exportOpen} onClose={()=>setExportOpen(false)} lab={lab}/>
    {lab.toast&&<div className="toast show">{lab.toast}</div>}
  </div>
}
