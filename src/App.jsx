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
import AiMotionStudio from './components/AiMotionStudio'

const STUDIO_URL='https://iptvuistudio.vercel.app'

function StudioDesktopSidebar(){
  return <aside className="studio-desktop-sidebar">
    <a className="studio-desktop-logo" href={STUDIO_URL}>Media UX Studio</a>
    <nav className="studio-desktop-nav">
      <a href={STUDIO_URL+'/design'}>Design</a>
      <a href={STUDIO_URL+'/explore'}>Explore</a>
      <a href={STUDIO_URL+'/review'}>Review</a>
      <a href={STUDIO_URL+'/work'}>My Work</a>
    </nav>
    <div className="studio-desktop-tools">
      <a href={STUDIO_URL+'/render-lab'}><i className="render-dot"/>Render Lab <span>›</span></a>
      <a className="current" href="/"><i className="motion-dot"/>Motion Lab <span>›</span></a>
    </div>
  </aside>
}

export default function App(){
  const lab=useMotionLab()
  const [pasteOpen,setPasteOpen]=useState(false)
  const [exportOpen,setExportOpen]=useState(false)
  const [workspace,setWorkspace]=useState('easy')
  const [desktopOnly,setDesktopOnly]=useState(false)

  useEffect(()=>{
    const detect=()=>{
      const ua=navigator.userAgent||''
      const isPhoneOrTablet=/iPhone|iPad|iPod|Android|Mobile/i.test(ua) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1)
      const tooNarrow=window.matchMedia('(max-width: 1023px)').matches
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
      setWorkspace('advanced')
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

  if(desktopOnly&&workspace==='advanced'){
    return <div className="desktop-only-screen">
      <div className="desktop-only-card">
        <div className="desktop-only-mark">M</div>
        <h1>Advanced Editor는 PC에서 사용할 수 있어요</h1>
        <p>레이어 편집, 타임라인, 포커스 이동 검증만 넓은 화면과 마우스·키보드 환경을 기준으로 제공합니다.</p>
        <div className="desktop-only-guide">이미지 분석, AI 모션 3안 생성, Speed/Motion 조절과 Export는 모바일에서도 사용할 수 있어요.</div>
        <div className="desktop-only-actions">
          <button onClick={()=>setWorkspace('easy')}>AI Motion으로 돌아가기</button>
          <a href="https://iptvuistudio.vercel.app">UI Studio</a>
        </div>
      </div>
    </div>
  }

  if(workspace==='easy'){
    return <>
      <StudioDesktopSidebar/>
      <AiMotionStudio
        lab={lab}
        onAdvanced={()=>setWorkspace('advanced')}
        onExport={()=>setExportOpen(true)}
      />
      <ExportDialog open={exportOpen} onClose={()=>setExportOpen(false)} lab={lab}/>
      {lab.toast&&<div className="toast show">{lab.toast}</div>}
    </>
  }

  return <>
    <StudioDesktopSidebar/>
    <div className="app studio-shifted-app">
    <TopBar
      lab={lab}
      onEasy={()=>setWorkspace('easy')}
      onExport={()=>setExportOpen(true)}
      onShare={()=>navigator.clipboard?.writeText(location.href).then(()=>lab.notify('링크를 복사했습니다.'))}
    />
    <div className="editor-shell">
      <ToolRail />
      <LayersPanel lab={lab} onPaste={()=>setPasteOpen(true)} />
      <CanvasStage lab={lab} />
      {lab.editorMode==='prototype'?<PrototypeInspector lab={lab}/>:<Inspector lab={lab} />}
      <Timeline lab={lab} />
    </div>
    <PasteDialog open={pasteOpen} onClose={()=>setPasteOpen(false)} lab={lab}/>
    <ExportDialog open={exportOpen} onClose={()=>setExportOpen(false)} lab={lab}/>
    {lab.toast&&<div className="toast show">{lab.toast}</div>}
  </div>
  </>
}
