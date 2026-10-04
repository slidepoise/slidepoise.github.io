// Keep the last frame after playback. Reveal controls on deliberate interaction.
export function watchVideoControls(video, setVisible = visible => { video.controls = visible; }) {
  let hovered = false;
  let keyboard = false;
  let touched = false;
  const sync = () => setVisible(!video.ended || hovered || keyboard || touched);
  const enter = event => { hovered = event.pointerType !== 'touch'; sync(); };
  const leave = () => { hovered = false; sync(); };
  const pointer = event => {
    keyboard = false;
    touched = event.pointerType === 'touch' || event.pointerType === 'pen';
    sync();
  };
  const key = () => { keyboard = true; sync(); };
  const focus = () => { keyboard = video.matches(':focus-visible'); sync(); };
  const blur = () => { keyboard = false; touched = false; sync(); };
  const ended = () => { keyboard = false; touched = false; sync(); };
  const outside = event => { if (event.target !== video) blur(); };
  const listeners = [
    [video, 'pointerenter', enter], [video, 'pointerleave', leave],
    [video, 'pointerdown', pointer], [video, 'keydown', key],
    [video, 'focus', focus], [video, 'blur', blur],
    [video, 'ended', ended], [video, 'play', sync], [video, 'seeked', sync],
    [video.ownerDocument, 'pointerdown', outside],
  ];
  for (const [target, event, handler] of listeners) target.addEventListener(event, handler);
  return () => {
    for (const [target, event, handler] of listeners) target.removeEventListener(event, handler);
  };
}
