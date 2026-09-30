import React, { useMemo, useRef } from 'react'

const icon = type => ({ svgRoot:'◇', userGroup:'▾', group:'▾', image:'▧', text:'T', shape:'◆', focusCrop:'▭' }[type] || '•')
const typeLabel = type => ({ svgRoot:'SVG', userGroup:'GROUP', group:'GROUP', image:'IMAGE', text:'TEXT', shape:'PATH', focusCrop:'FOCUS' }[type] || type?.toUpperCase())

export default function LayersPanel({ lab, onPaste }) {
  const fileRef = useRef(null)
  const roots = lab.childrenOf(null)

  async function handleFiles(files) {
    for (const file of files) {
      const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')
      if (isSvg) lab.importSvgText(await file.text(), file.name)
      else if (file.type.startsWith('image/')) {
        const dataUrl = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload=()=>resolve(r.result); r.onerror=reject; r.readAsDataURL(file) })
        lab.importRaster(dataUrl, file.name)
      }
    }
  }

  function LayerRow({ layer, depth = 0 }) {
    const children = lab.childrenOf(layer.id)
    return <>
      <div
        className={'layer-row ' + (lab.selectedId === layer.id ? 'selected' : '')}
        style={{ paddingLeft: 8 + depth * 14 }}
        draggable
        onClick={() => lab.setSelectedId(layer.id)}
        onDragStart={e => { e.dataTransfer.setData('text/layer-id', layer.id); e.dataTransfer.effectAllowed='move' }}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault()
          const sourceId = e.dataTransfer.getData('text/layer-id')
          if (!sourceId || sourceId === layer.id) return
          const r = e.currentTarget.getBoundingClientRect()
          const x = e.clientX - r.left
          const y = e.clientY - r.top
          const mode = lab.isGroup(layer) && x > 46 ? 'inside' : (y < r.height/2 ? 'before' : 'after')
          lab.reorderNear(sourceId, layer.id, mode)
        }}
      >
        <button className="visibility" onClick={e => { e.stopPropagation(); lab.replaceLayer(layer.id, l => ({...l, visible: !l.visible}), 'Toggle visibility') }}>{layer.visible === false ? '○' : '◉'}</button>
        <span className="layer-icon">{icon(layer.type)}</span>
        <span className="layer-name">{layer.name}</span>
        <span className="layer-kind">{typeLabel(layer.type)}</span>
      </div>
      {children.map(c => <LayerRow key={c.id} layer={c} depth={depth+1} />)}
    </>
  }

  return <aside className="layers-panel">
    <div className="panel-tabs"><button className="active">Layers</button><button>Assets</button></div>
    <div className="import-block">
      <div className="import-buttons">
        <button onClick={onPaste}>Paste from Figma</button>
        <button onClick={() => fileRef.current?.click()}>Import</button>
      </div>
      <div className="dropbox" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();handleFiles([...e.dataTransfer.files])}}>
        SVG · PNG · JPG · WebP<br/><span>Drop files here</span>
      </div>
      <input ref={fileRef} hidden multiple type="file" accept=".svg,image/svg+xml,image/png,image/jpeg,image/webp" onChange={e=>handleFiles([...e.target.files])}/>
    </div>
    <div className="layer-actions">
      <button onClick={lab.addGroup}>＋</button><button title="Delete" onClick={lab.deleteSelected}>⌫</button><span>{lab.layers.length} layers</span>
    </div>
    <div className="tree-help">Drag to reorder · drag into a group to nest</div>
    <div className="layer-tree">{roots.map(r => <LayerRow key={r.id} layer={r} />)}</div>
  </aside>
}
