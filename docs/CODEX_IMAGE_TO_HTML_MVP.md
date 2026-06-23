# Codex Task: OpenAI GPT-5.5 Image-to-HTML Slide MVP

## Goal

Build the first monetizable MVP loop for SlideGen AI:

> Upload a PPT screenshot → GPT-5.5 multimodal layout analysis → generate editable HTML/CSS → preview and export.

This is not a full SaaS. Do not add login, database, payments, collaboration, templates, or complex slide-deck management in this task.

## Strategic Decision

Replace Gemini with OpenAI GPT-5.5 for image-to-slide generation.

Do not rewrite the entire editor. Keep the current Vite + React + TypeScript app and replace only the AI provider layer needed for generation.

## Repository Context

Current project:

- React 19 + TypeScript
- Vite
- Tailwind via CDN/imports
- Existing app entry appears to be `App.tsx`
- Existing generation flow is topic-to-slide-deck
- Existing AI service is Gemini-based and should be replaced or wrapped

This task adds/updates a generation path: screenshot-to-single-slide HTML powered by OpenAI.

## Target Technical Stack

- Frontend: React 19 + TypeScript + Vite
- AI provider: OpenAI Responses API
- Model: `gpt-5.5`
- SDK: official `openai` Node/JS SDK if runtime allows; otherwise call `fetch` to OpenAI Responses API
- Environment variable: `OPENAI_API_KEY`

Important: do not expose `OPENAI_API_KEY` in browser code.

Because this repo is Vite/browser-first, Codex must choose one safe implementation path:

### Preferred path

Add a minimal server/API route or local API proxy so the browser calls the local backend, and the backend calls OpenAI.

### Acceptable local MVP path

If the project structure makes a server difficult, create a clearly documented `server/` proxy such as:

```text
server/openaiProxy.ts
```

and document how to run it alongside Vite.

Do not place the OpenAI API key inside client-side bundled code.

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
- Convert the selected image to base64 or data URL.
- Call a new service function, likely `generateSlideFromImage(imageBase64, mimeType, instruction)`.
- The frontend service should call the local backend/proxy endpoint, not OpenAI directly.
- On success, create a `Slide` object:

```ts
{
  id: `image-${Date.now()}`,
  htmlContent: generatedHtml,
  notes: 'Generated from PPT screenshot with GPT-5.5.'
}
```

- Insert the slide after the current slide or replace the initial placeholder slide if it is still the only slide.

### AI Service

Replace or extend `services/geminiService.ts` with a provider-neutral service name if practical.

Preferred file names:

```text
services/openaiService.ts
server/openaiProxy.ts
```

Create function:

```ts
export async function generateSlideFromImage(
  imageBase64: string,
  mimeType: string,
  instruction?: string
): Promise<string>
```

The function should eventually call OpenAI Responses API with model `gpt-5.5` and image input.

## OpenAI Request Shape

Use the current OpenAI Responses API image-input style.

Target conceptual structure:

```ts
const response = await client.responses.create({
  model: 'gpt-5.5',
  input: [
    {
      role: 'user',
      content: [
        { type: 'input_text', text: prompt },
        {
          type: 'input_image',
          image_url: `data:${mimeType};base64,${imageBase64}`
        }
      ]
    }
  ]
});

return response.output_text;
```

If the installed SDK type differs, adapt to the latest OpenAI SDK format while preserving the same intent.

## Prompt Requirements

Use this prompt as the base instruction:

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

## Model Output Sanitization

- Strip ```html fences if the model returns markdown accidentally.
- Trim leading/trailing whitespace.
- If a full HTML document is returned, extract content inside `<body>` when practical, or keep the full document only if existing Canvas can render it safely.
- Reject or repair empty output.

## Acceptance Criteria

- `npm install` works.
- `npm run dev` works.
- User can upload a PNG/JPG screenshot.
- User can click `Screenshot → HTML`.
- App calls OpenAI GPT-5.5 through a backend/proxy, not directly from browser-bundled code.
- A new generated slide appears in the slide list.
- The slide can be previewed in the existing canvas.
- Existing topic-to-deck generation remains functional or is clearly marked as legacy if still Gemini-based.
- No login/database/payment scope is introduced.

## Implementation Boundaries

Do not migrate the project to Next.js in this task.
Do not rewrite the whole editor.
Do not expose `OPENAI_API_KEY` to client-side code.
Do not add Supabase.
Do not add payments.
Do not build multi-provider abstractions unless it is less than 50 lines and avoids duplication.

## Suggested Commit Plan

1. `chore: add OpenAI SDK and environment example`
2. `feat: add GPT-5.5 image-to-slide proxy`
3. `feat: add screenshot upload state and UI`
4. `feat: insert generated screenshot slide into editor`
5. `docs: document GPT-5.5 image-to-html MVP workflow`

## Manual Test Case

1. Start backend/proxy if required.
2. Start app with `npm run dev`.
3. Set `OPENAI_API_KEY` in `.env.local` or server environment.
4. Upload any PPT screenshot.
5. Enter instruction: `保持原布局，但改成更强的科技蓝风格。`
6. Click `Screenshot → HTML`.
7. Confirm a new slide appears and renders.
8. Export HTML and confirm the generated slide is included.
