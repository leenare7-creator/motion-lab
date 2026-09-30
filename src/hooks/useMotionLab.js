import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cloneProps, propsAtTime } from '../lib/animation'
import { createRasterLayer, defaultAppearance, defaultBookmarkSvg, defaultMotion, defaultTransform, importSvg, uid } from '../lib/svgImport'
import { useCommandHistory } from './useCommandHistory'

const EPS = .04
const emptyLinks=()=>({up:null,down:null,left:null,right:null})
const focusProto=(extra={})=>({focusable:false,focusId:'',scale:null,links:emptyLinks(),...extra})

function uiStudioLayers(payload){
  const w=Number(payload?.viewport?.width)||1920,h=Number(payload?.viewport?.height)||1080
  const href=payload?.sourceImageUrl
  if(!href)throw new Error('UI Studio 화면 이미지가 없습니다.')
  const scale=Math.min(720/w,460/h)
  const ox=(800-w*scale)/2,oy=(560-h*scale)/2
  const base=`translate(${ox} ${oy}) scale(${scale})`
  const background={
    id:uid('ui-screen'),name:payload.title||'UI Studio screen',type:'image',tag:'image',parentId:null,order:0,
    baseTransform:base,transform:defaultTransform(),motion:defaultMotion(false),appearance:defaultAppearance(),keyframes:[],
    original:null,attrs:{href,x:'0',y:'0',width:String(w),height:String(h),preserveAspectRatio:'none'},
    prototype:focusProto(),sourceMeta:{fileKey:payload.fileKey,nodeId:payload.nodeId,deepLink:payload.deepLink}
  }
  const focusables=(payload.focusables||[]).map((f,i)=>({
    id:uid('focus'),name:f.name||`Focus ${i+1}`,type:'focusCrop',parentId:null,order:i+1,
    baseTransform:base,transform:defaultTransform(),motion:defaultMotion(false),appearance:defaultAppearance(),keyframes:[],
    attrs:{},original:null,
    crop:{x:Number(f.x)||0,y:Number(f.y)||0,width:Number(f.width)||1,height:Number(f.height)||1,screenWidth:w,screenHeight:h,href},
    prototype:focusProto({focusable:true,focusId:f.id||`focus-${i+1}`,scale:null,autoDetected:true,confidence:f.confidence||'medium',reason:f.reason||'UI Studio auto detection',nodeType:f.nodeType||'FRAME'})
  }))
  return [background,...focusables]
}

const initialLayers = () => {
  const initial = importSvg(defaultBookmarkSvg, 0, 'Bookmark / Figma SVG')
  const root = initial[0]
  const shape = initial.find(x => x.type === 'shape')
  const props = l => ({ transform:{...l.transform}, motion:{...l.motion}, opacity:l.appearance.opacity })
  if (root) {
    const a=props(root), b=props(root), c=props(root)
    b.transform.y=-18; b.transform.scale=1.08; b.transform.rotation=4
    root.keyframes=[{id:uid('kf'),t:0,props:a},{id:uid('kf'),t:1,props:b},{id:uid('kf'),t:2,props:c}]
  }
  if (shape) {
    const a=props(shape), b=props(shape), c=props(shape)
    b.opacity=.82; b.transform.scale=.96
    shape.keyframes=[{id:uid('kf'),t:0,props:a},{id:uid('kf'),t:1,props:b},{id:uid('kf'),t:2,props:c}]
  }
  return initial
}

const commandLabel = (kind, key) => {
  if (kind === 'opacity') return 'Change opacity'
  if (kind === 'transform') return `Change ${key}`
  if (kind === 'motion') return `Change motion · ${key}`
  return 'Edit layer'
}

function demoCard(name,x,y,order){
  const id=uid('card'),rectId=uid('rect'),textId=uid('text')
  const group={id,name,type:'userGroup',parentId:null,order,baseTransform:`translate(${x} ${y})`,transform:defaultTransform(),motion:defaultMotion(false),appearance:defaultAppearance(),keyframes:[],attrs:{},original:null,prototype:focusProto({focusable:true,focusId:name.toLowerCase().replace(/\\s+/g,'-'),scale:1.08})}
  const rect={id:rectId,name:`${name} / Surface`,type:'shape',tag:'rect',parentId:id,order:0,baseTransform:'',transform:defaultTransform(),motion:defaultMotion(false),appearance:defaultAppearance(),keyframes:[],attrs:{x:'-78',y:'-48',width:'156',height:'96',rx:'12',fill:'#30343b'},original:{fill:'#30343b',stroke:null,strokeWidth:null,opacity:null},prototype:focusProto()}
  const text={id:textId,name:`${name} / Label`,type:'text',tag:'text',parentId:id,order:1,baseTransform:'',transform:defaultTransform(),motion:defaultMotion(false),appearance:defaultAppearance(),keyframes:[],attrs:{x:'0',y:'7','text-anchor':'middle',fill:'#ffffff','font-size':'16','font-weight':'650'},original:{fill:'#ffffff',stroke:null,strokeWidth:null,opacity:null},textContent:name,prototype:focusProto()}
  return [group,rect,text]
}

export function useMotionLab() {
  const [layers, setLayersState] = useState(initialLayers)
  const layersRef = useRef(layers)
  const [selectedId, setSelectedId] = useState(() => null)
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [loop, setLoop] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [duration] = useState(2)
  const [theme, setTheme] = useState('tomato')
  const [sparks, setSparks] = useState(true)
  const [editorMode,setEditorMode]=useState('animate')
  const [focusedId,setFocusedId]=useState(null)
  const [pressedId,setPressedId]=useState(null)
  const [sourceContext,setSourceContext]=useState(null)
  const [focusSettings,setFocusSettings]=useState({duration:180,easingPreset:'tv',easing:'cubic-bezier(.2,0,0,1)',scale:1.08,ringGap:6,rapid:'interrupt'})
  const [snapshots, setSnapshots] = useState([])
  const [toast, setToast] = useState('')
  const rafRef = useRef(0)
  const lastRef = useRef(performance.now())

  const restoreSnapshot = useCallback(snapshot => {
    layersRef.current = snapshot
    setLayersState(snapshot)
    setSelectedId(current => snapshot.some(l => l.id === current) ? current : (snapshot[0]?.id || null))
    setFocusedId(current => snapshot.some(l => l.id === current) ? current : null)
  }, [])

  const history = useCommandHistory({ restoreSnapshot, limit: 120 })

  const applyLayers = useCallback((label, producer, { record = true } = {}) => {
    const before = layersRef.current
    const after = producer(before)
    if (!after || after === before) return before
    layersRef.current = after
    setLayersState(after)
    if (record && !history.isTransactionActive()) history.record(label, before, after)
    return after
  }, [history])

  const beginTransaction = useCallback(label => history.beginTransaction(label, layersRef.current), [history])
  const commitTransaction = useCallback(() => history.commitTransaction(layersRef.current), [history])
  const cancelTransaction = useCallback(() => history.cancelTransaction(), [history])

  const flashHistory = useCallback(message => {
    setToast(message)
    window.clearTimeout(flashHistory._t)
    flashHistory._t = window.setTimeout(() => setToast(''), 1400)
  }, [])

  const undo = useCallback(() => {
    if (history.isTransactionActive()) history.commitTransaction(layersRef.current)
    const cmd = history.undo()
    if (cmd) flashHistory(`Undo · ${cmd.label}`)
  }, [history, flashHistory])

  const redo = useCallback(() => {
    if (history.isTransactionActive()) history.commitTransaction(layersRef.current)
    const cmd = history.redo()
    if (cmd) flashHistory(`Redo · ${cmd.label}`)
  }, [history, flashHistory])

  useEffect(() => {
    if (!selectedId && layers.length) setSelectedId(layers[0].id)
  }, [layers, selectedId])

  useEffect(() => {
    const tick = now => {
      const dt = (now - lastRef.current) / 1000
      lastRef.current = now
      if (playing) {
        setTime(t => {
          let next = t + dt * speed
          if (next >= duration) {
            if (loop) next %= duration
            else { next = duration; setPlaying(false) }
          }
          return next
        })
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [playing, speed, loop, duration])

  const notify = useCallback(msg => {
    setToast(msg)
    window.clearTimeout(notify._t)
    notify._t = window.setTimeout(() => setToast(''), 1600)
  }, [])

  const selected = useMemo(() => layers.find(l => l.id === selectedId) || null, [layers, selectedId])
  const focusedLayer = useMemo(() => layers.find(l => l.id === focusedId) || null, [layers, focusedId])
  const focusableLayers = useMemo(() => layers.filter(l => l.prototype?.focusable), [layers])
  const childrenOf = useCallback(parentId => layers.filter(l => l.parentId === parentId).sort((a,b) => a.order - b.order), [layers])
  const descendantsOf = useCallback(id => {
    const out = []
    const walk = pid => childrenOf(pid).forEach(c => { out.push(c); walk(c.id) })
    walk(id); return out
  }, [childrenOf])
  const isGroup = useCallback(layer => !!layer && ['svgRoot','group','userGroup'].includes(layer.type), [])

  const replaceLayer = useCallback((id, fn, label='Edit layer') => {
    applyLayers(label, prev => {
      let changed = false
      const next = prev.map(l => {
        if (l.id !== id) return l
        const updated = fn(l)
        if (updated !== l) changed = true
        return updated
      })
      return changed ? next : prev
    })
  }, [applyLayers])

  const currentProps = useCallback(layer => propsAtTime(layer, time), [time])

  const updateTimed = useCallback((kind, key, value) => {
    if (!selectedId) return
    applyLayers(commandLabel(kind,key), prev => prev.map(layer => {
      if (layer.id !== selectedId) return layer
      if ((layer.keyframes || []).length) {
        const existing = layer.keyframes.find(k => Math.abs(k.t - time) <= EPS)
        const baseProps = existing ? cloneProps(existing.props) : propsAtTime(layer, time)
        if (kind === 'transform') baseProps.transform[key] = value
        if (kind === 'motion') baseProps.motion[key] = value
        if (kind === 'opacity') baseProps.opacity = value
        const keyframes = existing
          ? layer.keyframes.map(k => k.id === existing.id ? { ...k, t: time, props: baseProps } : k)
          : [...layer.keyframes, { id: uid('kf'), t: time, props: baseProps }]
        return { ...layer, keyframes: keyframes.sort((a,b) => a.t - b.t) }
      }
      if (kind === 'transform') return { ...layer, transform: { ...layer.transform, [key]: value } }
      if (kind === 'motion') return { ...layer, motion: { ...layer.motion, [key]: value } }
      return { ...layer, appearance: { ...layer.appearance, opacity: value } }
    }))
  }, [selectedId, time, applyLayers])

  const addKeyframe = useCallback((layerId = selectedId, at = time) => {
    if (!layerId) return
    applyLayers('Add keyframe', prev => prev.map(layer => {
      if (layer.id !== layerId) return layer
      const props = propsAtTime(layer, at)
      const existing = layer.keyframes.find(k => Math.abs(k.t - at) <= EPS)
      const keyframes = existing
        ? layer.keyframes.map(k => k.id === existing.id ? { ...k, t: at, props: cloneProps(props) } : k)
        : [...layer.keyframes, { id: uid('kf'), t: at, props: cloneProps(props) }]
      return { ...layer, keyframes: keyframes.sort((a,b) => a.t - b.t) }
    }))
    notify('키프레임을 저장했습니다.')
  }, [selectedId, time, notify, applyLayers])

  const deleteKeyframe = useCallback((layerId = selectedId, at = time) => {
    if (!layerId) return
    applyLayers('Delete keyframe', prev => prev.map(layer => layer.id === layerId ? { ...layer, keyframes: layer.keyframes.filter(k => Math.abs(k.t - at) > EPS) } : layer))
  }, [selectedId, time, applyLayers])

  const moveKeyframe = useCallback((layerId, keyId, nextTime) => {
    const clamped = Math.max(0, Math.min(duration, nextTime))
    applyLayers('Move keyframe', prev => prev.map(l => l.id === layerId ? { ...l, keyframes: l.keyframes.map(k => k.id === keyId ? { ...k, t: clamped } : k).sort((a,b) => a.t - b.t) } : l))
  }, [duration, applyLayers])

  const updateAppearance = useCallback((key, value) => {
    if (!selected) return
    const ids = selected.type === 'shape' || selected.type === 'text' ? [selected.id] : descendantsOf(selected.id).filter(l => ['shape','text'].includes(l.type)).map(l => l.id)
    applyLayers(`Change ${key}`, prev => prev.map(l => ids.includes(l.id) ? { ...l, appearance: { ...l.appearance, [key]: value } } : l))
  }, [selected, descendantsOf, applyLayers])

  const normalizeOrders = list => list.map((l,i) => ({ ...l, order: i }))

  const reparent = useCallback((sourceId, parentId, beforeId = null) => {
    applyLayers('Move layer', prev => {
      const source = prev.find(l => l.id === sourceId)
      if (!source || sourceId === parentId) return prev
      const getDesc = id => {
        const out=[]; const walk=p=>prev.filter(l=>l.parentId===p).forEach(c=>{out.push(c);walk(c.id)}); walk(id); return out
      }
      if (parentId && getDesc(sourceId).some(d => d.id === parentId)) return prev
      let next = prev.map(l => l.id === sourceId ? { ...l, parentId } : l)
      const siblings = next.filter(l => l.parentId === parentId && l.id !== sourceId).sort((a,b)=>a.order-b.order)
      let idx = beforeId ? siblings.findIndex(l => l.id === beforeId) : siblings.length
      if (idx < 0) idx = siblings.length
      siblings.splice(idx, 0, { ...next.find(l => l.id === sourceId), parentId })
      const ordered = new Map(normalizeOrders(siblings).map(l => [l.id, l.order]))
      next = next.map(l => ordered.has(l.id) ? { ...l, order: ordered.get(l.id) } : l)
      return next
    })
  }, [applyLayers])

  const reorderNear = useCallback((sourceId, targetId, mode='before') => {
    const target = layers.find(l => l.id === targetId)
    if (!target) return
    if (mode === 'inside' && isGroup(target)) return reparent(sourceId, target.id, null)
    const siblings = childrenOf(target.parentId)
    const i = siblings.findIndex(l => l.id === targetId)
    const before = mode === 'before' ? targetId : siblings[i + 1]?.id || null
    reparent(sourceId, target.parentId, before)
  }, [layers, childrenOf, isGroup, reparent])

  const addGroup = useCallback(() => {
    const layer = {
      id: uid('group'), name:'Group', type:'userGroup', parentId:null, order:childrenOf(null).length,
      baseTransform:'', transform:defaultTransform(), motion:defaultMotion(false), appearance:defaultAppearance(), keyframes:[], attrs:{}, original:null, prototype:focusProto(),
    }
    applyLayers('Add group', prev => [...prev, layer])
    setSelectedId(layer.id)
  }, [childrenOf, applyLayers])

  const deleteSelected = useCallback(() => {
    if (!selectedId) return
    const ids = new Set([selectedId, ...descendantsOf(selectedId).map(l => l.id)])
    applyLayers('Delete layer', prev => prev.filter(l => !ids.has(l.id)))
    setSelectedId(null)
  }, [selectedId, descendantsOf, applyLayers])

  const importSvgText = useCallback((text, name='Figma SVG') => {
    try {
      const incoming = importSvg(text, childrenOf(null).length, name).map(l=>({...l,prototype:l.prototype||focusProto()}))
      applyLayers('Import SVG', prev => [...prev, ...incoming])
      setSelectedId(incoming[0]?.id || null)
      notify(`${incoming.length}개 레이어를 가져왔습니다.`)
    } catch (e) { notify(e.message) }
  }, [childrenOf, notify, applyLayers])

  const importRaster = useCallback((dataUrl, name='Image') => {
    const layer = {...createRasterLayer(dataUrl, name, childrenOf(null).length),prototype:focusProto()}
    applyLayers('Import image', prev => [...prev, layer])
    setSelectedId(layer.id)
    notify('이미지를 추가했습니다.')
  }, [childrenOf, notify, applyLayers])

  const setLayerPrototype=useCallback((id,patch)=>replaceLayer(id,l=>({...l,prototype:{...focusProto(),...(l.prototype||{}),...patch,links:{...emptyLinks(),...(l.prototype?.links||{}),...(patch.links||{})}}}),'Edit focus behavior'),[replaceLayer])
  const setFocusLink=useCallback((id,dir,targetId)=>setLayerPrototype(id,{links:{[dir]:targetId}}),[setLayerPrototype])
  const updateFocusSetting=useCallback((key,value)=>setFocusSettings(s=>({...s,[key]:value})),[])
  const setFocusEasingPreset=useCallback(preset=>{const map={tv:'cubic-bezier(.2,0,0,1)',spring:'cubic-bezier(.2,1.3,.35,1)',snappy:'cubic-bezier(.3,.8,.2,1)',linear:'linear'};setFocusSettings(s=>({...s,easingPreset:preset,easing:map[preset]||map.tv}))},[])
  const activateFocus=useCallback(()=>{if(!focusedId){notify('포커스 대상이 없습니다.');return}setPressedId(focusedId);setTimeout(()=>setPressedId(null),110);notify(`${layersRef.current.find(l=>l.id===focusedId)?.name||'Target'} · OK`)},[focusedId,notify])
  const addIptvDemo=useCallback(()=>{const start=childrenOf(null).length,cards=[...demoCard('Movie 01',245,210,start),...demoCard('Movie 02',410,210,start+1),...demoCard('Movie 03',575,210,start+2),...demoCard('Movie 04',245,335,start+3),...demoCard('Movie 05',410,335,start+4),...demoCard('Movie 06',575,335,start+5)],first=cards.find(x=>x.prototype?.focusable);applyLayers('Add IPTV focus demo',prev=>[...prev,...cards]);setTheme('mono');setEditorMode('prototype');setFocusedId(first?.id||null);setSelectedId(first?.id||null);notify('IPTV 포커스 데모를 추가했습니다.')},[childrenOf,applyLayers,notify])

  const importUiStudioPayload=useCallback(payload=>{
    try{
      const next=uiStudioLayers(payload)
      applyLayers('Import UI Studio screen',()=>next)
      const first=next.find(l=>l.prototype?.focusable)
      setSourceContext({source:'ui-studio',title:payload.title||'IPTV screen',fileKey:payload.fileKey,nodeId:payload.nodeId,deepLink:payload.deepLink,detected:(payload.focusables||[]).length})
      setEditorMode('prototype');setTheme('mono');setPlaying(false);setTime(0)
      setFocusedId(first?.id||null);setSelectedId(first?.id||next[0]?.id||null)
      notify(first?`UI Studio에서 포커스 후보 ${(payload.focusables||[]).length}개를 가져왔습니다.`:'화면은 가져왔지만 자동 포커스 후보를 찾지 못했습니다.')
    }catch(e){notify(e instanceof Error?e.message:'UI Studio 가져오기 실패')}
  },[applyLayers,notify])

  const addSnapshot = useCallback(() => setSnapshots(s => [...s, { id:uid('snap'), t:time, selectedId }]), [time, selectedId])

  const exportJson = useCallback(() => JSON.stringify({
    app:'Motion Lab', version:3,
    playback:{duration,speed,loop}, canvas:{theme}, source:sourceContext, prototype:{focusSettings,focusedId}, layers,
  }, null, 2), [duration,speed,loop,theme,layers,focusSettings,focusedId,sourceContext])

  return {
    layers, selected, selectedId, setSelectedId, childrenOf, descendantsOf, isGroup,
    time, setTime, playing, setPlaying, loop, setLoop, speed, setSpeed, duration, theme, setTheme, sparks, setSparks,
    snapshots, addSnapshot, toast, notify, currentProps, updateTimed, addKeyframe, deleteKeyframe, moveKeyframe,
    updateAppearance, replaceLayer, reparent, reorderNear, addGroup, deleteSelected, importSvgText, importRaster, exportJson,
    beginTransaction, commitTransaction, cancelTransaction,
    undo, redo, canUndo:history.canUndo, canRedo:history.canRedo, undoLabel:history.undoLabel, redoLabel:history.redoLabel,
    undoDepth:history.undoDepth, redoDepth:history.redoDepth, historyEntries:history.historyEntries,
    editorMode,setEditorMode,focusedId,setFocusedId,focusedLayer,pressedId,focusableLayers,focusSettings,sourceContext,
    setLayerPrototype,setFocusLink,updateFocusSetting,setFocusEasingPreset,activateFocus,addIptvDemo,importUiStudioPayload,
  }
}
