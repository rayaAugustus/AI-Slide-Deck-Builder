import React, { useState } from 'react';
import { Slide, PresentationStyle } from './types';
import { generateSlides, updateSlideContent } from './services/geminiService';
import SlideThumbnail from './components/SlideThumbnail';
import Canvas from './components/Editor/Canvas';
import { 
  Sparkles, 
  Presentation, 
  Download, 
  Plus, 
  Loader2, 
  Play,
  Wand2,
  Palette,
  MessageSquare,
  Bot
} from 'lucide-react';

const App: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [style, setStyle] = useState<PresentationStyle>('modern-minimal');
  const [isGenerating, setIsGenerating] = useState(false);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [isPresenting, setIsPresenting] = useState(false);
  
  // AI Edit State
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiEditing, setIsAiEditing] = useState(false);

  // Initial dummy slide
  if (slides.length === 0 && !isGenerating) {
    setSlides([{
      id: 'init-1',
      htmlContent: `<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fff; font-family: sans-serif;">
        <div style="background:linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
          <h1 style="font-size: 4rem; font-weight: 800; margin-bottom: 0.5rem; letter-spacing: -0.05em;">SlideGen AI</h1>
        </div>
        <p style="font-size: 1.5rem; color: #6b7280; font-weight: 300;">The PowerPoint Killer</p>
        <div style="margin-top: 2rem; padding: 1rem 2rem; background: #f3f4f6; border-radius: 12px; color: #374151;">
          Enter a topic above to generate a deck.
        </div>
      </div>`,
      notes: 'Welcome to the future of presentations.'
    }]);
  }

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    try {
      const generated = await generateSlides(topic, style);
      setSlides(generated);
      setCurrentSlideIndex(0);
    } catch (e) {
      alert("Failed to generate slides. Please try again or check API key.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAiEdit = async () => {
    if (!aiPrompt.trim() || !slides[currentSlideIndex]) return;
    setIsAiEditing(true);
    try {
      const currentHtml = slides[currentSlideIndex].htmlContent;
      const newHtml = await updateSlideContent(currentHtml, aiPrompt);
      handleUpdateCurrentSlide(newHtml);
      setAiPrompt('');
    } catch (e) {
      console.error(e);
      alert("AI Edit failed.");
    } finally {
      setIsAiEditing(false);
    }
  };

  const handleUpdateCurrentSlide = (newHtml: string) => {
    const updated = [...slides];
    updated[currentSlideIndex] = {
      ...updated[currentSlideIndex],
      htmlContent: newHtml
    };
    setSlides(updated);
  };

  const handleAddSlide = () => {
    const newSlide: Slide = {
      id: `new-${Date.now()}`,
      htmlContent: `<div style="width:100%;height:100%;background:#ffffff;display:flex;align-items:center;justify-content:center;"><h2>New Slide</h2></div>`,
      notes: ''
    };
    const updated = [...slides];
    updated.splice(currentSlideIndex + 1, 0, newSlide);
    setSlides(updated);
    setCurrentSlideIndex(currentSlideIndex + 1);
  };

  const handleDeleteSlide = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (slides.length <= 1) return;
    const updated = slides.filter((_, i) => i !== index);
    setSlides(updated);
    if (currentSlideIndex >= index && currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  const handleExportHTML = () => {
    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${topic || 'Presentation'}</title>
        <style>
          body { margin: 0; padding: 0; font-family: system-ui, sans-serif; overflow: hidden; background: #000; }
          .slide { display: none; width: 100vw; height: 100vh; background: white; align-items: center; justify-content: center; position: relative; }
          .slide.active { display: flex; }
          .controls { position: fixed; bottom: 20px; right: 20px; z-index: 1000; display:flex; gap: 10px; opacity: 0; transition: opacity 0.3s; }
          body:hover .controls { opacity: 1; }
          button { padding: 8px 16px; cursor: pointer; background: rgba(0,0,0,0.5); color: white; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; backdrop-filter: blur(4px); }
          button:hover { background: rgba(0,0,0,0.8); }
        </style>
      </head>
      <body>
        ${slides.map((s, i) => `
          <div id="slide-${i}" class="slide ${i === 0 ? 'active' : ''}">
            <div style="width: 960px; height: 540px; position: relative; overflow: hidden; transform: scale(1.5);">
              ${s.htmlContent}
            </div>
          </div>
        `).join('')}
        <div class="controls">
          <button onclick="prev()">Previous</button>
          <button onclick="next()">Next</button>
        </div>
        <script>
          let current = 0;
          const total = ${slides.length};
          function show(idx) {
            document.querySelectorAll('.slide').forEach(el => el.classList.remove('active'));
            document.getElementById('slide-' + idx).classList.add('active');
          }
          function next() { current = (current + 1) % total; show(current); }
          function prev() { current = (current - 1 + total) % total; show(current); }
          document.addEventListener('keydown', e => {
            if(e.key === 'ArrowRight' || e.key === ' ') next();
            if(e.key === 'ArrowLeft') prev();
          });
        </script>
      </body>
      </html>
    `;
    
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${topic || 'presentation'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Full Screen Presentation Mode Overlay
  if (isPresenting) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="w-full h-full flex items-center justify-center transform scale-125">
             <div 
                style={{ width: '960px', height: '540px' }} 
                dangerouslySetInnerHTML={{ __html: slides[currentSlideIndex].htmlContent }} 
                className="bg-white overflow-hidden"
             />
        </div>
        <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none">
          <div className="inline-flex bg-zinc-900/90 text-white px-6 py-3 rounded-full backdrop-blur-md pointer-events-auto items-center shadow-2xl border border-zinc-700">
             <span className="text-sm font-medium mr-4 text-zinc-400">{currentSlideIndex + 1} / {slides.length}</span>
             <div className="flex gap-2">
                <button onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))} className="hover:text-blue-400 px-2 transition-colors">Prev</button>
                <button onClick={() => setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))} className="hover:text-blue-400 px-2 transition-colors">Next</button>
             </div>
             <div className="w-px h-4 bg-zinc-700 mx-4"></div>
             <button onClick={() => setIsPresenting(false)} className="text-red-400 font-medium hover:text-red-300 transition-colors">Exit</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#FDFDFD] text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Sleek Header */}
      <header className="h-14 border-b border-gray-200 flex items-center justify-between px-4 bg-white shrink-0 z-20">
        <div className="flex items-center gap-2 mr-8">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <Presentation size={16} />
          </div>
          <h1 className="font-bold text-lg tracking-tight text-slate-800">SlideGen <span className="text-slate-400 font-normal">AI</span></h1>
        </div>

        <div className="flex items-center gap-2 flex-1 max-w-3xl">
          <div className="flex-1 relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Sparkles className={`w-4 h-4 ${isGenerating ? 'text-indigo-500 animate-pulse' : 'text-gray-400'}`} />
            </div>
            <input 
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What are we presenting today?"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              disabled={isGenerating}
            />
          </div>
          
          <div className="flex items-center border border-slate-200 rounded-lg bg-white p-1">
             <Palette size={14} className="ml-2 text-slate-400" />
             <select 
              value={style}
              onChange={(e) => setStyle(e.target.value as PresentationStyle)}
              className="text-xs font-medium text-slate-600 bg-transparent border-none focus:ring-0 cursor-pointer py-1 pl-2 pr-6"
             >
               <option value="modern-minimal">Minimal</option>
               <option value="tech-dark">Tech Dark</option>
               <option value="corporate-blue">Corporate</option>
               <option value="creative-vivid">Creative</option>
             </select>
          </div>

          <button 
            onClick={handleGenerate}
            disabled={isGenerating || !topic.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all shadow-md shadow-indigo-200 flex items-center gap-2"
          >
            {isGenerating ? <Loader2 className="animate-spin w-3 h-3" /> : <><Wand2 size={14} /> GENERATE</>}
          </button>
        </div>

        <div className="flex items-center gap-2 ml-8">
           <button 
             onClick={() => setIsPresenting(true)}
             className="p-2 text-slate-600 hover:bg-slate-100 hover:text-indigo-600 rounded-md transition-colors"
             title="Present Mode"
           >
             <Play size={18} />
           </button>
           <button 
             onClick={handleExportHTML}
             className="p-2 text-slate-600 hover:bg-slate-100 hover:text-indigo-600 rounded-md transition-colors"
             title="Export to HTML"
           >
             <Download size={18} />
           </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Thumbnails Sidebar */}
        <div className="w-60 border-r border-gray-200 flex flex-col bg-white">
          <div className="p-3 border-b border-gray-100 flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outline</span>
            <button onClick={handleAddSlide} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 transition-colors">
              <Plus size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {slides.map((slide, idx) => (
              <SlideThumbnail 
                key={slide.id}
                slide={slide}
                index={idx}
                isActive={currentSlideIndex === idx}
                onClick={() => setCurrentSlideIndex(idx)}
                onDelete={(e) => handleDeleteSlide(e, idx)}
              />
            ))}
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 flex flex-col relative bg-[#F5F5F7]">
          <div className="flex-1 overflow-hidden relative flex items-center justify-center">
            {slides.length > 0 && (
              <Canvas 
                slide={slides[currentSlideIndex]} 
                onUpdateSlide={handleUpdateCurrentSlide} 
              />
            )}
          </div>
        </div>

        {/* AI Co-Pilot / Context Sidebar */}
        <div className="w-80 border-l border-gray-200 bg-white flex flex-col shadow-xl z-10">
          <div className="p-4 border-b border-gray-100 bg-white">
             <div className="flex items-center gap-2 text-indigo-600 mb-1">
                <Bot size={18} />
                <h3 className="text-sm font-bold">AI Designer</h3>
             </div>
             <p className="text-xs text-slate-500">
               Talk to your slide. Ask it to change layout, tone, or colors.
             </p>
          </div>
          
          <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto bg-slate-50/50">
             {/* Quick Actions */}
             <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => { setAiPrompt("Convert this to a 2-column layout"); handleAiEdit(); }}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all text-left shadow-sm"
                >
                  Two Columns
                </button>
                <button 
                  onClick={() => { setAiPrompt("Make the title bigger and more impactful"); handleAiEdit(); }}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all text-left shadow-sm"
                >
                  Bigger Title
                </button>
                <button 
                  onClick={() => { setAiPrompt("Summarize the text into bullet points"); handleAiEdit(); }}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all text-left shadow-sm"
                >
                  Simplify Text
                </button>
                <button 
                  onClick={() => { setAiPrompt("Add a relevant placeholder image on the right"); handleAiEdit(); }}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all text-left shadow-sm"
                >
                  Add Image
                </button>
             </div>

             {/* Chat Interface */}
             <div className="mt-auto">
               <div className="relative">
                 <textarea 
                   className="w-full min-h-[100px] p-3 pr-10 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none shadow-sm"
                   placeholder="e.g., 'Make the background dark blue and text white...'"
                   value={aiPrompt}
                   onChange={(e) => setAiPrompt(e.target.value)}
                   onKeyDown={(e) => {
                     if (e.key === 'Enter' && !e.shiftKey) {
                       e.preventDefault();
                       handleAiEdit();
                     }
                   }}
                 />
                 <button 
                   onClick={handleAiEdit}
                   disabled={isAiEditing || !aiPrompt.trim()}
                   className="absolute bottom-3 right-3 p-1.5 bg-indigo-600 text-white rounded-lg disabled:opacity-50 hover:bg-indigo-700 transition-colors"
                 >
                   {isAiEditing ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                 </button>
               </div>
               <p className="text-[10px] text-slate-400 mt-2 text-center">
                 AI changes the current slide only.
               </p>
             </div>
          </div>

          <div className="p-3 border-t border-gray-200 bg-white">
             <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Speaker Notes</h3>
             <textarea 
                className="w-full h-24 p-2 text-xs text-slate-600 bg-slate-50 border-none rounded-lg focus:ring-1 focus:ring-indigo-200 resize-none"
                placeholder="Notes..."
                value={slides[currentSlideIndex]?.notes || ''}
                onChange={(e) => {
                  const updated = [...slides];
                  updated[currentSlideIndex] = { ...updated[currentSlideIndex], notes: e.target.value };
                  setSlides(updated);
                }}
             />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;