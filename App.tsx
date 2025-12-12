import React, { useState } from 'react';
import { Slide } from './types';
import { generateSlides } from './services/geminiService';
import SlideThumbnail from './components/SlideThumbnail';
import Canvas from './components/Editor/Canvas';
import { 
  Sparkles, 
  Presentation, 
  Download, 
  Plus, 
  Loader2, 
  Layout, 
  Undo,
  Redo,
  Play
} from 'lucide-react';

const App: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [isPresenting, setIsPresenting] = useState(false);

  // Initial dummy slide
  if (slides.length === 0 && !isGenerating) {
    setSlides([{
      id: 'init-1',
      htmlContent: `<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);">
        <h1 style="font-size: 3rem; font-weight: bold; color: #1f2937; margin-bottom: 1rem;">Welcome to SlideAI</h1>
        <p style="font-size: 1.5rem; color: #4b5563;">Enter a topic above to generate your deck.</p>
      </div>`,
      notes: 'Welcome slide'
    }]);
  }

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    try {
      const generated = await generateSlides(topic);
      setSlides(generated);
      setCurrentSlideIndex(0);
    } catch (e) {
      alert("Failed to generate slides. Please try again or check API key.");
    } finally {
      setIsGenerating(false);
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
      htmlContent: `<div style="width:100%;height:100%;background:#ffffff;padding:40px;"><h2>New Slide</h2><p>Click to edit...</p></div>`,
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
          body { margin: 0; padding: 0; font-family: sans-serif; overflow: hidden; background: #000; }
          .slide { display: none; width: 100vw; height: 100vh; background: white; align-items: center; justify-content: center; position: relative; }
          .slide.active { display: flex; }
          .controls { position: fixed; bottom: 20px; right: 20px; z-index: 1000; }
          button { padding: 10px 20px; cursor: pointer; background: rgba(255,255,255,0.2); color: white; border: 1px solid white; }
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
          <button onclick="prev()">Prev</button>
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
                className="bg-white"
             />
        </div>
        <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
          <div className="inline-block bg-gray-900/80 text-white px-4 py-2 rounded-full backdrop-blur pointer-events-auto flex gap-4 items-center">
             <span className="text-sm">Slide {currentSlideIndex + 1} / {slides.length}</span>
             <button onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))} className="hover:text-blue-400">Prev</button>
             <button onClick={() => setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))} className="hover:text-blue-400">Next</button>
             <button onClick={() => setIsPresenting(false)} className="text-red-400 ml-4 font-bold">Exit</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white text-gray-900 font-sans">
      {/* Header */}
      <header className="h-16 border-b border-gray-200 flex items-center justify-between px-6 bg-white shrink-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
            <Presentation size={18} />
          </div>
          <h1 className="font-bold text-lg tracking-tight">SlideAI <span className="text-blue-600 text-xs font-normal bg-blue-50 px-2 py-0.5 rounded-full ml-1">Beta</span></h1>
        </div>

        <div className="flex items-center gap-4 flex-1 max-w-2xl mx-8">
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Sparkles className={`w-4 h-4 ${isGenerating ? 'text-blue-500 animate-pulse' : 'text-gray-400'}`} />
            </div>
            <input 
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Describe your presentation topic (e.g. 'Future of Renewable Energy')"
              className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              disabled={isGenerating}
            />
          </div>
          <button 
            onClick={handleGenerate}
            disabled={isGenerating || !topic.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            {isGenerating ? <Loader2 className="animate-spin w-4 h-4" /> : 'Generate Deck'}
          </button>
        </div>

        <div className="flex items-center gap-2">
           <button 
             onClick={() => setIsPresenting(true)}
             className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2 text-sm"
           >
             <Play size={16} />
             Present
           </button>
           <button 
             onClick={handleExportHTML}
             className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2 text-sm"
           >
             <Download size={16} />
             Export
           </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-gray-200 flex flex-col bg-gray-50">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Slides</span>
            <button onClick={handleAddSlide} className="p-1 hover:bg-gray-200 rounded text-gray-600">
              <Plus size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
        <div className="flex-1 flex flex-col relative">
          {/* Toolbar (Visual Only for MVP) */}
          <div className="h-10 border-b border-gray-200 bg-white flex items-center px-4 gap-4 text-gray-500">
             <div className="flex gap-1 border-r border-gray-200 pr-4">
               <button className="p-1.5 hover:bg-gray-100 rounded" title="Undo"><Undo size={14} /></button>
               <button className="p-1.5 hover:bg-gray-100 rounded" title="Redo"><Redo size={14} /></button>
             </div>
             <span className="text-xs text-gray-400">
               Double click elements to edit text. Drag to move.
             </span>
          </div>

          <div className="flex-1 overflow-hidden relative">
            {slides.length > 0 && (
              <Canvas 
                slide={slides[currentSlideIndex]} 
                onUpdateSlide={handleUpdateCurrentSlide} 
              />
            )}
          </div>
        </div>

        {/* Right Panel (Notes/Properties) */}
        <div className="w-64 border-l border-gray-200 bg-white flex flex-col">
          <div className="p-3 bg-gray-50 border-b border-gray-200">
             <h3 className="text-xs font-semibold text-gray-500 uppercase">Speaker Notes</h3>
          </div>
          <textarea 
            className="flex-1 w-full p-4 resize-none focus:outline-none text-sm text-gray-600"
            placeholder="Add speaker notes for this slide..."
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
  );
};

export default App;