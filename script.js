import { createAudioController } from './audio.js';

const canvas = document.getElementById('waveCanvas');
const ctx = canvas.getContext('2d');
const playPauseBtn = document.getElementById('playPauseBtn');
const clearBtn = document.getElementById('clearBtn');
const pointCountSelect = document.getElementById('pointCount');
const pointCountValue = document.getElementById('pointCountValue');
const frequencySlider = document.getElementById('frequency');
const frequencyValue = document.getElementById('frequencyValue');
const status = document.getElementById('status');
const POINT_OPTIONS = [8, 16, 32, 64, 128, 256, 512, 1024];
const DEFAULT_POINTS = 64;
const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const CENTER = HEIGHT / 2;
const DEAD_ZONE = 20;
let points = [];
let authoredPoints = [];
let activePoint = null;
let dragging = false;
let audio;

const clampY = (y) => Math.max(DEAD_ZONE, Math.min(HEIGHT - DEAD_ZONE, y));
const normalizeY = (y) => Math.max(-1, Math.min(1, 1 - y / CENTER));
const updateStatus = (message, error = false) => {
    status.textContent = message;
    status.className = error ? 'status error' : 'status';
};
const clonePoints = (source) => source.map(({ x, y }) => ({ x, y }));
const currentCount = () => {
    const count = Number.parseInt(pointCountSelect.value, 10);
    return POINT_OPTIONS.includes(count) ? count : DEFAULT_POINTS;
};
const commitPoints = () => { authoredPoints = clonePoints(points); };

function initPoints() {
    const count = currentCount();
    const spacing = WIDTH / (count - 1);
    points = Array.from({ length: count }, (_, index) => {
        const x = index === count - 1 ? WIDTH : index * spacing;
        return { x, y: CENTER };
    });
}

function amplitudeFromPoints(source, targetX) {
    if (!source.length) return 0;
    targetX = Math.max(0, Math.min(WIDTH, targetX));
    for (let i = 0; i < source.length - 1; i++) {
        if (source[i].x <= targetX && source[i + 1].x >= targetX) {
            const span = source[i + 1].x - source[i].x;
            const ratio = span ? (targetX - source[i].x) / span : 0;
            return normalizeY(source[i].y + ratio * (source[i + 1].y - source[i].y));
        }
    }
    return normalizeY(targetX <= source[0].x ? source[0].y : source[source.length - 1].y);
}

function getAmplitudeAtX(normalizedX) {
    return amplitudeFromPoints(points, normalizedX * WIDTH);
}

function draw() {
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.strokeStyle = 'rgba(0, 180, 219, 0.1)';
    ctx.lineWidth = 1;
    for (let x = 0; x < WIDTH; x += 20) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); ctx.stroke();
    }
    for (let y = 0; y < HEIGHT; y += 20) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke();
    }
    ctx.strokeStyle = '#00b4db';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, CENTER); ctx.lineTo(WIDTH, CENTER); ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 68, 68, 0.3)';
    for (const y of [DEAD_ZONE, HEIGHT - DEAD_ZONE]) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke();
    }
    if (points.length < 2) return;
    ctx.strokeStyle = '#00aa00';
    ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
    ctx.stroke();
    const radius = Math.min(6, Math.max(1.5, WIDTH / (points.length - 1) * 0.35));
    points.forEach((point, index) => {
        ctx.fillStyle = activePoint === index ? '#ffff00' : '#00ff00';
        ctx.beginPath(); ctx.arc(point.x, point.y, activePoint === index ? Math.max(radius, 4) : radius, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.stroke();
    });
}

function closestPoint(x) {
    let closest = 0;
    for (let i = 1; i < points.length; i++) {
        if (Math.abs(points[i].x - x) < Math.abs(points[closest].x - x)) closest = i;
    }
    return closest;
}

function position(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function beginEdit(event) {
    const point = position(event);
    activePoint = closestPoint(point.x);
    points[activePoint].y = clampY(point.y);
    dragging = true;
    draw();
}

function continueEdit(event) {
    if (!dragging) return;
    const point = position(event);
    activePoint = closestPoint(point.x);
    points[activePoint].y = clampY(point.y);
    draw();
}

function endEdit() {
    if (!dragging) return;
    dragging = false;
    activePoint = null;
    commitPoints();
    draw();
}

function resample(count, source) {
    const spacing = WIDTH / (count - 1);
    points = Array.from({ length: count }, (_, index) => {
        const x = index === count - 1 ? WIDTH : index * spacing;
        return { x, y: clampY((1 - amplitudeFromPoints(source, x)) * CENTER) };
    });
}

function changePointCount() {
    const count = currentCount();
    pointCountValue.textContent = `${count} points`;
    if (count !== points.length) {
        resample(count, authoredPoints.length >= 2 ? authoredPoints : points);
        commitPoints();
        draw();
    }
    if (audio.isPlaying) audio.play();
    updateStatus(`Waveform uses ${count} points.`);
}

function applyPreset(name) {
    stopPlayback();
    const amplitude = CENTER - DEAD_ZONE;
    points.forEach((point) => {
        const x = point.x / WIDTH;
        const value = name === 'sine' ? Math.sin(2 * Math.PI * x)
            : name === 'triangle' ? (x < 0.5 ? 4 * x - 1 : 3 - 4 * x)
            : name === 'sawtooth' ? 2 * x - 1
            : x < 0.5 ? 1 : -1;
        point.y = clampY(CENTER - amplitude * value);
    });
    commitPoints(); draw(); updateStatus(`Applied ${name} wave preset. Click and drag to modify.`);
}

function resetWaveform() {
    stopPlayback(); initPoints(); commitPoints(); draw();
    updateStatus('Waveform reset. Click anywhere to adjust points.');
}

function togglePlayPause() {
    if (audio.isPlaying) audio.pause(); else audio.play();
    playPauseBtn.textContent = audio.isPlaying ? 'Pause' : 'Play';
}

function stopPlayback() {
    audio.stop();
    playPauseBtn.textContent = 'Play';
}

function setup() {
    canvas.addEventListener('mousedown', beginEdit);
    canvas.addEventListener('mousemove', continueEdit);
    canvas.addEventListener('mouseup', endEdit);
    canvas.addEventListener('mouseleave', endEdit);
    canvas.addEventListener('touchstart', (event) => { event.preventDefault(); beginEdit(event.touches[0]); });
    canvas.addEventListener('touchmove', (event) => { event.preventDefault(); continueEdit(event.touches[0]); });
    canvas.addEventListener('touchend', endEdit);
    playPauseBtn.addEventListener('click', togglePlayPause);
    clearBtn.addEventListener('click', resetWaveform);
    pointCountSelect.addEventListener('change', changePointCount);
    frequencySlider.addEventListener('input', () => {
        frequencyValue.textContent = `${frequencySlider.value}Hz`;
        if (audio.isPlaying) audio.play();
    });
    document.querySelectorAll('.preset-btn').forEach((button) => button.addEventListener('click', () => applyPreset(button.dataset.preset)));
}

function init() {
    pointCountSelect.value = String(DEFAULT_POINTS);
    initPoints();
    audio = createAudioController({ getAmplitudeAtX, getFrequency: () => Number.parseFloat(frequencySlider.value), onStatus: updateStatus });
    applyPreset('sine');
    pointCountValue.textContent = `${DEFAULT_POINTS} points`;
    setup(); draw();
}

window.addEventListener('load', init);
window.addEventListener('resize', draw);
