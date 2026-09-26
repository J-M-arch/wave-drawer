// Central registry of every event name flowing across the bus.
//
// CONVENTION FOR NEW MODULES:
//   1. Add your event name(s) here as `something:changed` style keys.
//   2. Document the payload shape in a comment next to the name.
//   3. Emit from the module that OWNS the state; subscribe in consumers.
//   4. Never mutate another module's state directly — emit instead.

export const EVENTS = Object.freeze({
    // --- Waveform model (emitted by core/waveformModel.js) ---
    WAVEFORM_CHANGED: 'waveform:changed',       // payload: undefined (read via model.getPoints())
    WAVEFORM_RESET: 'waveform:reset',           // payload: undefined
    PRESET_APPLIED: 'waveform:preset-applied',  // payload: { name: string }
    EDIT_COMMITTED: 'waveform:edit-committed',  // payload: undefined (a drag gesture finished)

    // --- Transport controls (emitted by modules/transportModule.js) ---
    PLAYBACK_TOGGLED: 'playback:toggled',       // payload: { isPlaying: boolean }

    // --- Resolution selector (emitted by modules/resolutionModule.js) ---
    POINT_COUNT_CHANGED: 'resolution:changed',  // payload: { count: number }

    // --- Frequency slider (emitted by modules/frequencyModule.js) ---
    FREQUENCY_CHANGED: 'frequency:changed',     // payload: { frequencyHz: number }

    // --- Status bar (emitted by modules/statusModule.js) ---
    STATUS_UPDATED: 'status:updated',           // payload: { message: string, error: boolean }
});
