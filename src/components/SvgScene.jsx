import React, { createElement, useMemo } from 'react'
import { proceduralTransform, propsAtTime } from '../lib/animation'

function camelAttr(name) {
  if (name === 'class') return 'className'
  if (name === 'xlink:href') return 'href'
  if (name === 'preserveAspectRatio') return name
  if (name.startsWith('data-') || name.startsWith('aria-')) return name
  return name.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
}

function parseStyle(value) {
  if (!value || typeof value !== 'string') return value
  return Object.fromEntries(value.split(';').map(x=>x.trim()).filter(Boolean).map(pair=>{
    const i=pair.indexOf(':'); if(i<0)return [pair,''];
    const key=pair.slice(0,i).trim().replace(/-([a-z])/g,(_,c)=>c.toUpperCase())
    return [key,pair.slice(i+1).trim()]
  }))
}

function leafProps(layer) {
  const p = {}
  Object.entries(layer.attrs || {}).forEach(([k,v]) => { const key=camelAttr(k); p[key]=key==='style'?parseStyle(v):v })
  const a = layer.appearance
  if (a.fillMode === 'none') p.fill = 'none'
  else if (a.fillMode === 'solid') p.fill = a.fill1
  else if (a.fillMode === 'gradient') p.fill = `url(#grad-${layer.id})`
  else if (layer.original?.fill != null) p.fill = layer.original.fill
  if (a.strokeMode === 'none') p.stroke = 'none'
  else if (a.strokeMode === 'custom') { p.stroke = a.stroke; p.strokeWidth = a.strokeWidth }
  else if (layer.original?.stroke != null) p.stroke = layer.original.stroke
  if (layer.original?.strokeWidth != null && a.strokeMode === 'original') p.strokeWidth = layer.original.strokeWidth
  return p
}

export default function SvgScene({ lab, registerRef }) {
  const roots = lab.childrenOf(null)
  const defs = lab.layers.filter(l => l.defsMarkup).map(l => l.defsMarkup).join('')

  const gradients = lab.layers.filter(l => l.appearance?.fillMode === 'gradient').map(l => {
    const a=l.appearance, rad=a.angle*Math.PI/180, dx=Math.cos(rad)*50,dy=Math.sin(rad)*50
    return <linearGradient key={l.id} id={`grad-${l.id}`} x1={`${50-dx}%`} y1={`${50-dy}%`} x2={`${50+dx}%`} y2={`${50+dy}%`}>
      <stop offset="0%" stopColor={a.fill1}/><stop offset="100%" stopColor={a.fill2}/>
    </linearGradient>
  })

  function Node({ layer }) {
    if (layer.visible === false) return null
    const props = propsAtTime(layer, lab.time)
    const transform = [layer.baseTransform || '', `translate(${props.transform.x} ${props.transform.y})`, `rotate(${props.transform.rotation})`, `scale(${props.transform.scale})`].join(' ')
    const motion = proceduralTransform(props.motion, lab.time, lab.duration)
    const children = lab.childrenOf(layer.id)
    const isFocused = lab.editorMode==='prototype' && layer.prototype?.focusable && lab.focusedId===layer.id
    const isPressed = isFocused && lab.pressedId===layer.id
    const focusScale = layer.prototype?.scale ?? lab.focusSettings.scale
    const visualScale = isPressed ? Math.max(1,focusScale-.04) : isFocused ? focusScale : 1
    const focusStyle = lab.editorMode==='prototype' ? {
      transformBox:'fill-box', transformOrigin:'center', transform:`scale(${visualScale})`,
      transition:`transform ${isPressed?90:lab.focusSettings.duration}ms ${lab.focusSettings.easing}, filter ${lab.focusSettings.duration}ms ${lab.focusSettings.easing}`,
      filter:isFocused?'drop-shadow(0 10px 18px rgba(0,0,0,.24))':'none'
    } : undefined
    const content = layer.type === 'screenCrop'
      ? (() => {
          const crop=layer.screenCrop
          if(!crop)return null
          return <rect x="0" y="0" width={crop.width} height={crop.height} fill="transparent" pointerEvents="none"/>
        })()
      : layer.type === 'focusCrop'
        ? (() => {
            const crop=layer.crop
            if(!crop)return null
            return <rect x={crop.x} y={crop.y} width={crop.width} height={crop.height} fill="transparent" pointerEvents="all"/>
          })()
        : layer.type === 'shape' || layer.type === 'text' || layer.type === 'image'
          ? createElement(layer.tag || (layer.type === 'image' ? 'image' : 'g'), leafProps(layer), layer.textContent || undefined)
          : children.map(c => <Node key={c.id} layer={c} />)
    return <g
      ref={el => registerRef(layer.id, el)}
      data-layer-id={layer.id}
      transform={transform}
      opacity={props.opacity}
      className={lab.selectedId === layer.id ? 'scene-layer selected' : 'scene-layer'}
      onPointerDown={e => {
        e.stopPropagation()
        lab.setSelectedId(layer.id)
        if(lab.editorMode==='prototype' && layer.prototype?.focusable) lab.setFocusedId(layer.id)
      }}
    >
      <g transform={motion}><g style={focusStyle}>{content}</g></g>
    </g>
  }

  return <>
    <defs dangerouslySetInnerHTML={{__html: defs}} />
    <defs>{gradients}</defs>
    {roots.map(r => <Node key={r.id} layer={r} />)}
  </>
}
