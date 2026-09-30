import React, { useEffect, useRef, useState } from 'react'
import SvgScene from './SvgScene'

const THEMES = {
  tomato:'#ff4b2b', ocean:'#237bda', violet:'#6f5df6', mono:'#292b2f', graphite:'#e5e5e5'
}

export default function CanvasStage({ lab }) {
  const stageRef = useRef(null)
  const refs = useRef(new Map())
  const [box, setBox] = useState(null)
  const interaction = useRef(null)

  const registerRef = (id, el) => { if (el) refs.current.set(id, el); else refs.current.delete(id) }

  useEffect(() => {
    let raf
    const update = () => {
      const node = refs.current.get(lab.selectedId), stage = stageRef.current
      if (!node || !stage) { setBox(null); return }
      const r = node.getBoundingClientRect(), s = stage.getBoundingClientRect()
      if (r.width < 2 || r.height < 2) setBox(null)
      else setBox({ left:r.left-s.left, top:r.top-s.top, width:r.width, height:r.height })
    }
    raf = requestAnimationFrame(update)
    return () => cancelAnimationFrame(raf)
  }, [lab.selectedId, lab.layers, lab.time])

  function begin(mode, e) {
    if (!lab.selected) return
    e.preventDefault(); e.stopPropagation()
    const r = box, stage = stageRef.current.getBoundingClientRect()
    const current = lab.currentProps(lab.selected).transform
    const label = mode === 'move' ? 'Move layer' : mode === 'scale' ? 'Scale layer' : 'Rotate layer'
    lab.beginTransaction(label)
    interaction.current = { mode, x:e.clientX, y:e.clientY, start:{...current}, centerX:stage.left+r.left+r.width/2, centerY:stage.top+r.top+r.height/2, stage }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end, { once:true })
  }
  function move(e) {
    const it = interaction.current; if (!it) return
    const sx = 800 / it.stage.width, sy = 560 / it.stage.height
    if (it.mode === 'move') {
      lab.updateTimed('transform','x', it.start.x + (e.clientX-it.x)*sx)
      lab.updateTimed('transform','y', it.start.y + (e.clientY-it.y)*sy)
    } else if (it.mode === 'scale') {
      const delta=((e.clientX-it.x)+(e.clientY-it.y))/240
      lab.updateTimed('transform','scale', Math.max(.15, Math.min(4,it.start.scale+delta)))
    } else {
      const a0=Math.atan2(it.y-it.centerY,it.x-it.centerX), a1=Math.atan2(e.clientY-it.centerY,e.clientX-it.centerX)
      lab.updateTimed('transform','rotation', it.start.rotation+(a1-a0)*180/Math.PI)
    }
  }
  function end(){
    interaction.current=null
    window.removeEventListener('pointermove', move)
    lab.commitTransaction()
  }

  return <section className="canvas-area">
    <div className="canvas-toolbar">
      <div className="zoom-pill">100%⌄</div><span className="canvas-hint">Move tool · drag object to position · handles to scale/rotate</span>
      <div className="toolbar-spacer"/><button onClick={lab.addSnapshot}>Snapshot</button><button onClick={()=>lab.setTheme(lab.theme==='graphite'?'tomato':'graphite')}>Canvas</button>
    </div>
    <div className="canvas-viewport" ref={stageRef} style={{background:THEMES[lab.theme] || THEMES.tomato}} onPointerDown={()=>lab.setSelectedId(null)}>
      <div className="checker" />
      <svg className="scene-svg" viewBox="0 0 800 560" preserveAspectRatio="xMidYMid meet">
        <SvgScene lab={lab} registerRef={registerRef} />
      </svg>
      {box && <div className="selection-box" style={box}>
        <div className="move-zone" onPointerDown={e=>begin('move',e)} />
        <div className="rotate-stem"/><div className="handle rotate" onPointerDown={e=>begin('rotate',e)} />
        <div className="handle scale" onPointerDown={e=>begin('scale',e)} />
      </div>}
      <div className="canvas-status">{lab.selected ? `${lab.selected.name} · ${lab.selected.type}` : 'Click an object to select'}</div>
    </div>
  </section>
}
