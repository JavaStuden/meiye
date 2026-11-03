// WeChat unlimited codes deliver custom parameters in options.scene.
function roomIdFromOptions(options = {}) {
  let value = options.id || options.room;
  if (options.scene) {
    let scene;
    try { scene = decodeURIComponent(options.scene); } catch (_) { return null; }
    const match = /^(?:id=|room=)?([1-9]\d*)$/.exec(scene);
    if (!match) return null;
    value = match[1];
  }
  if (value === undefined) return 1;
  if (!/^[1-9]\d*$/.test(String(value))) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}
module.exports = { roomIdFromOptions };
