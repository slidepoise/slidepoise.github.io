// Keep the last frame after playback. Reveal controls on deliberate interaction.
export function watchVideoControls(video, setVisible = visible => { video.controls = visible; }) {
  let hovered = false;
  let keyboard = false;
  let touched = false;
  let hideTimer;
  const cancelHide = () => { clearTimeout(hideTimer); hideTimer = undefined; };
  const hide = () => {
    hideTimer = undefined;
    video.dataset.endedControls = 'hidden';
    setVisible(false);
  };
  const sync = () => {
    if (!video.ended || hovered || keyboard || touched) {
      cancelHide();
      if (video.ended) video.dataset.endedControls = 'visible';
      else delete video.dataset.endedControls;
      setVisible(true);
      return;
    }
    if (video.dataset.endedControls === 'hidden' || hideTimer !== undefined) return;
    // Let the native panel finish its fade before removing its controls.
    video.dataset.endedControls = 'fading';
    if (video.ownerDocument.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches) hide();
    else hideTimer = setTimeout(hide, 300);
  };
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
    cancelHide();
    delete video.dataset.endedControls;
    for (const [target, event, handler] of listeners) target.removeEventListener(event, handler);
  };
}
