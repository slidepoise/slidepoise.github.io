// Link each recorded Agent choice to the original asset and its actual PowerPoint placement.
const root = document.getElementById('asset-decisions');
if (root) {
  const byId = id => document.getElementById(id);
  const base = new URL('../../examples/consulting-ai-transformation/', import.meta.url);
  const tabs = [...root.querySelectorAll('[data-asset-case]')];
  const inspector = byId('asset-icon-inspector');
  const highlights = byId('asset-result-highlights');
  const dock = byId('asset-library-grid');
  const hoverPointer = matchMedia('(hover: hover) and (pointer: fine)');
  let examples, selected = 0, previewTrigger;

  function currentIcons(file) {
    return examples?.[selected].icons.filter(icon => icon.file === file) || [];
  }
  function focusAsset(file, reveal = false) {
    const icons = currentIcons(file);
    library.forEach(tile => tile.classList.toggle('is-focused', tile.dataset.file === file));
    [...highlights.children].forEach(mark => mark.classList.toggle('is-focused', icons.some(icon => icon.entity === mark.dataset.entity)));
    highlights.classList.toggle('has-focus', icons.length > 0);
    if (reveal) {
      const tile = library.find(item => item.dataset.file === file);
      if (tile) {
        const item = tile.getBoundingClientRect(), region = dock.getBoundingClientRect();
        if (item.left < region.left || item.right > region.right) dock.scrollLeft += item.left - region.left - (region.width - item.width) / 2;
      }
    }
  }
  function closePreview() {
    if (inspector.matches(':popover-open')) inspector.hidePopover();
  }
  function positionPreview() {
    if (!previewTrigger || !inspector.matches(':popover-open')) return;
    const rect = previewTrigger.getBoundingClientRect(), box = inspector.getBoundingClientRect();
    const top = rect.bottom + box.height + 10 <= innerHeight - 12 ? rect.bottom + 10 : rect.top - box.height - 10;
    inspector.style.left = `${Math.max(12, Math.min(innerWidth - box.width - 12, rect.left + rect.width / 2 - box.width / 2))}px`;
    inspector.style.top = `${Math.max(12, Math.min(innerHeight - box.height - 12, top))}px`;
  }
  function inspectAsset(file, trigger) {
    closePreview(); previewTrigger = trigger; focusAsset(file, true);
    const tile = library.find(item => item.dataset.file === file);
    byId('asset-inspector-image').src = tile.querySelector('img').src;
    byId('asset-inspector-name').textContent = tile.dataset.label;
    const matches = currentIcons(file), usage = byId('asset-inspector-use');
    usage.textContent = matches.length === 1 ? matches[0].reason : matches.length ? examples[selected].decision : '';
    usage.hidden = !matches.length;
    inspector.showPopover(); positionPreview();
    byId('asset-inspector-close').focus({preventScroll: true});
  }
  function connect(element, file, reveal = false) {
    element.addEventListener('pointerenter', () => { if (hoverPointer.matches && !inspector.matches(':popover-open')) focusAsset(file, reveal); });
    element.addEventListener('pointerleave', () => { if (!inspector.matches(':popover-open')) focusAsset(null); });
    element.addEventListener('focus', () => focusAsset(file, reveal));
    element.addEventListener('blur', () => { if (!inspector.matches(':popover-open')) focusAsset(null); });
    element.addEventListener('click', () => inspectAsset(file, element));
  }
  const library = [
    ['file-search', 'File search'], ['team', 'Team'], ['database-2', 'Database'],
    ['route', 'Route'], ['user-star', 'Expert'], ['focus-2', 'Focus'],
    ['draft', 'Draft'], ['money-dollar-circle', 'Value'], ['shield-check', 'Review'],
    ['play-circle', 'Play'], ['send-plane-2', 'Send'], ['flag', 'Flag'],
  ].map(([name, label]) => {
    const tile = document.createElement('span');
    tile.className = 'asset-library-item'; tile.dataset.file = `${name}-line.svg`; tile.dataset.label = label;
    tile.setAttribute('role', 'listitem');
    const button = document.createElement('button'); button.type = 'button';
    button.setAttribute('aria-label', `Inspect ${label.toLowerCase()} icon`); button.title = label;
    button.setAttribute('aria-haspopup', 'dialog');
    const icon = new Image(); icon.src = new URL(`./assets/remix/${name}-line.svg`, import.meta.url).href; icon.alt = '';
    button.append(icon); tile.append(button); dock.append(tile);
    connect(button, tile.dataset.file);
    return tile;
  });
  byId('asset-inspector-close').addEventListener('click', () => { closePreview(); previewTrigger?.focus({preventScroll: true}); });
  inspector.addEventListener('toggle', () => { if (!inspector.matches(':popover-open')) focusAsset(null); });
  addEventListener('scroll', event => { if (!inspector.contains(event.target)) positionPreview(); }, {capture: true, passive: true});
  addEventListener('resize', closePreview);
  async function read(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error('The recorded asset selections could not be loaded.');
    return response.json();
  }
  function showCase(index) {
    closePreview(); selected = index;
    tabs.forEach((tab, i) => { tab.setAttribute('aria-selected', String(i === index)); tab.tabIndex = i === index ? 0 : -1; });
    byId('asset-case-panel').setAttribute('aria-labelledby', tabs[index].id);
    if (!examples) return;
    const example = examples[index], files = new Set(example.icons.map(icon => icon.file));
    byId('asset-brief').textContent = example.brief;
    library.forEach(tile => {
      tile.classList.toggle('is-selected', files.has(tile.dataset.file)); tile.classList.remove('is-focused');
      tile.querySelector('button').setAttribute('aria-description', files.has(tile.dataset.file) ? 'Selected by the Agent for this slide.' : 'Available in the library.');
    });
    byId('asset-library-count').textContent = `${files.size} used`;
    byId('asset-library-count').setAttribute('aria-label', `${files.size} library assets selected by the Agent`);
    byId('asset-result-image').src = new URL(`assets/${example.id}-render.png`, base).href;
    byId('asset-result-image').alt = `${example.label}, rendered from the sample PowerPoint`;
    const link = byId('asset-result-link');
    link.href = `?deck=consulting-ai-transformation&slide=${example.id}&view=rebuilt#studio-frame`;
    link.dataset.sampleSlide = example.id; link.setAttribute('aria-label', `Open slide. ${example.brief}`);
    highlights.replaceChildren(); highlights.classList.remove('has-focus');
    example.icons.forEach(icon => {
      const record = example.objects.find(object => object.name === icon.entity);
      if (!record) throw new Error('A selected asset is missing from the sample PowerPoint.');
      const xs = record.polygon.map(point => point[0]), ys = record.polygon.map(point => point[1]);
      const mark = document.createElement('button'); mark.type = 'button'; mark.dataset.entity = icon.entity;
      mark.setAttribute('aria-label', `Inspect the asset for ${icon.label}`); mark.setAttribute('aria-haspopup', 'dialog');
      Object.assign(mark.style, {left: `${Math.min(...xs) * 100}%`, top: `${Math.min(...ys) * 100}%`, width: `${(Math.max(...xs) - Math.min(...xs)) * 100}%`, height: `${(Math.max(...ys) - Math.min(...ys)) * 100}%`});
      connect(mark, icon.file, true); highlights.append(mark);
    });
    byId('asset-case-panel').setAttribute('aria-busy', 'false');
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => showCase(index));
    tab.addEventListener('keydown', event => {
      const offset = {ArrowRight: 1, ArrowLeft: -1}[event.key];
      if (!offset && !['Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + offset + tabs.length) % tabs.length;
      showCase(next); tabs[next].focus();
    });
  });
  read(new URL('./assets/asset-selection-examples.json', import.meta.url)).then(async records => {
    examples = await Promise.all(records.map(async example => ({...example, objects: (await read(new URL(`assets/${example.id}-objects.json`, base))).objects})));
    showCase(selected);
  }).catch(() => {
    byId('asset-case-panel').setAttribute('aria-busy', 'false');
    byId('asset-case-decision').textContent = 'The selected icons could not be loaded. You can still open the sample slide.';
  });
}
