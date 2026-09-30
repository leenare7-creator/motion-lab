import { useCallback, useRef, useState } from 'react'

const clone = value => {
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value))
}

export function useCommandHistory({ restoreSnapshot, limit = 100 }) {
  const undoRef = useRef([])
  const redoRef = useRef([])
  const transactionRef = useRef(null)
  const [meta, setMeta] = useState({ undoDepth: 0, redoDepth: 0, lastLabel: '' })

  const syncMeta = useCallback(() => {
    const undo = undoRef.current
    const redo = redoRef.current
    setMeta({
      undoDepth: undo.length,
      redoDepth: redo.length,
      lastLabel: undo.at(-1)?.label || '',
    })
  }, [])

  const record = useCallback((label, before, after) => {
    if (transactionRef.current) return
    undoRef.current.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      label,
      before: clone(before),
      after: clone(after),
      createdAt: Date.now(),
    })
    if (undoRef.current.length > limit) undoRef.current.shift()
    redoRef.current = []
    syncMeta()
  }, [limit, syncMeta])

  const beginTransaction = useCallback((label, before) => {
    if (transactionRef.current) return false
    transactionRef.current = { label, before: clone(before), startedAt: Date.now() }
    return true
  }, [])

  const commitTransaction = useCallback((after) => {
    const tx = transactionRef.current
    if (!tx) return false
    transactionRef.current = null
    if (JSON.stringify(tx.before) === JSON.stringify(after)) return false
    undoRef.current.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      label: tx.label,
      before: tx.before,
      after: clone(after),
      createdAt: Date.now(),
    })
    if (undoRef.current.length > limit) undoRef.current.shift()
    redoRef.current = []
    syncMeta()
    return true
  }, [limit, syncMeta])

  const cancelTransaction = useCallback(() => {
    transactionRef.current = null
  }, [])

  const isTransactionActive = useCallback(() => !!transactionRef.current, [])

  const undo = useCallback(() => {
    if (transactionRef.current) return false
    const cmd = undoRef.current.pop()
    if (!cmd) return false
    redoRef.current.push(cmd)
    restoreSnapshot(clone(cmd.before))
    syncMeta()
    return cmd
  }, [restoreSnapshot, syncMeta])

  const redo = useCallback(() => {
    if (transactionRef.current) return false
    const cmd = redoRef.current.pop()
    if (!cmd) return false
    undoRef.current.push(cmd)
    restoreSnapshot(clone(cmd.after))
    syncMeta()
    return cmd
  }, [restoreSnapshot, syncMeta])

  const clear = useCallback(() => {
    undoRef.current = []
    redoRef.current = []
    transactionRef.current = null
    syncMeta()
  }, [syncMeta])

  const historyEntries = undoRef.current.slice().reverse().map((x, index) => ({
    id: x.id,
    label: x.label,
    index,
    createdAt: x.createdAt,
  }))

  return {
    record,
    beginTransaction,
    commitTransaction,
    cancelTransaction,
    isTransactionActive,
    undo,
    redo,
    clear,
    canUndo: meta.undoDepth > 0,
    canRedo: meta.redoDepth > 0,
    undoDepth: meta.undoDepth,
    redoDepth: meta.redoDepth,
    undoLabel: undoRef.current.at(-1)?.label || '',
    redoLabel: redoRef.current.at(-1)?.label || '',
    historyEntries,
  }
}
