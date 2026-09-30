import React, { useRef, useState } from 'react'

const icon = type => ({ svgRoot:'◇', userGroup:'▾', group:'▾', image:'▧', text:'T', shape:'◆' }[type] || '•')

export default function Timeline({ lab }) {
  const [collapsed, setCollapsed] = useState(false)
  const trackRef = useRef(null)
  const roots = lab.childrenOf(null)

  function FlatRows() {
    const out=[]
    const walk=(layer,depth)=>{out.push({layer,depth});lab.childrenOf(layer.id).forEach(c=>walk(c,depth+1))}
    roots.forEach(r=>walk(r,0)); return out
  }
  const rows = FlatRows()
  const secToPercent = t => (t/lab.duration)*100

  function setTimeFromEvent(e, rect=e.currentTarget.getBoundingClientRect()) {
    lab.setTime(Math.max(0,Math.min(lab.duration,((e.clientX-rect.left)/rect.width)*lab.duration)))
  }

  function dragKeyframe(e, layer, keyframe) {
    e.stopPropagation(); e.preventDefault()
    const row = e.currentTarget.closest('.timeline-track')
    const rect = row.getBoundingClientRect()
    lab.beginTransaction('Move keyframe')
    const move = ev => lab.moveKeyframe(layer.id,keyframe.id,((ev.clientX-rect.left)/rect.width)*lab.duration)
    const up = () => {
      window.removeEventListener('pointermove',move)
      window.removeEventListener('pointerup',up)
      lab.commitTransaction()
    }
    window.addEventListener('pointermove',move); window.addEventListener('pointerup',up)
  }

  return <section className={'timeline-shell '+(collapsed?'collapsed':'')}>
    <div className="timeline-topbar">
      <button className="play-control" onClick={()=>lab.setPlaying(!lab.playing)}>{lab.playing?'❚❚':'▶'}</button>
      <span className="timecode">{lab.time.toFixed(2)}s</span>
      <button className="tiny-btn" onClick={()=>lab.setTime(0)}>↤</button>
      <button className="tiny-btn" onClick={()=>lab.setTime(Math.max(0,lab.time-.05))}>‹</button>
      <button className="tiny-btn" onClick={()=>lab.setTime(Math.min(lab.duration,lab.time+.05))}>›</button>
      <div className="timeline-spacer"/>
      <button className="tiny-btn" onClick={()=>lab.addKeyframe()}>◆ Add keyframe</button>
      <button className="tiny-btn" onClick={()=>lab.deleteKeyframe()}>Delete</button>
      <button className="tiny-btn" onClick={()=>setCollapsed(v=>!v)}>{collapsed?'⌃':'⌄'}</button>
    </div>
    {!collapsed && <div className="timeline-content">
      <div className="timeline-label-column">
        <div className="timeline-ruler-label">Layers</div>
        {rows.map(({layer,depth})=><div key={layer.id} className={'timeline-layer-label '+(lab.selectedId===layer.id?'selected':'')} onClick={()=>lab.setSelectedId(layer.id)} style={{paddingLeft:10+depth*14}}>
          <span>{icon(layer.type)}</span><b>{layer.name}</b><small>{layer.keyframes?.length||0}</small>
        </div>)}
      </div>
      <div className="timeline-tracks" ref={trackRef}>
        <div className="time-ruler">
          {[0,.25,.5,.75,1,1.25,1.5,1.75,2].map(t=><span key={t} style={{left:`${secToPercent(t)}%`}}>{t.toFixed(t%1?2:1)}</span>)}
        </div>
        <div className="playhead" style={{left:`${secToPercent(lab.time)}%`}}><i/></div>
        {rows.map(({layer})=><div key={layer.id} className={'timeline-track '+(lab.selectedId===layer.id?'selected':'')} onClick={e=>{lab.setSelectedId(layer.id);setTimeFromEvent(e)}} onDoubleClick={e=>{const rect=e.currentTarget.getBoundingClientRect();const t=((e.clientX-rect.left)/rect.width)*lab.duration;lab.setSelectedId(layer.id);lab.setTime(t);setTimeout(()=>lab.addKeyframe(layer.id,t),0)}}>
          <div className="track-midline"/>
          {(layer.keyframes||[]).map(k=><button key={k.id} className={'kf '+(Math.abs(k.t-lab.time)<.04?'active':'')} style={{left:`${secToPercent(k.t)}%`}} title={`${k.t.toFixed(2)}s`} onPointerDown={e=>dragKeyframe(e,layer,k)} onClick={e=>{e.stopPropagation();lab.setSelectedId(layer.id);lab.setTime(k.t)}} />)}
        </div>)}
      </div>
    </div>}
  </section>
}
