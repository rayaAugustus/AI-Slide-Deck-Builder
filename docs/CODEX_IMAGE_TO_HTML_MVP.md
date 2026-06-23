# Codex Task: Image-to-HTML Slide MVP

## Goal

Build the first monetizable MVP loop for SlideGen AI:

> Upload a PPT screenshot → multimodal AI analyzes layout → generate editable HTML/CSS → preview and export.

This is not a full SaaS. Do not add login, database, payments, collaboration, templates, or complex slide-deck management in this task.

## Repository Context

Current project:

- React 19 + TypeScript
- Vite
- Tailwind via CDN/imports
- Google Gemini via `@google/genai`
- Main app entry appears to be `App.tsx`
- Existing generation flow is topic-to-slide-deck

This task adds a second generation path: screenshot-to-single-slide HTML.

## User Story

As a user, I want to upload a PPT screenshot and get back a high-fidelity HTML/CSS slide so I can edit, copy, preview, and export it.

## Required UX

Add a compact panel in the existing app UI:

1. Image upload area
   - Accept `.png`, `.jpg`, `.jpeg`
   - Show image filename after upload
   - Show small preview thumbnail

2. Instruction textarea
   - Placeholder: `补充要求，例如：保持深色科技风、文字改成中文、生成 16:9 页面`

3. Generate button
   - Text: `Screenshot → HTML`
   - Disabled while generating or when no image is selected

4. Output behavior
   - Generate one new slide from the screenshot
   - Insert it into the current slide list
   - Set it as the current active slide
   - Keep existing editor/preview/export behavior usable

## Functional Requirements

### Frontend

- Add file selection state to `App.tsx` or a small dedicated component.
- Convert the selected image to base64.
- Call a new service function, likely `generateSlideFromImage(imageBase64, mimeType, instruction)`.
- On success, create a `Slide` object:

```ts
{
  id: `image-${Date.now()}`,
  htmlContent: generatedHtml,
  notes: 'Generated from PPT screenshot.'
}
```

- Insert the slide after the current slide or replace the initial placeholder slide if it is still the only slide.

### AI Service

Update or extend `services/geminiService.ts`.

Create function:

```ts
export async function generateSlideFromImage(
  imageBase64: string,
  mimeType: string,
  instruction?: string
): Promise<string>
```

The function should call Gemini multimodal API using the existing API key pattern.

### Prompt Requirements

Use this prompt as the base system/user instruction:

```text
你是顶级演示文稿设计师和前端工程师。
请根据用户上传的 PPT 截图，重建一个高保真的 HTML/CSS 幻灯片页面。

要求：
- 尽量还原截图中的布局、字体层级、颜色、间距、留白、图形关系
- 输出单页 16:9 幻灯片
- 幻灯片根容器尺寸建议为 width: 960px; height: 540px
- 使用纯 HTML + CSS
- CSS 写在 style 标签中或内联 style 中
- 不使用外部 JS
- 不依赖远程图片
- 如果截图中包含复杂图片，允许用渐变、色块、图形占位近似表达
- 返回可以直接放入现有 Canvas 的 HTML 片段
- 不要解释，不要 markdown，只返回 HTML 代码

用户补充要求：
{{instruction}}
```

### Model Output Sanitization

- Strip ```html fences if the model returns markdown accidentally.
- Trim leading/trailing whitespace.
- If a full HTML document is returned, extract content inside `<body>` when practical, or keep the full document only if existing Canvas can render it safely.

## Acceptance Criteria

- `npm install` works.
- `npm run dev` works.
- User can upload a PNG/JPG screenshot.
- User can click `Screenshot → HTML`.
- App calls Gemini multimodal API.
- A new generated slide appears in the slide list.
- The slide can be previewed in the existing canvas.
- Existing topic-to-deck generation remains functional.
- No login/database/payment scope is introduced.

## Implementation Boundaries

Do not migrate the project to Next.js in this task.
Do not rewrite the whole editor.
Do not introduce a backend server unless strictly necessary.
Do not add more models or provider abstractions.
Do not add Supabase.

## Suggested Commit Plan

1. `feat: add screenshot upload state and UI`
2. `feat: add Gemini image-to-slide generation service`
3. `feat: insert generated screenshot slide into editor`
4. `chore: document image-to-html MVP workflow`

## Manual Test Case

1. Start app with `npm run dev`.
2. Upload any PPT screenshot.
3. Enter instruction: `保持原布局，但改成更强的科技蓝风格。`
4. Click `Screenshot → HTML`.
5. Confirm a new slide appears and renders.
6. Export HTML and confirm the generated slide is included.
