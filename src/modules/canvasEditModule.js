import { EVENTS } from '../core/eventsRegistry.js';

// Page module: mouse + touch editing on the canvas.
// Owns transient interaction state (which point is active, whether a drag
// is in progress) — that state belongs to input handling, not the model.
// Emits EDIT_COMMITTED when a gesture finishes so the transport module can
// commit + refresh playback.

export function createCanvasEditModule({ bus, dom, model, renderer }) {
    const canvas = dom.waveCanvas;
    const disposers = [];
    let activePoint = null;
    let dragging = false;

    function closestPoint(x) {
        const points = model.getPoints();
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
        model.movePoint(activePoint, point.y);
        dragging = true;
    }

    function continueEdit(event) {
        if (!dragging) return;
        const point = position(event);
        activePoint = closestPoint(point.x);
        model.movePoint(activePoint, point.y);
    }

    function endEdit() {
        if (!dragging) return;
        dragging = false;
        activePoint = null;
        model.commit();
        bus.emit(EVENTS.EDIT_COMMITTED);
    }

    // The renderer redraws on every model change; this module only supplies
    // the active-point highlight, which is pointer state.
    function renderFrame() {
        renderer.render(activePoint);
    }

    return {
        mount() {
            const bind = (type, handler, options) => {
                canvas.addEventListener(type, handler, options);
                disposers.push(() => canvas.removeEventListener(type, handler, options));
            };
            bind('mousedown', beginEdit);
            bind('mousemove', continueEdit);
            bind('mouseup', endEdit);
            bind('mouseleave', endEdit);
            bind('touchstart', (event) => { event.preventDefault(); beginEdit(event.touches[0]); });
            bind('touchmove', (event) => { event.preventDefault(); continueEdit(event.touches[0]); });
            bind('touchend', endEdit);

            disposers.push(bus.on(EVENTS.WAVEFORM_CHANGED, renderFrame));
            disposers.push(bus.on(EVENTS.PLAYBACK_TOGGLED, renderFrame));
            window.addEventListener('resize', renderFrame);
            disposers.push(() => window.removeEventListener('resize', renderFrame));
        },
        unmount() {
            while (disposers.length) disposers.pop()();
        },
        render: renderFrame,
    };
}
