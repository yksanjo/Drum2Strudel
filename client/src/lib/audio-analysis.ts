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
    
    // Use 16th note resolution
    const steps = beatsInLoop * 4;
    
    // Detect drum hits
    const onsets = detectOnsets(channelData, sampleRate, steps);
    const kicks = classifyKicks(channelData, sampleRate, onsets, steps);
    const snares = classifySnares(channelData, sampleRate, onsets, steps);
    const hihats = classifyHiHats(channelData, sampleRate, onsets, steps);
    
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

const detectOnsets = (data: Float32Array, sampleRate: number, totalSteps: number) => {
  const stepSize = Math.floor(data.length / totalSteps);
  const onsets = [];
  
  // Calculate global RMS to set dynamic thresholds
  let sumSquares = 0;
  for (let i = 0; i < data.length; i++) {
    sumSquares += data[i] * data[i];
  }
  const globalRMS = Math.sqrt(sumSquares / data.length);
  const dynamicThreshold = Math.max(0.02, globalRMS * 0.5);

  for (let step = 0; step < totalSteps; step++) {
    const start = step * stepSize;
    const end = Math.min(start + stepSize, data.length);
    // Look slightly outside the window to catch swing/late hits? 
    // No, strict quantization means we just look in the grid slot.
    
    let energy = 0;
    let peakValue = 0;
    
    for (let i = start; i < end; i++) {
      const val = Math.abs(data[i]);
      energy += val * val;
      peakValue = Math.max(peakValue, val);
    }
    
    energy = Math.sqrt(energy / (end - start));
    
    // Stricter onset detection:
    // 1. Energy must be significant relative to global level
    // 2. Peak must be sharp
    const hasOnset = energy > dynamicThreshold || peakValue > (globalRMS * 1.5);
    
    onsets.push({ step, energy, peakValue, hasOnset });
  }
  
  return onsets;
};

const classifyKicks = (data: Float32Array, sampleRate: number, onsets: any[], totalSteps: number) => {
  const pattern = new Array(totalSteps).fill(false);
  
  onsets.forEach(onset => {
    if (!onset.hasOnset) return;
    
    // Kicks are characterized by high energy and low frequency
    // They typically have strong low-end energy
    const isKick = onset.energy > 0.08 && onset.peakValue > 0.15;
    
    if (isKick) {
      pattern[onset.step] = true;
    }
  });
  
  return pattern;
};

const classifySnares = (data: Float32Array, sampleRate: number, onsets: any[], totalSteps: number) => {
  const pattern = new Array(totalSteps).fill(false);
  
  onsets.forEach(onset => {
    if (!onset.hasOnset) return;
    
    // Snares are mid-energy with sharp transients
    const isSnare = onset.energy > 0.04 && 
                    onset.energy < 0.12 && 
                    onset.peakValue > 0.08;
    
    if (isSnare) {
      pattern[onset.step] = true;
    }
  });
  
  return pattern;
};

const classifyHiHats = (data: Float32Array, sampleRate: number, onsets: any[], totalSteps: number) => {
  const pattern = new Array(totalSteps).fill(false);
  
  onsets.forEach(onset => {
    if (!onset.hasOnset) return;
    
    // Hi-hats are lower energy, more consistent
    const isHihat = onset.energy > 0.015 && 
                    onset.energy < 0.06 && 
                    onset.peakValue < 0.12;
    
    if (isHihat) {
      pattern[onset.step] = true;
    }
  });
  
  return pattern;
};

const patternToString = (pattern: boolean[], sound: string) => {
  return pattern.map(hit => hit ? sound : '~').join(' ');
};

const generateDrumCode = (kicks: boolean[], snares: boolean[], hihats: boolean[], bpm: number, beats: number) => {
  // Create mini-notation for each instrument
  const kickStr = patternToString(kicks, 'bd');
  const snareStr = patternToString(snares, 'sd');
  const hihatStr = patternToString(hihats, 'hh');
  
  let code = `// ${beats} beat drum loop @ ${Math.round(bpm)} BPM\n\n`;
  
  code += `stack(\n`;
  code += `  s("${kickStr}"),\n`;
  code += `  s("${snareStr}"),\n`;
  code += `  s("${hihatStr}")\n`;
  code += `).cpm(${Math.round(bpm)})`;
  
  return code;
};
