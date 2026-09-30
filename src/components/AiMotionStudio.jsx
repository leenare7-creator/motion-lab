import React, { useEffect, useRef, useState } from 'react'
import CanvasStage from './CanvasStage'
import { getMotionRecipe } from '../lib/motionRecipes'
import { suggestMotionIdeas } from '../lib/motionDirector'

const readDataUrl=file=>new Promise((resolve,reject)=>{
  const r=new FileReader()
  r.onload=()=>resolve(r.result)
  r.onerror=reject
  r.readAsDataURL(file)
})

const imageMeta=dataUrl=>new Promise((resolve,reject)=>{
  const img=new Image()
  img.onload=()=>resolve({width:img.naturalWidth||1,height:img.naturalHeight||1})
  img.onerror=reject
  img.src=dataUrl
})

async function compactVisionImage(dataUrl,max=768){
  const img=new Image()
  await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=dataUrl})
  const ratio=Math.min(1,max/Math.max(img.naturalWidth||1,img.naturalHeight||1))
  const canvas=document.createElement('canvas')
  canvas.width=Math.max(1,Math.round((img.naturalWidth||1)*ratio))
  canvas.height=Math.max(1,Math.round((img.naturalHeight||1)*ratio))
  const ctx=canvas.getContext('2d')
  ctx.clearRect(0,0,canvas.width,canvas.height)
  ctx.drawImage(img,0,0,canvas.width,canvas.height)
  return canvas.toDataURL('image/png')
}

export default function AiMotionStudio({lab,onAdvanced,onExport}){
  const inputRef=useRef(null)
  const [asset,setAsset]=useState(null)
  const [phase,setPhase]=useState('empty')
  const [analysis,setAnalysis]=useState(null)
  const [ideas,setIdeas]=useState([])
  const [selectedIdea,setSelectedIdea]=useState(null)
  const [intensity,setIntensity]=useState(1)
  const [variation,setVariation]=useState(0)
  const [directorSource,setDirectorSource]=useState(null)

  useEffect(()=>{
    const onPaste=e=>{
      const file=[...(e.clipboardData?.files||[])].find(f=>f.type.startsWith('image/')||f.type==='image/svg+xml')
      if(file) openFile(file)
    }
    window.addEventListener('paste',onPaste)
    return()=>window.removeEventListener('paste',onPaste)
  })

  async function analyze(nextAsset,nextVariation=variation){
    setPhase('analyzing')
    setAnalysis(null);setIdeas([]);setSelectedIdea(null)
    const result=await suggestMotionIdeas(nextAsset,nextVariation)
    setAnalysis(result.analysis)
    setIdeas(result.ideas)
    setDirectorSource(result.source)
    setPhase('ideas')
  }

  async function openFile(file){
    if(!file)return
    const isSvg=file.type==='image/svg+xml'||file.name.toLowerCase().endsWith('.svg')
    if(!isSvg&&!['image/png','image/jpeg','image/webp'].includes(file.type)){
      lab.notify('SVG, PNG, JPG, WebP 파일을 사용해 주세요.')
      return
    }
    try{
      let previewDataUrl,visionDataUrl,width=1,height=1
      if(isSvg){
        const text=await file.text()
        previewDataUrl=await readDataUrl(file)
        const meta=await imageMeta(previewDataUrl)
        width=meta.width;height=meta.height
        visionDataUrl=await compactVisionImage(previewDataUrl)
        lab.replaceWithSvg(text,file.name)
      }else{
        previewDataUrl=await readDataUrl(file)
        const meta=await imageMeta(previewDataUrl)
        width=meta.width;height=meta.height
        visionDataUrl=await compactVisionImage(previewDataUrl)
        lab.replaceWithRaster(previewDataUrl,file.name)
      }
      const next={name:file.name,mime:isSvg?'image/svg+xml':file.type,width,height,previewDataUrl,visionDataUrl}
      setAsset(next)
      setIntensity(1)
      setVariation(0)
      lab.setSpeed(1);lab.setLoop(true);lab.setPlaying(true)
      await analyze(next,0)
    }catch{
      lab.notify('파일을 분석하지 못했습니다.')
    }
  }

  async function pasteFromClipboard(){
    try{
      const items=await navigator.clipboard.read()
      for(const item of items){
        const type=item.types.find(t=>t.startsWith('image/'))
        if(type){
          const blob=await item.getType(type)
          return openFile(new File([blob],'pasted-image.'+(type.split('/')[1]||'png'),{type}))
        }
      }
      lab.notify('클립보드에 이미지가 없습니다.')
    }catch{lab.notify('⌘V로 이미지를 붙여 넣어 주세요.')}
  }

  function chooseIdea(idea){
    setSelectedIdea(idea)
    setIntensity(1)
    lab.applyMotionRecipe(idea.recipeId,1)
    lab.setSpeed(1)
    lab.setPlaying(true)
    setPhase('tune')
  }

  function updateIntensity(value){
    const v=Number(value)
    setIntensity(v)
    if(selectedIdea)lab.applyMotionRecipe(selectedIdea.recipeId,v)
  }

  async function regenerate(){
    const next=variation+1
    setVariation(next)
    await analyze(asset,next)
  }

  function reset(){
    setAsset(null);setAnalysis(null);setIdeas([]);setSelectedIdea(null);setPhase('empty')
  }

  const header=<header className="ai-studio-header">
    <div className="ai-brand"><div className="ai-brand-mark">M</div><b>Motion Lab</b><span>AI motion director</span></div>
    <div className="ai-header-actions">
      {asset&&<button className="ai-ghost" onClick={reset}>Change asset</button>}
      <button className="ai-ghost" onClick={onAdvanced}>Advanced editor</button>
      {phase==='tune'&&<button className="ai-primary small" onClick={onExport}>Export</button>}
    </div>
  </header>

  if(phase==='empty')return <div className="ai-studio">
    {header}
    <main className="ai-hero">
      <div className="ai-kicker">✦ AI MOTION DIRECTOR</div>
      <h1>Make it move.</h1>
      <p>이미지 하나만 넣으세요. AI가 형태와 분위기를 읽고 서로 다른 모션 3가지를 제안합니다.</p>
      <div className="ai-drop" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();openFile(e.dataTransfer.files?.[0])}}>
        <div className="ai-drop-icon">↗</div>
        <strong>Drop an image, SVG, or illustration</strong>
        <span>SVG · PNG · JPG · WebP</span>
        <div className="ai-drop-actions">
          <button className="ai-primary" onClick={()=>inputRef.current?.click()}>Choose file</button>
          <button className="ai-secondary" onClick={pasteFromClipboard}>Paste</button>
        </div>
        <input ref={inputRef} hidden type="file" accept=".svg,image/png,image/jpeg,image/webp" onChange={e=>openFile(e.target.files?.[0])}/>
      </div>
      <div className="ai-promise">
        <span><b>01</b> AI understands the asset</span>
        <span><b>02</b> 3 distinct ideas</span>
        <span><b>03</b> Tune only speed & intensity</span>
      </div>
    </main>
  </div>

  if(phase==='analyzing')return <div className="ai-studio">
    {header}
    <main className="ai-analysis-screen">
      <div className="analysis-art"><img src={asset.previewDataUrl} alt=""/></div>
      <div className="analysis-copy">
        <div className="ai-spinner">✦</div>
        <h2>Directing your motion…</h2>
        <p>형태, 무게 중심, 방향성과 사용 맥락을 보고 있어요.</p>
        <div className="analysis-steps"><span>Understanding shape</span><span>Finding motion opportunities</span><span>Directing 3 ideas</span></div>
      </div>
    </main>
  </div>

  if(phase==='ideas')return <div className="ai-studio">
    {header}
    <main className="ai-ideas">
      <div className="ai-ideas-heading">
        <div>
          <div className="ai-kicker">3 IDEAS FOR {asset.name}</div>
          <h2>어떤 느낌이 가장 맞아?</h2>
          {analysis&&<p>{analysis.summary}</p>}
        </div>
        <div className="ai-analysis-tags">
          {(analysis?.traits||[]).slice(0,4).map(t=><span key={t}>{t}</span>)}
          <span className={directorSource==='ai'?'ai-source live':'ai-source'}>{directorSource==='ai'?'AI analyzed':'Smart preview'}</span>
        </div>
      </div>
      <div className="idea-grid">
        {ideas.map((idea,i)=>{
          const recipe=getMotionRecipe(idea.recipeId)
          return <button className="idea-card" key={idea.recipeId} onClick={()=>chooseIdea(idea)}>
            <div className="idea-preview checker-soft">
              <img className={'idea-object '+recipe.previewClass} src={asset.previewDataUrl} alt=""/>
              <span className="idea-number">0{i+1}</span>
            </div>
            <div className="idea-card-copy">
              <span className="idea-lane">{idea.lane||recipe.lane}</span>
              <h3>{idea.title||recipe.name}</h3>
              <p>{idea.rationale||recipe.description}</p>
              <span className="idea-choose">Choose this motion →</span>
            </div>
          </button>
        })}
      </div>
      <button className="regenerate" onClick={regenerate}>↻ Generate 3 new directions</button>
    </main>
  </div>

  const recipe=getMotionRecipe(selectedIdea.recipeId)
  return <div className="ai-studio">
    {header}
    <main className="ai-tune">
      <section className="ai-live-stage">
        <div className="ai-live-toolbar"><span>{asset.name}</span><b>{selectedIdea.title||recipe.name}</b></div>
        <div className="ai-engine"><CanvasStage lab={lab}/></div>
      </section>
      <aside className="ai-tune-panel">
        <span className="idea-lane">{selectedIdea.lane||recipe.lane}</span>
        <h2>{selectedIdea.title||recipe.name}</h2>
        <p>{selectedIdea.rationale||recipe.description}</p>
        <div className="simple-control">
          <div><b>Speed</b><span>{lab.speed.toFixed(1)}×</span></div>
          <input type="range" min=".6" max="1.6" step=".1" value={lab.speed} onChange={e=>lab.setSpeed(Number(e.target.value))}/>
          <div className="control-ends"><span>Slow</span><span>Fast</span></div>
        </div>
        <div className="simple-control">
          <div><b>Motion</b><span>{Math.round(intensity*100)}%</span></div>
          <input type="range" min=".55" max="1.45" step=".05" value={intensity} onChange={e=>updateIntensity(e.target.value)}/>
          <div className="control-ends"><span>Subtle</span><span>Bold</span></div>
        </div>
        <label className="loop-control"><span><b>Loop preview</b><small>계속 반복해서 확인</small></span><button className={'toggle '+(lab.loop?'on':'')} onClick={()=>lab.setLoop(!lab.loop)}><i/></button></label>
        <button className="ai-secondary full" onClick={()=>{setPhase('ideas');lab.setPlaying(false)}}>← Back to 3 ideas</button>
        <button className="advanced-link" onClick={onAdvanced}>Need more control? Open Advanced Editor</button>
      </aside>
    </main>
  </div>
}
