export const lerp = (a, b, t) => a + (b - a) * t
export const cloneProps = p => ({ transform: { ...p.transform }, motion: { ...p.motion }, opacity: p.opacity })

export function propsFromLayer(layer) {
  return { transform: { ...layer.transform }, motion: { ...layer.motion }, opacity: layer.appearance.opacity }
}

export function propsAtTime(layer, time) {
  const ks = [...(layer.keyframes || [])].sort((a,b) => a.t - b.t)
  if (!ks.length) return propsFromLayer(layer)
  if (time <= ks[0].t) return cloneProps(ks[0].props)
  if (time >= ks.at(-1).t) return cloneProps(ks.at(-1).props)
  for (let i = 0; i < ks.length - 1; i++) {
    const a = ks[i], b = ks[i + 1]
    if (time >= a.t && time <= b.t) {
      const t = (time - a.t) / (b.t - a.t || 1)
      return {
        transform: {
          x: lerp(a.props.transform.x, b.props.transform.x, t),
          y: lerp(a.props.transform.y, b.props.transform.y, t),
          scale: lerp(a.props.transform.scale, b.props.transform.scale, t),
          rotation: lerp(a.props.transform.rotation, b.props.transform.rotation, t),
        },
        motion: {
          enabled: t < .5 ? a.props.motion.enabled : b.props.motion.enabled,
          wave: lerp(a.props.motion.wave, b.props.motion.wave, t),
          hop: lerp(a.props.motion.hop, b.props.motion.hop, t),
          bounce: lerp(a.props.motion.bounce, b.props.motion.bounce, t),
          rotate: lerp(a.props.motion.rotate, b.props.motion.rotate, t),
          delay: lerp(a.props.motion.delay, b.props.motion.delay, t),
        },
        opacity: lerp(a.props.opacity, b.props.opacity, t),
      }
    }
  }
  return propsFromLayer(layer)
}

export function proceduralTransform(motion, time, duration) {
  if (!motion.enabled) return ''
  const p = ((time - motion.delay) % duration + duration) % duration / duration
  const hopY = -Math.max(0, Math.sin(p * Math.PI * 2)) * 26 * motion.hop
  const sx = 1 + Math.sin(p * Math.PI * 4) * .04 * motion.bounce
  const sy = 1 - Math.sin(p * Math.PI * 4) * .06 * motion.bounce
  const rot = Math.sin(p * Math.PI * 2) * (2.2 * motion.wave + motion.rotate)
  return `translate(0 ${hopY}) rotate(${rot}) scale(${sx} ${sy})`
}
