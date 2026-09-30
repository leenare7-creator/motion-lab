import React, { useCallback, useEffect, useRef, useState } from 'react'
import SvgScene from './SvgScene'

const THEMES = { tomato:'#ff4b2b', ocean:'#237bda', violet:'#6f5df6', mono:'#292b2f', graphite:'#e5e5e5' }
const DIR_KEYS = { ArrowUp:'up', ArrowDown:'down', ArrowLeft:'left', ArrowRight:'right' }

export default function CanvasStage({ lab }) {
  const stageRef = useRef(null)
  const refs = useRef(new Map())
  const [box, setBox] = useState(null)
  const [focusBox, setFocusBox] = useState(null)
  const interaction = useRef(null)

  const registerRef = (id, el) => { if (el) refs.current.set(id, el); else refs.current.delete(id) }

  const measureBox = useCallback((id) => {
    const node=refs.current.get(id), stage=stageRef.current
    if(!node||!stage)return null
    const r=node.getBoundingClientRect(), s=stage.getBoundingClientRect()
    if(r.width<2||r.height<2)return null
    return {left:r.left-s.left,top:r.top-s.top,width:r.width,height:r.height}
  },[])

  useEffect(() => {
    const raf=requestAnimationFrame(()=>{
      setBox(lab.editorMode==='animate'?measureBox(lab.selectedId):null)
      if(lab.editorMode==='prototype'&&lab.focusedId){
        setFocusBox(measureBox(lab.focusedId))
      }else setFocusBox(null)
    })
    const timer=setTimeout(()=>{
      if(lab.editorMode==='prototype'&&lab.focusedId){
        setFocusBox(measureBox(lab.focusedId))
      }
    },lab.focusSettings.duration+24)
    return()=>{cancelAnimationFrame(raf);clearTimeout(timer)}
  },[lab.selectedId,lab.focusedId,lab.layers,lab.time,lab.editorMode,lab.focusSettings.duration,lab.focusSettings.scale,measureBox])

  function begin(mode,e){
    if(!lab.selected||lab.editorMode!=='animate')return
    e.preventDefault();e.stopPropagation()
    const r=box,stage=stageRef.current.getBoundingClientRect(),current=lab.currentProps(lab.selected).transform
    lab.beginTransaction(mode==='move'?'Move layer':mode==='scale'?'Scale layer':'Rotate layer')
    interaction.current={mode,x:e.clientX,y:e.clientY,start:{...current},centerX:stage.left+r.left+r.width/2,centerY:stage.top+r.top+r.height/2,stage}
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',end,{once:true})
  }
  function move(e){
    const it=interaction.current;if(!it)return
    const sx=800/it.stage.width,sy=560/it.stage.height
    if(it.mode==='move'){lab.updateTimed('transform','x',it.start.x+(e.clientX-it.x)*sx);lab.updateTimed('transform','y',it.start.y+(e.clientY-it.y)*sy)}
    else if(it.mode==='scale'){const delta=((e.clientX-it.x)+(e.clientY-it.y))/240;lab.updateTimed('transform','scale',Math.max(.15,Math.min(4,it.start.scale+delta)))}
    else{const a0=Math.atan2(it.y-it.centerY,it.x-it.centerX),a1=Math.atan2(e.clientY-it.centerY,e.clientX-it.centerX);lab.updateTimed('transform','rotation',it.start.rotation+(a1-a0)*180/Math.PI)}
  }
  function end(){interaction.current=null;window.removeEventListener('pointermove',move);lab.commitTransaction()}

  const navigateFocus=useCallback((dir)=>{
    const focusables=lab.focusableLayers
    if(!focusables.length){lab.notify('Focusable 레이어가 없습니다.');return}
    const current=focusables.find(x=>x.id===lab.focusedId)||focusables[0]
    const manual=current.prototype?.links?.[dir]
    let target=manual?focusables.find(x=>x.id===manual):null
    if(!target){
      const cnode=refs.current.get(current.id)
      if(!cnode){target=focusables.find(x=>x.id!==current.id)}
      else{
        const cr=cnode.getBoundingClientRect(),cx=cr.left+cr.width/2,cy=cr.top+cr.height/2
        const scored=focusables.filter(x=>x.id!==current.id).map(layer=>{
          const node=refs.current.get(layer.id);if(!node)return null
          const r=node.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,dx=x-cx,dy=y-cy
          const valid=dir==='right'?dx>4:dir==='left'?dx<-4:dir==='down'?dy>4:dy<-4
          if(!valid)return null
          const primary=(dir==='left'||dir==='right')?Math.abs(dx):Math.abs(dy)
          const cross=(dir==='left'||dir==='right')?Math.abs(dy):Math.abs(dx)
          return {layer,score:primary+cross*1.8}
        }).filter(Boolean).sort((a,b)=>a.score-b.score)
        target=scored[0]?.layer
      }
    }
    if(target){lab.setFocusedId(target.id);lab.setSelectedId(target.id)}
  },[lab.focusableLayers,lab.focusedId,lab.layers])

  useEffect(()=>{
    if(lab.editorMode!=='prototype')return
    const onKey=e=>{
      const tag=e.target?.tagName?.toLowerCase();if(['input','select','textarea'].includes(tag)||e.target?.isContentEditable)return
      if(DIR_KEYS[e.key]){e.preventDefault();navigateFocus(DIR_KEYS[e.key])}
      else if(e.key==='Enter'||e.key===' '){e.preventDefault();lab.activateFocus()}
    }
    window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)
  },[lab.editorMode,navigateFocus,lab.activateFocus])

  const gap=lab.focusSettings.ringGap
  return <section className="canvas-area">
    <div className="canvas-toolbar">
      <div className="zoom-pill">100%⌄</div>
      <span className="canvas-hint">{lab.editorMode==='prototype'?'IPTV Focus Test · use ↑ ↓ ← → and Enter':'Move tool · drag object to position · handles to scale/rotate'}</span>
      <div className="toolbar-spacer"/>
      {lab.editorMode==='prototype'&&<button className="focus-demo-btn" onClick={lab.addIptvDemo}>＋ IPTV demo</button>}
      <button onClick={lab.addSnapshot}>Snapshot</button><button onClick={()=>lab.setTheme(lab.theme==='graphite'?'tomato':'graphite')}>Canvas</button>
    </div>
    <div className={'canvas-viewport '+(lab.editorMode==='prototype'?'prototype-canvas':'')} ref={stageRef} style={{background:THEMES[lab.theme]||THEMES.tomato}} onPointerDown={()=>lab.editorMode==='animate'&&lab.setSelectedId(null)}>
      <div className="checker"/>
      <svg className="scene-svg" viewBox="0 0 800 560" preserveAspectRatio="xMidYMid meet"><SvgScene lab={lab} registerRef={registerRef}/></svg>
      {box&&lab.editorMode==='animate'&&<div className="selection-box" style={box}><div className="move-zone" onPointerDown={e=>begin('move',e)}/><div className="rotate-stem"/><div className="handle rotate" onPointerDown={e=>begin('rotate',e)}/><div className="handle scale" onPointerDown={e=>begin('scale',e)}/></div>}
      {focusBox&&lab.editorMode==='prototype'&&<div className="focus-indicator" style={{left:focusBox.left-gap,top:focusBox.top-gap,width:focusBox.width+gap*2,height:focusBox.height+gap*2,transitionDuration:`${lab.focusSettings.duration}ms`,transitionTimingFunction:lab.focusSettings.easing}}/>}
      {lab.editorMode==='prototype'&&<div className="tv-remote" onPointerDown={e=>e.stopPropagation()}>
        <div/><button onClick={()=>navigateFocus('up')}>↑</button><div/>
        <button onClick={()=>navigateFocus('left')}>←</button><button className="remote-ok" onClick={lab.activateFocus}>OK</button><button onClick={()=>navigateFocus('right')}>→</button>
        <div/><button onClick={()=>navigateFocus('down')}>↓</button><div/>
      </div>}
      <div className="canvas-status">{lab.editorMode==='prototype'?(lab.focusedLayer?`Focus · ${lab.focusedLayer.name}`:'Prototype · choose a focusable layer'):(lab.selected?`${lab.selected.name} · ${lab.selected.type}`:'Click an object to select')}</div>
    </div>
  </section>
}
