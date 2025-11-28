export interface DrumPattern {
  bpm: number;
  beats: number;
  bars: number;
  kicks: number;
  snares: number;
  hihats: number;
  duration: string;
}

export interface AnalysisResult {
  pattern: DrumPattern;
  code: string;
}

export const analyzeDrumLoop = async (file: File): Promise<AnalysisResult> => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const duration = audioBuffer.duration;
    
    // Check if file is too long
    if (duration > 8) {
      throw new Error('File is too long! Please use loops of 1-4 bars (typically under 8 seconds).');
    }
    
    // Detect tempo with improved algorithm
    const bpm = detectTempo(channelData, sampleRate);
    
    // Calculate number of beats in the loop
    const beatsInLoop = Math.round((duration / 60) * bpm);
    const bars = beatsInLoop / 4;
    
    // Only analyze if it's a reasonable loop length (1-4 bars)
    if (beatsInLoop < 2 || beatsInLoop > 16) {
      throw new Error(`Detected ${beatsInLoop} beats - should be 4-16 beats. Try a different loop.`);
    }
    
    // Use 32nd note resolution for better quantization
    const steps = beatsInLoop * 8;
    
    // Get frequency-specific energy profiles using OfflineAudioContext
    // This is much more accurate than raw waveform analysis
    const { lows, mids, highs } = await analyzeFrequencies(audioBuffer, steps);
    
    // Detect drum hits using frequency profiles
    const kicks = classifyKicks(lows, mids, highs);
    const snares = classifySnares(lows, mids, highs);
    const hihats = classifyHiHats(lows, mids, highs);
    
    const drumPattern: DrumPattern = {
      bpm: Math.round(bpm),
      beats: beatsInLoop,
      bars: bars,
      kicks: kicks.filter(k => k).length,
      snares: snares.filter(s => s).length,
      hihats: hihats.filter(h => h).length,
      duration: duration.toFixed(2)
    };
    
    // Generate Strudel code
    const code = generateDrumCode(kicks, snares, hihats, bpm, beatsInLoop);
    
    return { pattern: drumPattern, code };
  } finally {
    audioContext.close();
  }
};

async function analyzeFrequencies(buffer: AudioBuffer, steps: number) {
  const offlineCtx = new OfflineAudioContext(1, buffer.length, buffer.sampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;

  // We need to process the audio 3 times with different filters
  // Since OfflineAudioContext renders once, we'll do it sequentially or use 3 separate contexts.
  // Actually, 8 seconds is short. Let's use 3 separate rendering passes for simplicity and clarity.
  
  const getFilteredData = async (type: BiquadFilterType, freq: number, q: number = 1) => {
    const ctx = new OfflineAudioContext(1, buffer.length, buffer.sampleRate);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    
    src.connect(filter);
    filter.connect(ctx.destination);
    src.start(0);
    
    const renderedBuffer = await ctx.startRendering();
    return getStepEnergy(renderedBuffer.getChannelData(0), steps);
  };

  const [lows, mids, highs] = await Promise.all([
    getFilteredData('lowpass', 150),        // Kick range
    getFilteredData('bandpass', 400, 1),    // Snare body range
    getFilteredData('highpass', 5000)       // Hi-hat range
  ]);

  return { lows, mids, highs };
}

const detectTempo = (data: Float32Array, sampleRate: number) => {
  // Improved onset-based tempo detection
  const frameSize = 2048;
  const hopSize = 512;
  const energies = [];
  
  // Calculate spectral flux
  for (let i = 0; i < data.length - frameSize; i += hopSize) {
    let energy = 0;
    for (let j = 0; j < frameSize; j++) {
      energy += data[i + j] * data[i + j];
    }
    energies.push(Math.sqrt(energy / frameSize));
  }
  
  // Find peaks
  const threshold = Math.max(...energies) * 0.3;
  const peaks = [];
  for (let i = 2; i < energies.length - 2; i++) {
    if (energies[i] > threshold && 
        energies[i] > energies[i-1] && 
        energies[i] > energies[i-2] &&
        energies[i] > energies[i+1] &&
        energies[i] > energies[i+2]) {
      peaks.push(i * hopSize / sampleRate);
    }
  }
  
  if (peaks.length < 4) return 120;
  
  // Calculate inter-onset intervals
  const intervals = [];
  for (let i = 1; i < peaks.length; i++) {
    const interval = peaks[i] - peaks[i-1];
    if (interval > 0.15 && interval < 2) { // Filter unrealistic intervals
      intervals.push(interval);
    }
  }
  
  if (intervals.length === 0) return 120;
  
  // Use median interval for robustness
  intervals.sort((a, b) => a - b);
  const medianInterval = intervals[Math.floor(intervals.length / 2)];
  
  // Convert to BPM
  let bpm = 60 / medianInterval;
  
  // Snap to reasonable tempo range (prefer 75-150 for most drum loops)
  // If it's extremely fast (>160), it's likely double time
  while (bpm < 75) bpm *= 2;
  while (bpm > 160) bpm /= 2;
  
  return bpm;
};

function getStepEnergy(data: Float32Array, steps: number) {
  const stepSize = Math.floor(data.length / steps);
  const energies = [];
  
  // Calculate global max for normalization
  let globalMax = 0;
  for (let i = 0; i < data.length; i++) {
    const val = Math.abs(data[i]);
    if (val > globalMax) globalMax = val;
  }

  for (let step = 0; step < steps; step++) {
    const start = step * stepSize;
    const end = start + stepSize;
    let sum = 0;
    let peak = 0;
    
    for (let i = start; i < end && i < data.length; i++) {
      const val = Math.abs(data[i]);
      sum += val * val;
      if (val > peak) peak = val;
    }
    
    const rms = Math.sqrt(sum / (end - start));
    // Normalize
    energies.push({
      rms: rms / (globalMax || 1), 
      peak: peak / (globalMax || 1)
    });
  }
  return energies;
}

const classifyKicks = (lows: any[], mids: any[], highs: any[]) => {
  return lows.map((l, i) => {
    // Strong low end, significantly more than highs
    return l.rms > 0.15 && l.peak > 0.3 && l.rms > highs[i].rms * 1.5;
  });
};

const classifySnares = (lows: any[], mids: any[], highs: any[]) => {
  return mids.map((m, i) => {
    // Mid range punch, but not too much low end (to avoid kicks)
    return m.rms > 0.15 && m.peak > 0.25 && lows[i].rms < 0.4;
  });
};

const classifyHiHats = (lows: any[], mids: any[], highs: any[]) => {
  return highs.map((h, i) => {
    // Pure high frequency energy
    return h.rms > 0.05 && h.peak > 0.1 && lows[i].rms < 0.2 && mids[i].rms < 0.2;
  });
};

const patternToString = (pattern: boolean[], sound: string) => {
  // Group into beats (8 steps per beat for 32nd notes)
  const stepsPerBeat = 8;
  const beats = [];
  
  for (let i = 0; i < pattern.length; i += stepsPerBeat) {
    const beatSteps = pattern.slice(i, i + stepsPerBeat);
    const beatStr = beatSteps.map(hit => hit ? sound : '~').join(' ');
    beats.push(beatStr);
  }
  
  return beats;
};

const generateDrumCode = (kicks: boolean[], snares: boolean[], hihats: boolean[], bpm: number, beats: number) => {
  const kickBeats = patternToString(kicks, 'bd');
  const snareBeats = patternToString(snares, 'sd');
  const hihatBeats = patternToString(hihats, 'hh');
  
  let code = `// ${beats} beat drum loop @ ${Math.round(bpm)} BPM\n`;
  code += `// 32nd note quantization\n\n`;
  
  code += `stack(\n`;
  
  const buildInstrumentTrack = (beatArray: string[]) => {
    let track = `  s(\`\n`;
    // Group into bars (4 beats per bar)
    for (let i = 0; i < beatArray.length; i += 4) {
      const barBeats = beatArray.slice(i, i + 4);
      track += `    ${barBeats.join('  ')}\n`;
    }
    track += `  \`)`;
    return track;
  };

  code += `${buildInstrumentTrack(kickBeats)},\n`;
  code += `${buildInstrumentTrack(snareBeats)},\n`;
  code += `${buildInstrumentTrack(hihatBeats)}\n`;
  
  code += `).slow(${beats}).cpm(${Math.round(bpm)})`;
  
  return code;
};
