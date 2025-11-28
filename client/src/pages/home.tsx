import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, Play, Square, Copy, Check, Music2, Zap, AlertCircle, 
  FileAudio, Code2, Terminal, ArrowRight, RefreshCw, Send, 
  Bot, User, Sparkles, Mic, Paperclip, ChevronRight, Command
} from 'lucide-react';
import { analyzeDrumLoop, type AnalysisResult } from '@/lib/audio-analysis';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import bgImage from '@assets/generated_images/dark_synthwave_grid_background.png';

// Types
interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  attachment?: File;
  codeBlock?: string;
  timestamp: number;
}

export default function Home() {
  // State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      role: 'agent',
      content: "Hello! I'm your Strudel AI Composer running on Opus 4.5. Drop a drum loop to convert it to code, or describe a pattern you want to generate.",
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentCode, setCurrentCode] = useState<string>('// No code generated yet...');
  const [activeFile, setActiveFile] = useState<File | null>(null);
  
  // Audio State
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Effects
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast({
        title: "Invalid File",
        description: "Please upload an audio file (MP3, WAV, OGG)",
        variant: "destructive"
      });
      return;
    }

    // Add user message with attachment
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `Analyzed ${file.name}`,
      attachment: file,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMsg]);
    setActiveFile(file);
    
    // Handle Audio URL
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);

    // Simulate Agent Processing
    setIsTyping(true);
    
    try {
      // Actually analyze the file
      const result = await analyzeDrumLoop(file);
      
      setTimeout(() => {
        setIsTyping(false);
        setCurrentCode(result.code);
        
        const agentMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'agent',
          content: `I've analyzed **${file.name}**. It's a ${result.pattern.beats}-beat loop at ${result.pattern.bpm} BPM.\n\nHere is the quantized Strudel code:`,
          codeBlock: result.code,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, agentMsg]);
      }, 1500); // Fake processing delay for "Opus" feel
      
    } catch (err: any) {
      setIsTyping(false);
      toast({
        title: "Analysis Failed",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Mock Agent Response Logic
    setTimeout(() => {
      setIsTyping(false);
      let responseContent = "I can help with that. ";
      let newCode = currentCode;

      // Simple "mock" logic for the demo
      const lowerInput = userMsg.content.toLowerCase();
      
      if (lowerInput.includes('faster') || lowerInput.includes('speed up')) {
        responseContent += "I've increased the tempo by 20 BPM.";
        newCode = newCode.replace(/\.cpm\((\d+)\)/, (match, bpm) => `.cpm(${parseInt(bpm) + 20})`);
      } else if (lowerInput.includes('slower') || lowerInput.includes('slow down')) {
        responseContent += "I've decreased the tempo by 10 BPM to give it more room.";
        newCode = newCode.replace(/\.cpm\((\d+)\)/, (match, bpm) => `.cpm(${parseInt(bpm) - 10})`);
      } else if (lowerInput.includes('bass') || lowerInput.includes('808')) {
        responseContent += "Adding a simple sub-bass line to follow the kick drum.";
        const bassLine = `  s("~ ~ ~ ~ bd ~ ~ ~").bank("rolandtr808").lp(100)`; 
        // Just a dummy insert for visual effect
        if (!newCode.includes('rolandtr808')) {
           newCode = newCode.replace(/stack\(/, `stack(\n${bassLine},`);
        }
      } else if (lowerInput.includes('house') || lowerInput.includes('techno')) {
        responseContent += "Converting this to a 4/4 House pattern structure.";
        // Mock transformation
        newCode = `// 4/4 House Beat @ 124 BPM\nstack(\n  s("bd ~ bd ~"),\n  s("~ hh ~ hh"),\n  s("~ sd ~ sd")\n).cpm(124)`;
      } else {
        responseContent += "I've updated the code based on your request. Try running this in the Strudel editor.";
      }

      setCurrentCode(newCode);
      
      const agentMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: responseContent,
        codeBlock: newCode !== currentCode ? newCode : undefined,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, agentMsg]);
    }, 1000);
  };

  const togglePlayback = async () => {
    if (!audioRef.current) return;
    try {
      if (playing) {
        audioRef.current.pause();
        setPlaying(false);
      } else {
        await audioRef.current.play();
        setPlaying(true);
      }
    } catch (err) {
      console.error(err);
      setPlaying(false);
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans selection:bg-primary/30">
      {/* Background */}
      <div className="fixed inset-0 z-[-1] opacity-30 pointer-events-none">
         <img src={bgImage} alt="bg" className="w-full h-full object-cover" />
         <div className="absolute inset-0 bg-gradient-to-t from-background via-background/95 to-background/80" />
      </div>

      {/* Left Sidebar: Chat */}
      <div className="w-[450px] flex flex-col border-r border-border/40 bg-background/50 backdrop-blur-xl relative z-10">
        {/* Header */}
        <div className="p-4 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg leading-none">Strudel AI</h1>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Opus 4.5 Online</span>
              </div>
            </div>
          </div>
          {activeFile && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/10 rounded-full border border-secondary/20">
               <Music2 className="w-3 h-3 text-secondary" />
               <span className="text-xs font-medium text-secondary-foreground truncate max-w-[100px]">{activeFile.name}</span>
            </div>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
          {messages.map((msg) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id} 
              className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === 'agent' 
                  ? 'bg-primary/20 text-primary border border-primary/30' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {msg.role === 'agent' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              {/* Content */}
              <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'agent' 
                    ? 'bg-card border border-white/5 shadow-sm' 
                    : 'bg-primary text-primary-foreground shadow-md shadow-primary/10'
                }`}>
                  {msg.content}
                </div>

                {/* Attachment Preview */}
                {msg.attachment && (
                  <div className="mt-1 flex items-center gap-3 p-3 bg-card/50 border border-white/10 rounded-xl w-full max-w-[280px]">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <FileAudio className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate text-foreground">{msg.attachment.name}</div>
                      <div className="text-[10px] text-muted-foreground">{(msg.attachment.size / 1024).toFixed(1)} KB</div>
                    </div>
                    <button 
                      onClick={togglePlayback}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                      {playing ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                    </button>
                    <audio ref={audioRef} src={audioUrl || ''} onEnded={() => setPlaying(false)} />
                  </div>
                )}

                {/* Code Block in Chat (Optional, usually main view handles this but nice for history) */}
                {msg.codeBlock && (
                  <div className="mt-1 w-full rounded-xl overflow-hidden border border-white/10 bg-black/40 text-xs font-mono">
                    <div className="px-3 py-2 border-b border-white/5 bg-white/5 text-muted-foreground flex justify-between">
                      <span>diff</span>
                      <Copy className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => navigator.clipboard.writeText(msg.codeBlock!)} />
                    </div>
                    <div className="p-3 overflow-x-auto text-primary/80">
                      <pre>{msg.codeBlock.split('\n').slice(0, 5).join('\n')}...</pre>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          
          {isTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="px-4 py-3 rounded-2xl bg-card border border-white/5 flex gap-1 items-center h-10">
                <div className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-border/40 bg-background/80 backdrop-blur-xl">
          <form onSubmit={handleSendMessage} className="relative">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="audio/*"
              className="hidden"
            />
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-primary transition-colors hover:bg-primary/10 rounded-lg"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your loop or drop a file..."
              className="w-full bg-card/50 border border-white/10 rounded-xl pl-12 pr-12 py-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50"
            />
            <button 
              type="submit"
              disabled={!input.trim() && !isTyping}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary text-primary-foreground rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50 disabled:shadow-none"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="text-[10px] text-center mt-3 text-muted-foreground/40 font-mono">
            Strudel AI can make mistakes. Verify generated code.
          </div>
        </div>
      </div>

      {/* Right Panel: Code Editor */}
      <div className="flex-1 flex flex-col bg-[#0D0D12] relative">
        {/* Toolbar */}
        <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-[#0D0D12]">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors cursor-pointer">
               <Code2 className="w-4 h-4" />
               <span className="text-sm font-medium">generated.strudel</span>
            </div>
            <div className="h-4 w-[1px] bg-white/10" />
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
              <span className="text-xs text-muted-foreground">Draft</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                navigator.clipboard.writeText(currentCode);
                toast({ title: "Copied", description: "Code copied to clipboard" });
              }}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 rounded-lg text-xs font-medium text-muted-foreground transition-colors"
            >
              <Copy className="w-3 h-3" /> Copy
            </button>
            <a 
               href="https://strudel.repl.co" 
               target="_blank" 
               rel="noreferrer"
               className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
            >
              <Terminal className="w-3 h-3" /> Open Editor
            </a>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 overflow-auto p-6 font-mono text-sm leading-loose relative group">
          <div className="absolute top-0 left-0 w-12 h-full border-r border-white/5 bg-white/[0.02] flex flex-col items-end pt-6 pr-3 text-muted-foreground/20 select-none">
            {currentCode.split('\n').map((_, i) => (
              <div key={i} className="text-xs">{i + 1}</div>
            ))}
          </div>
          <div className="pl-16 min-h-full">
             <CodeBlock code={currentCode} />
          </div>
        </div>

        {/* Status Bar */}
        <div className="h-8 border-t border-white/5 bg-[#0A0A0E] flex items-center justify-between px-4 text-[10px] text-muted-foreground font-mono">
          <div className="flex items-center gap-4">
            <span>JavaScript</span>
            <span>UTF-8</span>
            <span className="flex items-center gap-1"><Check className="w-2.5 h-2.5" /> Prettier</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span>Connected to Opus 4.5</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Reused Components
const CodeBlock = ({ code }: { code: string }) => {
  return (
    <pre className="font-mono text-sm leading-relaxed text-gray-300">
      {code.split('\n').map((line, i) => (
        <div key={i} className="min-h-[1.5em]">{processLine(line)}</div>
      ))}
    </pre>
  );
};

const processLine = (line: string) => {
  const commentIndex = line.indexOf('//');
  if (commentIndex !== -1) {
    const codePart = line.slice(0, commentIndex);
    const commentPart = line.slice(commentIndex);
    return (
      <>
        {processCode(codePart)}
        <span className="text-gray-500 italic">{commentPart}</span>
      </>
    );
  }
  return processCode(line);
};

const processCode = (text: string) => {
  const parts = text.split(/("[^"]*"|`[^`]*`)/g);
  return parts.map((part, i) => {
    if ((part.startsWith('"') && part.endsWith('"')) || (part.startsWith('`') && part.endsWith('`'))) {
      return <span key={i} className="text-[#E6DB74]">{part}</span>; // Monokai Yellow String
    }
    return <span key={i} dangerouslySetInnerHTML={{ __html: highlightKeywords(part) }} />;
  });
};

const highlightKeywords = (text: string) => {
  return text
    .replace(/\b(stack|s|cpm|slow|bank|lp)\b/g, '<span class="text-[#F92672] font-bold">$1</span>') // Monokai Pink Keywords
    .replace(/\b(\d+)\b/g, '<span class="text-[#AE81FF]">$1</span>'); // Monokai Purple Numbers
};
