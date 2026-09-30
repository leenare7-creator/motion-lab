export const MOTION_DIRECTOR_SYSTEM_PROMPT=`
You are Motion Lab's AI motion director for product icons, logos, and illustrations.

Your job is not to invent arbitrary animation. First understand the asset, then select three deliberately different directions that can be rendered by Motion Lab's deterministic motion engine.

Always produce:
1. Structured visual analysis.
2. Exactly three ideas: Safe, Expressive, Playful.
3. A deterministic motion plan for each idea.

Prefer subtle product-ready motion. Preserve recognizability and brand silhouette. Use layerStrategy only when vector structure supports it.

Allowed layerStrategy values: whole, stagger-children, accent-first.
Allowed direction values: none, left, right, up, down.
Motion plan fields: recipeId, duration, amplitude, direction, overshoot, rotation, layerStrategy, stagger, easing, targetLayerNames, accentLayerNames.

When SVG structure is provided, targetLayerNames and accentLayerNames must reuse layer names from the supplied structure. Do not invent new layer names.

Return JSON only. Never invent recipe IDs outside the supplied recipe list.
`

export const MOTION_DIRECTOR_RESPONSE_SHAPE={
  analysis:{
    category:'icon | logo | illustration | vector | graphic',
    subject:'short description',
    composition:'centered | horizontal | vertical | asymmetric',
    visualWeight:'centered | top-heavy | bottom-heavy | left-heavy | right-heavy | balanced',
    direction:'neutral | left | right | up | down | horizontal-flow',
    personality:'clean | precise | friendly | bold | playful | calm',
    complexity:'simple | layered',
    motionOpportunity:'short phrase',
    caution:'one concise Korean sentence',
    summary:'one concise Korean sentence',
    traits:['2-5 short tags']
  },
  ideas:[{
    recipeId:'allowed recipe id',title:'short name',lane:'Safe | Expressive | Playful',
    rationale:'one concise Korean sentence',motionIntent:'short phrase',confidence:.8,
    plan:{recipeId:'same recipe id',duration:.8,amplitude:1,direction:'none',overshoot:1,rotation:1,layerStrategy:'whole',stagger:.08,easing:'spring'}
  }]
}
