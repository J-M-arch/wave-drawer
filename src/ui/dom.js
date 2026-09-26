// Resolves DOM element references by id/class exactly once, up front.
// Every other module receives elements through this registry instead of
// calling document.getElementById itself — one place to fix when markup
// changes, and future modules just add their ids here.

export function createDomRegistry(root = document) {
    const ids = [
        'waveCanvas',
        'playPauseBtn',
        'clearBtn',
        'pointCount',
        'pointCountValue',
        'frequency',
        'frequencyValue',
        'status',
    ];

    const registry = {};
    for (const id of ids) {
        const element = root.getElementById(id);
        if (!element) {
            throw new Error(`Missing required DOM element #${id}. ` +
                'Keep index.html and src/ui/dom.js in sync.');
        }
        registry[id] = element;
    }

    // Collections are returned as arrays via a getter so callers never
    // hold stale NodeLists.
    Object.defineProperty(registry, 'presetButtons', {
        get: () => [...root.querySelectorAll('.preset-btn')],
    });

    return registry;
}
