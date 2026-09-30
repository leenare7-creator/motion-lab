import React from 'react'

export default function ToolRail() {
  return <aside className="toolrail">
    <button className="tool active" title="Move">⌖</button>
    <button className="tool" title="Frame">#</button>
    <button className="tool" title="Shape">◇</button>
    <button className="tool" title="Pen">✎</button>
    <button className="tool" title="Text">T</button>
    <div className="toolrail-spacer" />
    <button className="tool" title="Comment">◌</button>
    <button className="tool" title="Help">?</button>
  </aside>
}
