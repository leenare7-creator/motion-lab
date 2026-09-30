import React from 'react'

function Section({ title, children }) {
  return <section className="inspector-section"><div className="section-title"><span>⌄</span>{title}</div>{children}</section>
}

export default function PrototypeInspector({ lab }) {
  const l = lab.selected
  const focusables = lab.focusableLayers
  const proto = l?.prototype || { focusable:false, links:{ up:null, down:null, left:null, right:null } }
  const scale = proto.scale ?? lab.focusSettings.scale

  const targetOptions = (dir) => <select value={proto.links?.[dir] || ''} onChange={e=>lab.setFocusLink(l.id, dir, e.target.value || null)}>
    <option value="">Auto</option>
    {focusables.filter(x=>x.id!==l.id).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
  </select>

  return <aside className="inspector prototype-inspector">
    <div className="inspector-tabs">
      <button onClick={()=>lab.setEditorMode('animate')}>Design</button>
      <button className="active">Prototype</button>
      <button>Inspect</button>
    </div>
    <div className="inspector-scroll">
      {!l ? <div className="prototype-empty">
        <b>IPTV Focus Prototype</b>
        <p>레이어를 선택하고 Focus target으로 지정하세요. 방향키 또는 화면의 리모컨으로 포커스 이동을 테스트할 수 있습니다.</p>
        <button className="prototype-primary" onClick={lab.addIptvDemo}>Add IPTV focus demo</button>
      </div> : <>
        <div className="selected-title"><b>{l.name}</b><span>{l.type}</span></div>
        {l.prototype?.autoDetected&&<div className="auto-focus-note"><b>Auto detected · {l.prototype.confidence}</b><span>{l.prototype.reason}</span></div>}
        <Section title="Focus target">
          <div className="toggle-line"><span>Focusable</span><button className={'toggle '+(proto.focusable?'on':'')} onClick={()=>lab.setLayerPrototype(l.id,{focusable:!proto.focusable})}><i/></button></div>
          {proto.focusable && <>
            <div className="field-grid"><label>Focus ID</label><input className="proto-text" value={proto.focusId || l.id} onChange={e=>lab.setLayerPrototype(l.id,{focusId:e.target.value})}/></div>
            <button className="full-btn" onClick={()=>lab.setFocusedId(l.id)}>Set as start focus</button>
          </>}
        </Section>

        {proto.focusable && <Section title="D-pad navigation">
          <div className="direction-grid">
            <label>↑ Up{targetOptions('up')}</label>
            <label>↓ Down{targetOptions('down')}</label>
            <label>← Left{targetOptions('left')}</label>
            <label>→ Right{targetOptions('right')}</label>
          </div>
          <div className="microcopy">Auto는 화면상 위치를 기준으로 가장 자연스러운 후보를 자동 선택합니다. 특정 이동만 직접 연결할 수도 있습니다.</div>
        </Section>}

        <Section title="Focus transition">
          <div className="field-grid"><label>Duration</label><div className="proto-inline"><input type="range" min="60" max="500" step="10" value={lab.focusSettings.duration} onChange={e=>lab.updateFocusSetting('duration',+e.target.value)}/><span>{lab.focusSettings.duration}ms</span></div></div>
          <div className="field-grid"><label>Scale</label><div className="proto-inline"><input type="range" min="1" max="1.2" step=".01" value={scale} onChange={e=>lab.setLayerPrototype(l.id,{scale:+e.target.value})}/><span>{Number(scale).toFixed(2)}</span></div></div>
          <div className="field-grid"><label>Easing</label><select value={lab.focusSettings.easingPreset} onChange={e=>lab.setFocusEasingPreset(e.target.value)}><option value="tv">TV ease-out</option><option value="spring">Spring-like</option><option value="snappy">Snappy</option><option value="linear">Linear</option></select></div>
          <div className="field-grid"><label>Ring gap</label><div className="proto-inline"><input type="range" min="0" max="20" step="1" value={lab.focusSettings.ringGap} onChange={e=>lab.updateFocusSetting('ringGap',+e.target.value)}/><span>{lab.focusSettings.ringGap}px</span></div></div>
          <div className="prototype-behavior"><span>Rapid input</span><b>Interrupt current transition</b></div>
        </Section>

        <Section title="Test">
          <div className="prototype-current">Focused <b>{lab.focusedLayer?.name || 'None'}</b></div>
          <div className="microcopy">키보드 ↑ ↓ ← → / Enter도 TV 리모컨처럼 동작합니다.</div>
          <button className="full-btn" onClick={lab.addIptvDemo}>Add demo cards</button>
        </Section>
      </>}
    </div>
  </aside>
}
