const DRAWABLE = new Set(['path','rect','circle','ellipse','polygon','polyline','line','text','use'])
const GROUPS = new Set(['g','svg'])

export function uid(prefix = 'layer') {
  uid.n = (uid.n || 0) + 1
  return `${prefix}-${uid.n}`
}

export const defaultMotion = (enabled = false) => ({
  enabled, wave: 1, hop: 1, bounce: 0.65, rotate: 0, delay: 0,
})
export const defaultTransform = () => ({ x: 0, y: 0, scale: 1, rotation: 0 })
export const defaultAppearance = () => ({
  fillMode: 'original', fill1: '#fff6dd', fill2: '#ffb347', angle: 90,
  strokeMode: 'original', stroke: '#ffffff', strokeWidth: 0, opacity: 1,
})

function sanitizeDoc(doc, prefix) {
  doc.querySelectorAll('script,foreignObject,iframe,object,embed,video,audio').forEach(n => n.remove())
  doc.querySelectorAll('*').forEach(el => {
    ;[...el.attributes].forEach(a => {
      if (/^on/i.test(a.name) || /^javascript:/i.test(a.value)) el.removeAttribute(a.name)
    })
  })
  const map = new Map()
  doc.querySelectorAll('[id]').forEach(el => {
    const old = el.id
    el.dataset.motionName = el.getAttribute('data-name') || old
    const next = prefix + old.replace(/[^a-zA-Z0-9_-]/g, '-')
    map.set(old, next)
    el.id = next
  })
  const replaceRefs = value => {
    let out = value
    for (const [old, next] of map) {
      out = out.replaceAll(`url(#${old})`, `url(#${next})`).replaceAll(`#${old}`, `#${next}`)
    }
    return out
  }
  doc.querySelectorAll('*').forEach(el => {
    ;[...el.attributes].forEach(a => {
      if (a.name !== 'id' && a.name !== 'data-motion-name') el.setAttribute(a.name, replaceRefs(a.value))
    })
    if (el.tagName?.toLowerCase() === 'style') el.textContent = replaceRefs(el.textContent)
  })
  return doc
}

function attrsFromNode(node) {
  const attrs = {}
  for (const a of [...node.attributes]) {
    if (a.name === 'transform' || a.name === 'data-motion-name' || a.name === 'id') continue
    attrs[a.name] = a.value
  }
  return attrs
}

function originalPaint(attrs) {
  return {
    fill: attrs.fill ?? null,
    stroke: attrs.stroke ?? null,
    strokeWidth: attrs['stroke-width'] ?? null,
    opacity: attrs.opacity ?? null,
  }
}

function hexColor(v, fallback = '#ffffff') {
  if (!v || v === 'none' || String(v).startsWith('url(') || v === 'currentColor') return fallback
  const s = String(v).trim()
  if (/^#[0-9a-f]{6}$/i.test(s)) return s
  if (/^#[0-9a-f]{3}$/i.test(s)) return '#' + s.slice(1).split('').map(c => c + c).join('')
  return fallback
}

function nodeName(node, idx) {
  return node.getAttribute?.('data-name') || node.dataset?.motionName || node.getAttribute?.('aria-label') || node.getAttribute?.('id') || `${node.tagName?.toLowerCase() || 'layer'} ${idx}`
}

export function importSvg(svgText, objectIndex = 0, fileName = 'Figma SVG') {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgText, 'image/svg+xml')
  if (doc.querySelector('parsererror') || doc.documentElement.tagName.toLowerCase() !== 'svg') {
    throw new Error('SVG를 해석하지 못했습니다.')
  }
  const prefix = `imp${Date.now().toString(36)}-${objectIndex}-`
  sanitizeDoc(doc, prefix)
  const svg = doc.documentElement
  const vb = (svg.getAttribute('viewBox') || '').trim().split(/[ ,]+/).map(Number)
  let minX = 0, minY = 0, width = Number(svg.getAttribute('width')) || 200, height = Number(svg.getAttribute('height')) || 200
  if (vb.length === 4 && vb.every(Number.isFinite)) [minX, minY, width, height] = vb
  const size = 220
  const scale = size / Math.max(width || 1, height || 1)
  const offset = ((objectIndex % 5) - 2) * 28
  const tx = 400 + offset - (minX + width / 2) * scale
  const ty = 280 - (minY + height / 2) * scale
  const rootId = uid('svg')
  const layers = [{
    id: rootId, name: fileName, type: 'svgRoot', parentId: null, order: objectIndex,
    baseTransform: `translate(${tx} ${ty}) scale(${scale})`, transform: defaultTransform(),
    motion: defaultMotion(true), appearance: defaultAppearance(), keyframes: [], attrs: {}, original: null,
    defsMarkup: [...svg.children].filter(n => ['defs','style'].includes(n.tagName.toLowerCase())).map(n => n.tagName.toLowerCase()==='defs' ? n.innerHTML : n.outerHTML).join(''),
  }]
  const counter = { n: 0 }
  const walk = (node, parentId, depth = 0) => {
    if (node.nodeType !== 1) return
    const tag = node.tagName.toLowerCase()
    if (['defs','style','title','desc'].includes(tag)) return
    if (GROUPS.has(tag)) {
      let base = node.getAttribute('transform') || ''
      if (tag === 'svg') {
        const x = node.getAttribute('x') || 0, y = node.getAttribute('y') || 0
        base = `translate(${x} ${y}) ${base}`.trim()
      }
      const id = uid('group')
      layers.push({ id, name: nodeName(node, ++counter.n), type: 'group', parentId, order: counter.n,
        baseTransform: base, transform: defaultTransform(), motion: defaultMotion(false), appearance: defaultAppearance(), keyframes: [], attrs: {}, original: null })
      ;[...node.children].forEach(child => walk(child, id, depth + 1))
      return
    }
    if (DRAWABLE.has(tag) || tag === 'image') {
      const attrs = attrsFromNode(node)
      const original = originalPaint(attrs)
      const type = tag === 'text' ? 'text' : tag === 'image' ? 'image' : 'shape'
      const app = defaultAppearance()
      app.fill1 = hexColor(original.fill, '#fff6dd')
      app.stroke = hexColor(original.stroke, '#ffffff')
      app.strokeWidth = Number(original.strokeWidth) || 0
      layers.push({ id: uid('layer'), name: nodeName(node, ++counter.n), type, tag, parentId, order: counter.n,
        baseTransform: node.getAttribute('transform') || '', transform: defaultTransform(), motion: defaultMotion(false), appearance: app, keyframes: [], attrs, original, textContent: tag === 'text' ? node.textContent : null })
    }
  }
  ;[...svg.children].forEach(child => walk(child, rootId))
  return layers
}

export function createRasterLayer(dataUrl, name = 'Image', objectIndex = 0) {
  const offset = ((objectIndex % 5) - 2) * 28
  return {
    id: uid('image'), name, type: 'image', tag: 'image', parentId: null, order: objectIndex,
    baseTransform: `translate(${400 + offset} 280)`, transform: defaultTransform(), motion: defaultMotion(true),
    appearance: defaultAppearance(), keyframes: [], original: null,
    attrs: { href: dataUrl, x: '-110', y: '-110', width: '220', height: '220', preserveAspectRatio: 'xMidYMid meet' },
  }
}

export const defaultBookmarkSvg = `<svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg"><g id="Bookmark"><path id="Bookmark Shape" d="M34 15 Q18 15 18 34 L18 208 Q18 224 32 214 L100 165 L168 214 Q182 224 182 208 L182 34 Q182 15 166 15 Z" fill="#fff6dd"/><path id="Inner Accent" d="M47 43 H153" fill="none" stroke="#fff6dd" stroke-width="7" stroke-linecap="round" opacity=".55"/></g></svg>`
