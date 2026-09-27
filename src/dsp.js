// ─── DSP ENGINE ───────────────────────────────────────────────────────────────

export function nextPow2(n) {
  let p = 1
  while (p < n) p <<= 1
  return p
}

export function hannWindow(i, N) {
  return 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1)))
}

export function fftInPlace(re, im, N) {
  let j = 0
  for (let i = 1; i < N; i++) {
    let bit = N >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      ;[re[i], re[j]] = [re[j], re[i]]
      ;[im[i], im[j]] = [im[j], im[i]]
    }
  }
  for (let len = 2; len <= N; len <<= 1) {
    const ang = (-2 * Math.PI) / len
    const wRe = Math.cos(ang)
    const wIm = Math.sin(ang)
    for (let i = 0; i < N; i += len) {
      let curRe = 1, curIm = 0
      for (let k = 0; k < len / 2; k++) {
        const uRe = re[i + k], uIm = im[i + k]
        const vRe = re[i + k + len / 2] * curRe - im[i + k + len / 2] * curIm
        const vIm = re[i + k + len / 2] * curIm + im[i + k + len / 2] * curRe
        re[i + k] = uRe + vRe; im[i + k] = uIm + vIm
        re[i + k + len / 2] = uRe - vRe; im[i + k + len / 2] = uIm - vIm
        const nr = curRe * wRe - curIm * wIm
        curIm = curRe * wIm + curIm * wRe
        curRe = nr
      }
    }
  }
}

export function computeFFT(signal) {
  const N = signal.length
  const re = new Float64Array(N)
  const im = new Float64Array(N)
  for (let i = 0; i < N; i++) re[i] = signal[i] * hannWindow(i, N)
  fftInPlace(re, im, N)
  const mag = new Float64Array(N)
  for (let i = 0; i < N; i++) mag[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]) / N
  for (let i = 1; i < N / 2 - 1; i++) mag[i] *= 2
  return { re, im, mag }
}

export function computeComplexFFT(I, Q, N) {
  const re = new Float64Array(N)
  const im = new Float64Array(N)
  for (let i = 0; i < N && i < I.length; i++) {
    const w = hannWindow(i, N)
    re[i] = I[i] * w
    im[i] = Q[i] * w
  }
  fftInPlace(re, im, N)
  const mag = new Float64Array(N)
  for (let i = 0; i < N; i++) mag[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]) / N
  return { re, im, mag }
}

export function fftShift(mag, freqs) {
  const N = mag.length
  const half = Math.floor(N / 2)
  const magArr = Array.from(mag)
  const freqArr = Array.from(freqs)
  return {
    mag: [...magArr.slice(half), ...magArr.slice(0, half)],
    freqs: [...freqArr.slice(half), ...freqArr.slice(0, half)],
  }
}

export function argMax(arr) {
  let idx = 0
  for (let i = 1; i < arr.length; i++) if (arr[i] > arr[idx]) idx = i
  return idx
}

export function computeStats(arr) {
  const n = arr.length
  if (n === 0) return {}
  let sum = 0, sumSq = 0, min = Infinity, max = -Infinity
  for (let i = 0; i < n; i++) {
    const v = arr[i]
    sum += v; sumSq += v * v
    if (v < min) min = v
    if (v > max) max = v
  }
  const mean = sum / n
  const std = Math.sqrt(Math.max(0, sumSq / n - mean * mean))
  const rms = Math.sqrt(sumSq / n)
  const peak = Math.max(Math.abs(min), Math.abs(max))
  return { mean, std, rms, min, max, peak, peakToPeak: max - min }
}

export function computeZCR(signal, sampleRate) {
  let crossings = 0
  for (let i = 1; i < signal.length; i++) {
    if ((signal[i] >= 0) !== (signal[i - 1] >= 0)) crossings++
  }
  return crossings / (2 * (signal.length / sampleRate))
}

export function computeBandwidth(freqs, mag) {
  const peakMag = Math.max(...mag)
  const halfPower = peakMag / Math.sqrt(2)
  const peakIdx = argMax(mag)
  let lo = freqs[0], hi = freqs[freqs.length - 1]
  for (let i = peakIdx; i >= 0; i--) { if (mag[i] < halfPower) { lo = freqs[i]; break } }
  for (let i = peakIdx; i < mag.length; i++) { if (mag[i] < halfPower) { hi = freqs[i]; break } }
  return Math.abs(hi - lo)
}

export function downsampleSignal(signal, targetN) {
  if (signal.length <= targetN) return signal
  const step = signal.length / targetN
  const out = new Float64Array(targetN)
  for (let i = 0; i < targetN; i++) {
    const s = Math.floor(i * step)
    const e = Math.floor((i + 1) * step)
    let mn = Infinity, mx = -Infinity
    for (let j = s; j < e && j < signal.length; j++) {
      if (signal[j] < mn) mn = signal[j]
      if (signal[j] > mx) mx = signal[j]
    }
    out[i] = Math.abs(mx) > Math.abs(mn) ? mx : mn
  }
  return out
}

export function computeSpectrogram(signal, sampleRate, maxSamples = 32768) {
  const sig = signal.slice(0, maxSamples)
  const fftN = 256
  const hopSize = Math.max(1, Math.floor(sig.length / 128))
  const nFrames = Math.floor((sig.length - fftN) / hopSize)
  if (nFrames < 2) return null
  const freqAxis = Array.from({ length: fftN / 2 }, (_, i) => (i * sampleRate) / fftN)
  const timeAxis = Array.from({ length: nFrames }, (_, i) => ((i * hopSize + fftN / 2) / sampleRate))
  const z = []
  for (let f = 0; f < nFrames; f++) {
    const frame = new Float64Array(fftN)
    for (let i = 0; i < fftN; i++) frame[i] = sig[f * hopSize + i] || 0
    const { mag } = computeFFT(frame)
    z.push(Array.from(mag.slice(0, fftN / 2)).map(m => 20 * Math.log10(m + 1e-12)))
  }
  return { z, timeAxis, freqAxis }
}

export function computeSpectrogramIQ(I, Q, sampleRate, maxSamples = 16384) {
  const fftN = 256
  const n = Math.min(I.length, maxSamples)
  const hopSize = Math.max(1, Math.floor(n / 128))
  const nFrames = Math.floor((n - fftN) / hopSize)
  if (nFrames < 2) return null
  const freqAxisRaw = Array.from({ length: fftN }, (_, i) => {
    const bin = i < fftN / 2 ? i : i - fftN
    return (bin * sampleRate) / fftN
  })
  const timeAxis = Array.from({ length: nFrames }, (_, i) => ((i * hopSize + fftN / 2) / sampleRate))
  const z = []
  for (let f = 0; f < nFrames; f++) {
    const fi = new Float64Array(fftN), fq = new Float64Array(fftN)
    for (let i = 0; i < fftN; i++) { fi[i] = I[f * hopSize + i] || 0; fq[i] = Q[f * hopSize + i] || 0 }
    const { mag } = computeComplexFFT(fi, fq, fftN)
    const shifted = fftShift(mag, freqAxisRaw)
    z.push(shifted.mag.map(m => 20 * Math.log10(m + 1e-12)))
  }
  const shiftedFreqs = fftShift(new Float64Array(fftN), freqAxisRaw).freqs
  return { z, timeAxis, freqAxis: shiftedFreqs }
}

// ─── WAV PARSER ───────────────────────────────────────────────────────────────
export async function analyzeWAV(file, onStep) {
  onStep('read', 'running')
  const arrayBuffer = await file.arrayBuffer()
  const view = new DataView(arrayBuffer)

  const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3))
  if (riff !== 'RIFF') throw new Error('Invalid WAV file: missing RIFF header.')
  const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11))
  if (wave !== 'WAVE') throw new Error('Invalid WAV file: missing WAVE identifier.')

  let offset = 12
  let fmtFound = false, dataOffset = 0, dataSize = 0
  let audioFormat = 1, numChannels = 1, sampleRate = 44100, bitsPerSample = 16

  while (offset < arrayBuffer.byteLength - 8) {
    const chunkId = String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3))
    const chunkSize = view.getUint32(offset + 4, true)
    offset += 8
    if (chunkId === 'fmt ') {
      audioFormat = view.getUint16(offset, true)
      numChannels = view.getUint16(offset + 2, true)
      sampleRate = view.getUint32(offset + 4, true)
      bitsPerSample = view.getUint16(offset + 14, true)
      fmtFound = true
    } else if (chunkId === 'data') {
      dataOffset = offset; dataSize = chunkSize; break
    }
    offset += chunkSize + (chunkSize % 2)
  }

  if (!fmtFound) throw new Error('Malformed WAV: fmt chunk not found.')
  if (!dataOffset) throw new Error('Malformed WAV: data chunk not found.')
  if (!dataSize) throw new Error('WAV file contains no audio data.')

  onStep('read', 'done'); onStep('validate', 'running')
  await delay(60)

  const bytesPerSample = bitsPerSample / 8
  const totalSamples = Math.floor(dataSize / (bytesPerSample * numChannels))
  if (totalSamples < 16) throw new Error('WAV file has too few samples for analysis.')

  const signal = new Float64Array(totalSamples)
  for (let i = 0; i < totalSamples; i++) {
    const byteIdx = dataOffset + i * bytesPerSample * numChannels
    if (byteIdx + bytesPerSample > arrayBuffer.byteLength) break
    let s = 0
    if (bitsPerSample === 8) s = (view.getUint8(byteIdx) - 128) / 128
    else if (bitsPerSample === 16) s = view.getInt16(byteIdx, true) / 32768
    else if (bitsPerSample === 24) {
      let v = (view.getUint8(byteIdx + 2) << 16) | (view.getUint8(byteIdx + 1) << 8) | view.getUint8(byteIdx)
      if (v >= 0x800000) v -= 0x1000000
      s = v / 8388608
    } else if (bitsPerSample === 32) {
      s = audioFormat === 3 ? view.getFloat32(byteIdx, true) : view.getInt32(byteIdx, true) / 2147483648
    }
    signal[i] = s
  }

  onStep('validate', 'done'); onStep('fft', 'running')
  await delay(80)

  const vizSig = downsampleSignal(signal, Math.min(totalSamples, 8000))
  const fftSize = nextPow2(Math.min(totalSamples, 65536))
  const { mag } = computeFFT(signal.slice(0, fftSize))
  const freqBins = Array.from({ length: fftSize / 2 }, (_, i) => (i * sampleRate) / fftSize)
  const halfMag = mag.slice(0, fftSize / 2)
  const magnitudeDB = Array.from(halfMag).map(m => 20 * Math.log10(m + 1e-12))
  const dominantFreq = freqBins[argMax(Array.from(halfMag).slice(1)) + 1]
  const freqResolution = sampleRate / fftSize

  onStep('fft', 'done'); onStep('spectrogram', 'running')
  await delay(100)

  const specResult = computeSpectrogram(signal, sampleRate)

  onStep('spectrogram', 'done'); onStep('params', 'running')
  await delay(60)

  const stats = computeStats(signal)
  const zcr = computeZCR(signal, sampleRate)
  const bw = computeBandwidth(freqBins, Array.from(halfMag))

  onStep('params', 'done'); onStep('viz', 'running')
  await delay(40)
  onStep('viz', 'done')

  const timeAxis = Array.from({ length: vizSig.length }, (_, i) => (i / sampleRate) * (totalSamples / vizSig.length))

  return {
    fileInfo: { name: file.name, type: 'WAV', size: fmtBytes(file.size), rawSize: file.size, sampleRate, numChannels, bitsPerSample, audioFormat: audioFormat === 1 ? 'PCM' : audioFormat === 3 ? 'IEEE Float' : 'Unknown', duration: totalSamples / sampleRate, totalSamples, isIQ: false },
    stats, zcr,
    frequency: { dominantFreq, freqResolution, bandwidth: bw, fftSize },
    viz: { waveformTime: Array.from(timeAxis), waveformAmp: Array.from(vizSig), freqBins: Array.from(freqBins), magnitudeDB, spectrogram: specResult },
    timestamp: new Date().toISOString(),
  }
}

// ─── IQ PARSER ────────────────────────────────────────────────────────────────
export async function analyzeIQ(file, cfg, onStep) {
  const { sampleRate, dataType, byteOrder } = cfg
  const isLE = byteOrder === 'little'

  onStep('read', 'running')
  const arrayBuffer = await file.arrayBuffer()
  if (arrayBuffer.byteLength < 8) throw new Error('IQ file is too small.')

  const bytesPerSample = { float32: 4, float64: 8, int16: 2, int8: 1, uint8: 1 }[dataType] || 4
  const totalComplex = Math.floor(arrayBuffer.byteLength / (2 * bytesPerSample))
  if (totalComplex < 8) throw new Error(`IQ file too small for data type "${dataType}". Check configuration.`)

  const maxSamples = Math.min(totalComplex, 500000)
  const I = new Float64Array(maxSamples), Q = new Float64Array(maxSamples)
  const view = new DataView(arrayBuffer)

  const readS = (off) => {
    switch (dataType) {
      case 'float32': return view.getFloat32(off, isLE)
      case 'float64': return view.getFloat64(off, isLE)
      case 'int16':   return view.getInt16(off, isLE) / 32768
      case 'int8':    return view.getInt8(off) / 128
      case 'uint8':   return (view.getUint8(off) - 128) / 128
      default: return 0
    }
  }
  for (let i = 0; i < maxSamples; i++) {
    const off = i * 2 * bytesPerSample
    I[i] = readS(off)
    Q[i] = readS(off + bytesPerSample)
  }

  onStep('read', 'done'); onStep('validate', 'running')
  await delay(60)

  const magnitude = new Float64Array(maxSamples)
  const phase = new Float64Array(maxSamples)
  for (let i = 0; i < maxSamples; i++) {
    magnitude[i] = Math.sqrt(I[i] * I[i] + Q[i] * Q[i])
    phase[i] = (Math.atan2(Q[i], I[i]) * 180) / Math.PI
  }

  onStep('validate', 'done'); onStep('fft', 'running')
  await delay(80)

  const fftSize = nextPow2(Math.min(maxSamples, 65536))
  const cFFT = computeComplexFFT(I, Q, fftSize)
  const freqBinsRaw = Array.from({ length: fftSize }, (_, i) => { const b = i < fftSize / 2 ? i : i - fftSize; return (b * sampleRate) / fftSize })
  const sorted = fftShift(cFFT.mag, freqBinsRaw)
  const dominantFreq = sorted.freqs[argMax(sorted.mag)]
  const freqResolution = sampleRate / fftSize
  const bw = computeBandwidth(sorted.freqs, sorted.mag)

  onStep('fft', 'done'); onStep('spectrogram', 'running')
  await delay(100)

  const specResult = computeSpectrogramIQ(I, Q, sampleRate)

  onStep('spectrogram', 'done'); onStep('params', 'running')
  await delay(60)

  const statsI = computeStats(I)
  const statsQ = computeStats(Q)
  const statsMag = computeStats(magnitude)
  const statsPhase = computeStats(phase)
  const stats = computeStats(magnitude)
  const zcr = computeZCR(magnitude, sampleRate)

  onStep('params', 'done'); onStep('viz', 'running')
  await delay(40)

  const vizN = Math.min(maxSamples, 6000)
  const step = Math.ceil(maxSamples / vizN)
  const vizIdx = []
  for (let i = 0; i < maxSamples; i += step) vizIdx.push(i)
  const timeAxis = vizIdx.map(i => i / sampleRate)

  const scatterN = Math.min(maxSamples, 3000)
  const sStep = Math.ceil(maxSamples / scatterN)
  const scatterI = [], scatterQ = []
  for (let i = 0; i < maxSamples; i += sStep) { scatterI.push(I[i]); scatterQ.push(Q[i]) }

  onStep('viz', 'done')

  return {
    fileInfo: { name: file.name, type: 'IQ', size: fmtBytes(file.size), rawSize: file.size, sampleRate, dataType, byteOrder, duration: maxSamples / sampleRate, totalSamples: maxSamples, isIQ: true },
    stats, statsI, statsQ, statsMag, statsPhase, zcr,
    frequency: { dominantFreq, freqResolution, bandwidth: bw, fftSize },
    viz: {
      waveformTime: timeAxis,
      waveformAmp: vizIdx.map(i => magnitude[i]),
      freqBins: sorted.freqs,
      magnitudeDB: sorted.mag.map(m => 20 * Math.log10(m + 1e-12)),
      spectrogram: specResult,
      iqI: vizIdx.map(i => I[i]),
      iqQ: vizIdx.map(i => Q[i]),
      iqMag: vizIdx.map(i => magnitude[i]),
      iqPhase: vizIdx.map(i => phase[i]),
      scatterI, scatterQ,
    },
    timestamp: new Date().toISOString(),
  }
}

// ─── DEMO GENERATORS ──────────────────────────────────────────────────────────
export function generateWAVBuffer(samples, sampleRate) {
  const nc = 1, bits = 16
  const dataSize = samples.length * 2
  const buf = new ArrayBuffer(44 + dataSize)
  const v = new DataView(buf)
  const ws = (s, o) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }
  ws('RIFF', 0); v.setUint32(4, 36 + dataSize, true); ws('WAVE', 8)
  ws('fmt ', 12); v.setUint32(16, 16, true); v.setUint16(20, 1, true)
  v.setUint16(22, nc, true); v.setUint32(24, sampleRate, true)
  v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, bits, true)
  ws('data', 36); v.setUint32(40, dataSize, true)
  for (let i = 0; i < samples.length; i++) v.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), true)
  return buf
}

export function buildDemoFile(type) {
  const SR = 48000, N = SR * 2
  switch (type) {
    case 'sine': {
      const s = new Float32Array(N)
      for (let i = 0; i < N; i++) s[i] = Math.sin(2 * Math.PI * 1000 * i / SR)
      return { file: new File([generateWAVBuffer(s, SR)], 'demo_sine_1kHz.wav', { type: 'audio/wav' }), cfg: null }
    }
    case 'multi': {
      const s = new Float32Array(N)
      for (let i = 0; i < N; i++) s[i] = 0.5 * Math.sin(2 * Math.PI * 440 * i / SR) + 0.3 * Math.sin(2 * Math.PI * 1000 * i / SR) + 0.2 * Math.sin(2 * Math.PI * 3500 * i / SR)
      const pk = Math.max(...Array.from(s).map(Math.abs))
      for (let i = 0; i < N; i++) s[i] /= pk
      return { file: new File([generateWAVBuffer(s, SR)], 'demo_multi_freq.wav', { type: 'audio/wav' }), cfg: null }
    }
    case 'noisy': {
      const s = new Float32Array(N)
      for (let i = 0; i < N; i++) s[i] = 0.7 * Math.sin(2 * Math.PI * 1000 * i / SR) + 0.3 * (Math.random() * 2 - 1)
      return { file: new File([generateWAVBuffer(s, SR)], 'demo_noisy_1kHz.wav', { type: 'audio/wav' }), cfg: null }
    }
    case 'chirp': {
      const s = new Float32Array(N)
      for (let i = 0; i < N; i++) { const t = i / SR; s[i] = Math.sin(2 * Math.PI * (200 + (4800 * t / 2)) * t) }
      return { file: new File([generateWAVBuffer(s, SR)], 'demo_chirp.wav', { type: 'audio/wav' }), cfg: null }
    }
    case 'iq_tone': {
      const iqN = 100000, iqSR = 1e6, fc = 100e3
      const buf = new ArrayBuffer(iqN * 8)
      const dv = new DataView(buf)
      for (let i = 0; i < iqN; i++) {
        const t = i / iqSR
        dv.setFloat32(i * 8, Math.cos(2 * Math.PI * fc * t), true)
        dv.setFloat32(i * 8 + 4, Math.sin(2 * Math.PI * fc * t), true)
      }
      return { file: new File([buf], 'demo_iq_tone.iq', { type: 'application/octet-stream' }), cfg: { sampleRate: 1e6, dataType: 'float32', byteOrder: 'little' } }
    }
    case 'iq_am': {
      const iqN = 100000, iqSR = 500000, fc = 50e3, fm = 2000
      const buf = new ArrayBuffer(iqN * 8)
      const dv = new DataView(buf)
      for (let i = 0; i < iqN; i++) {
        const t = i / iqSR, env = 1 + 0.5 * Math.cos(2 * Math.PI * fm * t)
        dv.setFloat32(i * 8, env * Math.cos(2 * Math.PI * fc * t), true)
        dv.setFloat32(i * 8 + 4, env * Math.sin(2 * Math.PI * fc * t), true)
      }
      return { file: new File([buf], 'demo_iq_am.iq', { type: 'application/octet-stream' }), cfg: { sampleRate: 5e5, dataType: 'float32', byteOrder: 'little' } }
    }
    default: return null
  }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
export function fmtBytes(b) {
  if (b < 1024) return b + ' B'
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'
  return (b / 1048576).toFixed(2) + ' MB'
}

export function fmtFreq(hz) {
  const a = Math.abs(hz)
  if (a >= 1e6) return (hz / 1e6).toFixed(3) + ' MHz'
  if (a >= 1000) return (hz / 1000).toFixed(3) + ' kHz'
  return hz.toFixed(2) + ' Hz'
}

export function fmtNum(v, d = 4) {
  if (v === null || v === undefined || isNaN(v)) return 'N/A'
  const a = Math.abs(v)
  if (a === 0) return '0'
  if (a >= 1e6) return (v / 1e6).toFixed(2) + 'M'
  if (a >= 1000) return Number(v.toFixed(d)).toLocaleString()
  if (a >= 1) return Number(v.toPrecision(5)).toString()
  return v.toFixed(d)
}

const delay = (ms) => new Promise(r => setTimeout(r, ms))
