const AUDIO_SAMPLE_COUNT = 2048;
const AUDIO_HARMONIC_COUNT = 128;
const AUDIO_GAIN = 0.5;

export function createAudioController({ getAmplitudeAtX, getFrequency, onStatus }) {
    let audioContext = null;
    let oscillator = null;
    let gainNode = null;
    let periodicWave = null;
    let isPlaying = false;

    function ensureAudioContext() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (!gainNode) {
            gainNode = audioContext.createGain();
            gainNode.gain.value = AUDIO_GAIN;
            gainNode.connect(audioContext.destination);
        }
    }

    function stop() {
        if (oscillator) {
            oscillator.stop();
            oscillator = null;
        }
        isPlaying = false;
    }

    function createPeriodicWaveData() {
        const samples = sampleWaveform(AUDIO_SAMPLE_COUNT);
        const real = new Float32Array(AUDIO_HARMONIC_COUNT + 1);
        const imag = new Float32Array(AUDIO_HARMONIC_COUNT + 1);

        real[0] = samples.reduce((sum, sample) => sum + sample, 0) / AUDIO_SAMPLE_COUNT;
        for (let harmonic = 1; harmonic <= AUDIO_HARMONIC_COUNT; harmonic++) {
            let cosineSum = 0;
            let sineSum = 0;
            for (let sampleIndex = 0; sampleIndex < AUDIO_SAMPLE_COUNT; sampleIndex++) {
                const phase = (2 * Math.PI * harmonic * sampleIndex) / AUDIO_SAMPLE_COUNT;
                cosineSum += samples[sampleIndex] * Math.cos(phase);
                sineSum += samples[sampleIndex] * Math.sin(phase);
            }
            real[harmonic] = (2 * cosineSum) / AUDIO_SAMPLE_COUNT;
            imag[harmonic] = (2 * sineSum) / AUDIO_SAMPLE_COUNT;
        }

        let peak = 0;
        for (let sampleIndex = 0; sampleIndex < AUDIO_SAMPLE_COUNT; sampleIndex++) {
            let reconstructed = real[0];
            for (let harmonic = 1; harmonic <= AUDIO_HARMONIC_COUNT; harmonic++) {
                const phase = (2 * Math.PI * harmonic * sampleIndex) / AUDIO_SAMPLE_COUNT;
                reconstructed += real[harmonic] * Math.cos(phase)
                    + imag[harmonic] * Math.sin(phase);
            }
            peak = Math.max(peak, Math.abs(reconstructed));
        }

        if (peak > 0) {
            const scale = 0.9 / peak;
            for (let harmonic = 0; harmonic <= AUDIO_HARMONIC_COUNT; harmonic++) {
                real[harmonic] *= scale;
                imag[harmonic] *= scale;
            }
        }

        return { real, imag };
    }

    function sampleWaveform(sampleCount) {
        const samples = new Float32Array(sampleCount);
        for (let i = 0; i < sampleCount; i++) {
            samples[i] = getAmplitudeAtX(i / sampleCount);
        }
        return samples;
    }

    function play() {
        ensureAudioContext();
        const frequency = getFrequency();
        const waveData = createPeriodicWaveData();

        try {
            periodicWave = audioContext.createPeriodicWave(waveData.real, waveData.imag);
        } catch (error) {
            onStatus('PeriodicWave not supported, using one-shot mode', true);
            playOneShot();
            return;
        }

        stop();
        oscillator = audioContext.createOscillator();
        oscillator.setPeriodicWave(periodicWave);
        oscillator.frequency.value = frequency;
        oscillator.connect(gainNode);
        oscillator.start();
        isPlaying = true;
        onStatus(`Playing at ${frequency}Hz`);
    }

    function playOneShot() {
        const duration = 1.0;
        const sampleRate = audioContext.sampleRate;
        const numSamples = Math.floor(sampleRate * duration);
        const waveformData = sampleWaveform(numSamples);
        const buffer = audioContext.createBuffer(1, numSamples, sampleRate);
        buffer.getChannelData(0).set(waveformData);

        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(gainNode);
        source.onended = () => {
            isPlaying = false;
            onStatus('Playback complete!');
        };
        source.start();
        isPlaying = true;
        onStatus('Playing one-shot waveform...');
    }

    return {
        get isPlaying() {
            return isPlaying;
        },
        play,
        pause() {
            stop();
            onStatus('Paused. Click Play to resume.');
        },
        stop
    };
}
