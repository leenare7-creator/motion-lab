import React, { useEffect, useRef, useState } from 'react'
import { useMotionLab } from './hooks/useMotionLab'
import TopBar from './components/TopBar'
import ToolRail from './components/ToolRail'
import LayersPanel from './components/LayersPanel'
import CanvasStage from './components/CanvasStage'
import Inspector from './components/Inspector'
import PrototypeInspector from './components/PrototypeInspector'
import Timeline from './components/Timeline'
import PasteDialog from './components/PasteDialog'
import ExportDialog from './components/ExportDialog'

export default function App(){
  const lab=useMotionLab()
  const [pasteOpen,setPasteOpen]=useState(false)
  const [exportOpen,setExportOpen]=useState(false)
  const [mobilePane,setMobilePane]=useState('canvas')
  const [desktopOnly,setDesktopOnly]=useState(false)

  useEffect(()=>{
    const detect=()=>{
      const ua=navigator.userAgent||''
      const isPhoneOrTablet=/iPhone|iPad|iPod|Android|Mobile/i.test(ua) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1)
      const tooNarrow=window.matchMedia('(max-width: 900px)').matches
      setDesktopOnly(isPhoneOrTablet||tooNarrow)
    }
    detect()
    window.addEventListener('resize',detect)
    return()=>window.removeEventListener('resize',detect)
  },[])
  const bridgeImported=useRef(false)

  useEffect(()=>{
    if(bridgeImported.current)return
    const prefix='#ui-studio='
    if(!window.location.hash.startsWith(prefix))return
    bridgeImported.current=true
    try{
      const payload=JSON.parse(decodeURIComponent(window.location.hash.slice(prefix.length)))
      lab.importUiStudioPayload(payload)
      history.replaceState(null,'',window.location.pathname+window.location.search)
    }catch(e){
      lab.notify('UI Studio 화면 데이터를 읽지 못했습니다.')
    }
  },[lab.importUiStudioPayload])

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

  if(desktopOnly){
    return <div className="desktop-only-screen">
      <div className="desktop-only-card">
        <div className="desktop-only-mark">M</div>
        <h1>Motion Lab은 PC에서 사용할 수 있어요</h1>
        <p>레이어 편집, 타임라인, 포커스 이동 검증은 넓은 화면과 마우스·키보드 환경을 기준으로 제공합니다.</p>
        <div className="desktop-only-guide">PC에서 UI Studio를 열고 <b>Motion</b>을 선택해 다시 접속해 주세요.</div>
        <a href="https://iptvuistudio.vercel.app">UI Studio로 돌아가기</a>
      </div>
    </div>
  }

  return <div className="app">
    <TopBar lab={lab} onExport={()=>setExportOpen(true)} onShare={()=>navigator.clipboard?.writeText(location.href).then(()=>lab.notify('링크를 복사했습니다.'))} />
    <div className={`editor-shell mobile-pane-${mobilePane}`}>
      <ToolRail />
      <LayersPanel lab={lab} onPaste={()=>setPasteOpen(true)} />
      <CanvasStage lab={lab} />
      {lab.editorMode==='prototype'?<PrototypeInspector lab={lab}/>:<Inspector lab={lab} />}
      <Timeline lab={lab} />
    </div>
    <nav className="mobile-dock" aria-label="Mobile workspace">
      <button className={mobilePane==='canvas'?'active':''} onClick={()=>setMobilePane('canvas')}><span>▣</span>Canvas</button>
      <button className={mobilePane==='layers'?'active':''} onClick={()=>setMobilePane('layers')}><span>☷</span>Layers</button>
      <button className={mobilePane==='inspector'?'active':''} onClick={()=>setMobilePane('inspector')}><span>◫</span>{lab.editorMode==='prototype'?'Focus':'Inspect'}</button>
      <button className={mobilePane==='timeline'?'active':''} onClick={()=>setMobilePane('timeline')}><span>◇</span>Timeline</button>
    </nav>
    <PasteDialog open={pasteOpen} onClose={()=>setPasteOpen(false)} lab={lab}/>
    <ExportDialog open={exportOpen} onClose={()=>setExportOpen(false)} lab={lab}/>
    {lab.toast&&<div className="toast show">{lab.toast}</div>}
  </div>
}
