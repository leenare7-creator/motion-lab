# Motion Lab

Figma에서 복사한 SVG나 이미지에 레이어별 모션과 키프레임을 적용하고, 결과를 실시간으로 미리보는 React/Vite 기반 모션 에디터 프로토타입입니다.

## 실행

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## 현재 구현 범위

- Figma SVG paste / SVG·PNG·JPG·WebP import
- SVG Root / Group / Path hierarchy 유지
- Layers drag reorder / group nesting
- Canvas 직접 Move / Scale / Rotate
- Fill / Gradient / Stroke / Opacity 편집
- 레이어별 procedural motion
- 레이어별 timeline track과 keyframe interpolation
- Keyframe drag로 timing 변경
- JSON scene export
- Command History 기반 Undo / Redo
- `⌘/Ctrl + Z`, `Shift + ⌘/Ctrl + Z`, `Ctrl + Y`
- Canvas drag, Inspector slider, Keyframe drag를 하나의 history command로 묶는 transaction 처리

## 편집기 구조

```text
src/
├─ App.jsx
├─ components/
│  ├─ TopBar.jsx
│  ├─ ToolRail.jsx
│  ├─ LayersPanel.jsx
│  ├─ CanvasStage.jsx
│  ├─ SvgScene.jsx
│  ├─ Inspector.jsx
│  ├─ Timeline.jsx
│  ├─ PasteDialog.jsx
│  └─ ExportDialog.jsx
├─ hooks/
│  ├─ useMotionLab.js
│  └─ useCommandHistory.js
└─ lib/
   ├─ animation.js
   └─ svgImport.js
```

## Command History 설계

`useMotionLab`에서 레이어를 직접 수정하지 않고 `applyLayers(label, producer)`를 통해 document state를 변경합니다. 각 변경은 `before / after / label`을 가진 command snapshot으로 기록됩니다.

연속적인 pointer gesture는 매 프레임마다 history를 쌓지 않습니다. `beginTransaction(label)`에서 시작 상태를 저장하고, gesture 동안의 변경은 하나의 transaction 안에서 처리한 뒤 `commitTransaction()`에서 최종 상태 하나만 command로 추가합니다.

현재 history limit은 120 commands입니다. 새 command가 실행되면 redo stack은 비워집니다.

## 주요 단축키

- Undo: `⌘ Z` / `Ctrl Z`
- Redo: `Shift ⌘ Z` / `Shift Ctrl Z`
- Windows alternative redo: `Ctrl Y`
