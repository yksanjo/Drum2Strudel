import React, { useState, useRef, useEffect } from 'react';
import { Upload, Play, Square, Copy, Check, Music2, Zap, AlertCircle, FileAudio, Code2, Terminal, ArrowRight, RefreshCw } from 'lucide-react';
import { analyzeDrumLoop, type AnalysisResult, type DrumPattern } from '@/lib/audio-analysis';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import bgImage from '@assets/generated_images/dark_synthwave_grid_background.png';

export default function Home() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [playing, setPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file);
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setResult(null);
      setError(null);
      setPlaying(false);
    }
  };

  const handleAnalyze = async () => {
    if (!audioFile) return;
    setAnalyzing(true);
    setError(null);
    
    try {
      const analysisResult = await analyzeDrumLoop(audioFile);
      setResult(analysisResult);
      toast({
        title: "Analysis Complete",
        description: "Drum pattern successfully converted to Strudel code.",
      });
    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err.message || 'Could not analyze audio. Make sure it\'s a valid drum loop file.');
      toast({
        title: "Analysis Failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setAnalyzing(false);
    }
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
      console.error("Playback failed", err);
      setPlaying(false);
      toast({
        title: "Playback Failed",
        description: "Could not play audio. Try a different file.",
        variant: "destructive"
      });
    }
  };

  const copyCode = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.code);
    setCopied(true);
    toast({
      title: "Copied to Clipboard",
      description: "Strudel code copied!",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setAudioFile(null);
    setAudioUrl(null);
    setResult(null);
    setError(null);
    setPlaying(false);
  };

  return (
    <div className="min-h-screen text-white relative overflow-hidden font-sans selection:bg-primary/40">
      {/* Background */}
      <div className="fixed inset-0 z-[-1]">
         <img 
           src={bgImage} 
           alt="Background" 
           className="w-full h-full object-cover opacity-40"
         />
         <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/90 to-background"></div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="text-center mb-16 relative">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center justify-center gap-3 mb-6 bg-white/5 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 shadow-lg shadow-primary/10"
          >
            <Music2 className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium tracking-wide uppercase text-primary-foreground/80">Audio to Code Converter</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="text-6xl md:text-7xl font-bold mb-6 tracking-tight font-display bg-clip-text text-transparent bg-gradient-to-r from-white via-primary-foreground to-primary/50 neon-text"
          >
            DRUM TO STRUDEL
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-muted-foreground max-w-2xl mx-auto font-light"
          >
            Transform your drum loops into live coding patterns instantly. 
            <br/>Drop a beat, get the code.
          </motion.p>
        </header>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Left Column: Input & Visuals */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            {/* Upload Zone */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-2xl opacity-20 blur-xl group-hover:opacity-30 transition-opacity duration-500"></div>
              <div className={`relative glass-panel rounded-2xl p-8 border-2 border-dashed transition-all duration-300 ${audioFile ? 'border-primary/50 bg-primary/5' : 'border-white/10 hover:border-primary/30'}`}>
                
                {!audioFile ? (
                  <label className="cursor-pointer flex flex-col items-center justify-center h-64">
                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-white/10">
                      <Upload className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2 font-display">Drop Drum Loop</h3>
                    <p className="text-muted-foreground mb-6 text-center">or click to browse files</p>
                    <div className="flex gap-4 text-xs text-muted-foreground uppercase tracking-wider font-mono">
                      <span className="bg-white/5 px-3 py-1 rounded border border-white/10">MP3</span>
                      <span className="bg-white/5 px-3 py-1 rounded border border-white/10">WAV</span>
                      <span className="bg-white/5 px-3 py-1 rounded border border-white/10">OGG</span>
                    </div>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="flex flex-col h-64 justify-between">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-primary/20 border border-primary/30">
                          <FileAudio className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg truncate max-w-[200px]">{audioFile.name}</h3>
                          <p className="text-sm text-muted-foreground">{(audioFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <button onClick={reset} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-muted-foreground hover:text-white">
                        <RefreshCw className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Simple Visualizer Placeholder */}
                    <div className="flex items-end gap-1 h-24 justify-center opacity-80">
                      {[...Array(30)].map((_, i) => (
                        <motion.div 
                          key={i}
                          animate={playing ? { 
                            height: [20 + Math.random() * 20 + "%", 80 + Math.random() * 20 + "%", 20 + Math.random() * 20 + "%"] 
                          } : { height: "20%" }}
                          transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.05 }}
                          className="w-2 bg-gradient-to-t from-primary to-secondary rounded-t-sm opacity-70"
                        />
                      ))}
                    </div>

                    <div className="flex gap-4">
                       <button
                        onClick={togglePlayback}
                        className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 py-3 rounded-xl font-medium transition-all border border-white/5"
                      >
                        {playing ? (
                          <>
                            <Square className="w-4 h-4 fill-current" /> Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 fill-current" /> Preview
                          </>
                        )}
                      </button>
                      
                      {!result && (
                        <button
                          onClick={handleAnalyze}
                          disabled={analyzing}
                          className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {analyzing ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4 fill-current" /> Analyze
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    <audio ref={audioRef} src={audioUrl || ''} onEnded={() => setPlaying(false)} loop className="hidden" onError={(e) => {
                      console.error("Audio error", e);
                      setPlaying(false);
                      toast({ title: "Audio Error", description: "Could not load audio file.", variant: "destructive" });
                    }} />
                  </div>
                )}
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-destructive-foreground">{error}</p>
              </motion.div>
            )}
          </motion.div>

          {/* Right Column: Results */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-6"
          >
            {!result ? (
              <div className="h-full min-h-[300px] glass-panel rounded-2xl p-8 flex flex-col items-center justify-center text-center border-dashed border-2 border-white/5">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <Code2 className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-xl font-semibold text-muted-foreground/80">Ready to Generate</h3>
                <p className="text-muted-foreground/50 mt-2 max-w-xs">Upload a drum loop to see the Strudel code and analysis here.</p>
              </div>
            ) : (
              <AnimatePresence>
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6"
                >
                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-4">
                    <StatCard label="BPM" value={result.pattern.bpm} />
                    <StatCard label="Beats" value={result.pattern.beats} />
                    <StatCard label="Bars" value={result.pattern.bars} />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                     <StatCard label="Kicks" value={result.pattern.kicks} color="text-cyan-400" />
                     <StatCard label="Snares" value={result.pattern.snares} color="text-pink-400" />
                     <StatCard label="Hi-Hats" value={result.pattern.hihats} color="text-yellow-400" />
                  </div>

                  {/* Code Block */}
                  <div className="glass-panel rounded-2xl overflow-hidden border border-primary/30 shadow-2xl shadow-primary/5">
                    <div className="bg-black/40 px-4 py-3 flex items-center justify-between border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-primary" />
                        <span className="text-sm font-mono text-muted-foreground">generated.strudel</span>
                      </div>
                      <button 
                        onClick={copyCode}
                        className="text-xs flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors font-medium uppercase tracking-wider"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'Copied' : 'Copy Code'}
                      </button>
                    </div>
                    <div className="p-6 bg-black/60 overflow-x-auto">
                      <CodeBlock code={result.code} />
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <a 
                      href="https://strudel.repl.co" 
                      target="_blank" 
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors group"
                    >
                      Open Strudel Editor <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </a>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color = "text-white" }: { label: string, value: string | number, color?: string }) {
  return (
    <div className="glass-panel p-4 rounded-xl text-center">
      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-2xl font-bold font-display ${color}`}>{value}</div>
    </div>
  );
}

// Safer syntax highlighter component
const CodeBlock = ({ code }: { code: string }) => {
  return (
    <pre className="font-mono text-sm leading-relaxed">
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
        <span className="text-gray-500">{commentPart}</span>
      </>
    );
  }
  return processCode(line);
};

const processCode = (text: string) => {
  // Split by strings (double quotes or backticks)
  const parts = text.split(/("[^"]*"|`[^`]*`)/g);
  return parts.map((part, i) => {
    if ((part.startsWith('"') && part.endsWith('"')) || (part.startsWith('`') && part.endsWith('`'))) {
      return <span key={i} className="text-yellow-300">{part}</span>;
    }
    // Process keywords and numbers in non-string parts
    return <span key={i} dangerouslySetInnerHTML={{ __html: highlightKeywords(part) }} />;
  });
};

const highlightKeywords = (text: string) => {
  return text
    .replace(/\b(stack|s|cpm|slow)\b/g, '<span class="text-primary font-bold">$1</span>')
    .replace(/\b(\d+)\b/g, '<span class="text-cyan-400">$1</span>');
};
