import React, { useEffect, useRef } from 'react'

export default function PasteDialog({ open, onClose, lab }) {
  const box = useRef(null)
  useEffect(()=>{ if(open) setTimeout(()=>box.current?.focus(),30) },[open])
  if (!open) return null

  async function handlePaste(e) {
    e.preventDefault()
    const dt=e.clipboardData
    const svg = [dt.getData('image/svg+xml'),dt.getData('text/html'),dt.getData('text/plain')].filter(Boolean).map(t=>String(t).match(/<svg[\s\S]*?<\/svg>/i)?.[0]).find(Boolean)
    if(svg){lab.importSvgText(svg,'Figma clipboard');onClose();return}
    const item=[...(dt.items||[])].find(i=>i.kind==='file'&&i.type.startsWith('image/'))
    if(item){const file=item.getAsFile();const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});lab.importRaster(data,'Clipboard image');onClose();return}
    lab.notify('SVG 또는 이미지가 클립보드에 없습니다.')
  }

  return <div className="modal-backdrop" onPointerDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <div className="modal-card paste-dialog">
      <div className="modal-title"><b>Paste from Figma</b><button onClick={onClose}>×</button></div>
      <p>Figma에서 레이어 또는 벡터를 복사한 뒤 아래 영역에서 ⌘V / Ctrl+V를 누르세요.</p>
      <div ref={box} tabIndex={0} className="paste-zone" onPaste={handlePaste}>Click here, then paste<br/><span>SVG hierarchy will be converted to editable layers.</span></div>
    </div>
  </div>
}
