import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config.js';

// Pure painter: draws grid, axes, dead-zone guides, waveform polyline and
// control points onto a 2D context. Knows nothing about events, state or
// input — callers pass everything it needs. Keeping rendering isolated lets
// future modules (exporters, analysers) reuse the same look.

const COLORS = Object.freeze({
    background: '#0a0a0a',
    grid: 'rgba(0, 180, 219, 0.1)',
    axis: '#00b4db',
    deadZone: 'rgba(255, 68, 68, 0.3)',
    line: '#00aa00',
    point: '#00ff00',
    activePoint: '#ffff00',
    pointOutline: '#000',
});

const GRID_STEP = 20;

export function createCanvasRenderer(canvas, model) {
    const ctx = canvas.getContext('2d');

    function drawGrid() {
        ctx.strokeStyle = COLORS.grid;
        ctx.lineWidth = 1;
        for (let x = 0; x < CANVAS_WIDTH; x += GRID_STEP) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke();
        }
        for (let y = 0; y < CANVAS_HEIGHT; y += GRID_STEP) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke();
        }
    }

    function drawAxes() {
        const center = model.getCenter();
        ctx.strokeStyle = COLORS.axis;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, center); ctx.lineTo(CANVAS_WIDTH, center); ctx.stroke();

        ctx.strokeStyle = COLORS.deadZone;
        const deadZone = model.getDeadZone();
        for (const y of [deadZone, CANVAS_HEIGHT - deadZone]) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke();
        }
    }

    function drawWaveform(points) {
        ctx.strokeStyle = COLORS.line;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
        ctx.stroke();
    }

    function drawPoints(points, activeIndex) {
        const radius = Math.min(6, Math.max(1.5, CANVAS_WIDTH / (points.length - 1) * 0.35));
        points.forEach((point, index) => {
            const isActive = activeIndex === index;
            ctx.fillStyle = isActive ? COLORS.activePoint : COLORS.point;
            ctx.beginPath();
            ctx.arc(point.x, point.y, isActive ? Math.max(radius, 4) : radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = COLORS.pointOutline;
            ctx.stroke();
        });
    }

    return {
        // activeIndex is UI state owned by the pointer controller, not the model.
        render(activeIndex = null) {
            ctx.fillStyle = COLORS.background;
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            drawGrid();
            drawAxes();
            const points = model.getPoints();
            if (points.length < 2) return;
            drawWaveform(points);
            drawPoints(points, activeIndex);
        },
    };
}
