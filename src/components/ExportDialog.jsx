import React, { useState } from 'react'

export default function ExportDialog({ open, onClose, lab }) {
  const [tab,setTab]=useState('json')
  if(!open)return null
  const json=lab.exportJson()
  function download(){const blob=new Blob([json],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='motion-lab-scene.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),800)}
  return <div className="modal-backdrop" onPointerDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <div className="modal-card export-dialog">
      <div className="modal-title"><b>Export motion</b><button onClick={onClose}>×</button></div>
      <div className="export-grid">
        <div className="export-tabs">
          {['json','css','video','link'].map(x=><button key={x} className={tab===x?'active':''} onClick={()=>setTab(x)}>{x==='json'?'Motion JSON':x==='css'?'CSS / JS':'video'===x?'GIF / MP4':'Share link'}</button>)}
        </div>
        <div className="export-main">
          {tab==='json'?<><h3>Motion Config</h3><p>Scene hierarchy, transforms, motion parameters and per-layer keyframes.</p><pre>{json.slice(0,3500)}</pre><div className="dialog-actions"><button onClick={()=>navigator.clipboard?.writeText(json).then(()=>lab.notify('JSON을 복사했습니다.'))}>Copy JSON</button><button className="primary" onClick={download}>Download JSON</button></div></>:<div className="coming"><b>{tab==='css'?'CSS / JS export':tab==='video'?'Video render':'Shareable prototype'}</b><span>React project architecture is ready for this exporter as a separate adapter.</span></div>}
        </div>
      </div>
    </div>
  </div>
}
