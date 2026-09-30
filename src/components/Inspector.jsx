import React from 'react'

function Slider({ value, min, max, step=.01, onChange, suffix='', precision=2, onStart, onEnd }) {
  return <div className="slider-row"><input
    type="range" min={min} max={max} step={step} value={value}
    onPointerDown={onStart} onPointerUp={onEnd}
    onFocus={onStart} onBlur={onEnd}
    onChange={e=>onChange(+e.target.value)}
  /><span>{precision===0?Math.round(value):Number(value).toFixed(precision)}{suffix}</span></div>
}

function Section({ title, children, open=true }) { return <section className="inspector-section"><div className="section-title"><span>{open?'⌄':'›'}</span>{title}</div>{children}</section> }

function TransactionNumber({ value, step, onChange, lab, label }) {
  return <input type="number" value={value} step={step} onFocus={()=>lab.beginTransaction(label)} onBlur={lab.commitTransaction} onChange={e=>onChange(+e.target.value)}/>
}

function TxColor({ value, onChange, lab, label }) {
  return <input type="color" value={value} onFocus={()=>lab.beginTransaction(label)} onBlur={lab.commitTransaction} onChange={e=>onChange(e.target.value)}/>
}

const gesture = (lab,label) => ({ onStart:()=>lab.beginTransaction(label), onEnd:lab.commitTransaction })

export default function Inspector({ lab }) {
  const l = lab.selected
  const p = l ? lab.currentProps(l) : null
  const paintTargets = l ? (['shape','text'].includes(l.type) ? [l] : lab.descendantsOf(l.id).filter(x=>['shape','text'].includes(x.type))) : []
  const paint = paintTargets[0]
  const parents = l ? [null, ...lab.layers.filter(x=>lab.isGroup(x) && x.id!==l.id && !lab.descendantsOf(l.id).some(d=>d.id===x.id))] : []

  if (!l) return <aside className="inspector"><div className="inspector-head">Design</div><div className="empty-inspector">Select a layer to edit its motion and appearance.</div></aside>

  return <aside className="inspector">
    <div className="inspector-tabs"><button className="active">Design</button><button>Prototype</button><button>Inspect</button></div>
    <div className="inspector-scroll">
      <div className="selected-title"><b>{l.name}</b><span>{l.type}</span></div>
      <Section title="Layer">
        <div className="field-grid"><label>Parent</label><select value={l.parentId||''} onChange={e=>lab.reparent(l.id,e.target.value||null)}>{parents.map(x=><option key={x?.id||'root'} value={x?.id||''}>{x?.name||'Scene Root'}</option>)}</select></div>
        <div className="xy-grid">
          <label>X<TransactionNumber lab={lab} label="Change X" value={Math.round(p.transform.x)} onChange={v=>lab.updateTimed('transform','x',v)}/></label>
          <label>Y<TransactionNumber lab={lab} label="Change Y" value={Math.round(p.transform.y)} onChange={v=>lab.updateTimed('transform','y',v)}/></label>
          <label>W<TransactionNumber lab={lab} label="Scale layer" value={p.transform.scale.toFixed(2)} step=".01" onChange={v=>lab.updateTimed('transform','scale',v)}/></label>
          <label>°<TransactionNumber lab={lab} label="Rotate layer" value={Math.round(p.transform.rotation)} onChange={v=>lab.updateTimed('transform','rotation',v)}/></label>
        </div>
        <div className="field-grid"><label>Opacity</label><Slider value={p.opacity} min={0} max={1} step={.01} onChange={v=>lab.updateTimed('opacity','opacity',v)} {...gesture(lab,'Change opacity')}/></div>
      </Section>

      <Section title="Fill">
        {paint ? <>
          <div className="field-grid"><label>Mode</label><select value={paint.appearance.fillMode} onChange={e=>lab.updateAppearance('fillMode',e.target.value)}><option value="original">Original</option><option value="solid">Solid</option><option value="gradient">Gradient</option><option value="none">None</option></select></div>
          <div className="color-line"><TxColor lab={lab} label="Change fill color" value={paint.appearance.fill1} onChange={v=>lab.updateAppearance('fill1',v)}/><TxColor lab={lab} label="Change gradient color" value={paint.appearance.fill2} onChange={v=>lab.updateAppearance('fill2',v)}/><span>{paint.appearance.fillMode}</span></div>
          {paint.appearance.fillMode==='gradient'&&<Slider value={paint.appearance.angle} min={0} max={360} step={1} precision={0} suffix="°" onChange={v=>lab.updateAppearance('angle',v)} {...gesture(lab,'Change gradient angle')}/>} 
        </> : <div className="microcopy">Raster images do not expose vector fill.</div>}
      </Section>

      <Section title="Stroke">
        {paint ? <>
          <div className="field-grid"><label>Mode</label><select value={paint.appearance.strokeMode} onChange={e=>lab.updateAppearance('strokeMode',e.target.value)}><option value="original">Original</option><option value="custom">Custom</option><option value="none">None</option></select></div>
          <div className="color-line"><TxColor lab={lab} label="Change stroke color" value={paint.appearance.stroke} onChange={v=>lab.updateAppearance('stroke',v)}/><TransactionNumber lab={lab} label="Change stroke width" value={paint.appearance.strokeWidth} step=".5" onChange={v=>lab.updateAppearance('strokeWidth',v)}/><span>px</span></div>
        </> : <div className="microcopy">No vector stroke available.</div>}
      </Section>

      <Section title="Motion">
        <div className="toggle-line"><span>Enabled</span><button className={'toggle '+(p.motion.enabled?'on':'')} onClick={()=>lab.updateTimed('motion','enabled',!p.motion.enabled)}><i/></button></div>
        <label className="prop-label">Wave<Slider value={p.motion.wave} min={0} max={2} step={.05} onChange={v=>lab.updateTimed('motion','wave',v)} {...gesture(lab,'Change motion · wave')}/></label>
        <label className="prop-label">Hop<Slider value={p.motion.hop} min={0} max={2} step={.05} onChange={v=>lab.updateTimed('motion','hop',v)} {...gesture(lab,'Change motion · hop')}/></label>
        <label className="prop-label">Bounce<Slider value={p.motion.bounce} min={0} max={1.5} step={.05} onChange={v=>lab.updateTimed('motion','bounce',v)} {...gesture(lab,'Change motion · bounce')}/></label>
        <label className="prop-label">Rotate<Slider value={p.motion.rotate} min={0} max={45} step={1} precision={0} suffix="°" onChange={v=>lab.updateTimed('motion','rotate',v)} {...gesture(lab,'Change motion · rotate')}/></label>
        <label className="prop-label">Delay<Slider value={p.motion.delay} min={0} max={2} step={.05} onChange={v=>lab.updateTimed('motion','delay',v)} {...gesture(lab,'Change motion · delay')}/></label>
      </Section>
    </div>
  </aside>
}
