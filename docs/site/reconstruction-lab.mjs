import { reconstructionItems } from './reconstruction-viewer.mjs';

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function originalIconSource(source) {
  return source.kind === 'icon' && /^remix-[a-z0-9-]+$/.test(source.upstream_asset_id || '')
    ? source.upstream_asset_id.slice(6) + '.svg' : null;
}

export function reconstructionObjects(semantic, objects) {
  const native = new Map(objects.objects.map(item => [item.name, item]));
  for (const source of semantic.entities) {
    if (native.has(source.id)) continue;
    const match = objects.objects.find(item => item.name === `SC_CONNECTOR__${source.id}__0` || item.name === `SC_FREEFORM_ROUTE__${source.id}__0`);
    if (match) native.set(source.id, match);
  }
  return native;
}
const interpretations = {
  'annual-capacity-chart': 'The bars, category labels and values form one chart comparing potential annual capacity.',
  'value-model': 'The table keeps each workflow’s baseline, adoption and time saving assumptions in aligned rows.',
  'pilot-sequencing': 'The table compares candidate pilots by control readiness, ownership and sequence.',
  'reason-icon-file': 'A file-search icon represents repeated research tasks and belongs with the adjacent explanation.',
  'reason-icon-corpus': 'A database icon represents the approved source collection and belongs with the adjacent explanation.',
  'reason-icon-reviewer': 'An expert icon represents the named reviewer and belongs with the adjacent explanation.',
};
const roleDescriptions = {
  slide_title: 'The headline states the slide’s main claim.',
  subtitle: 'The subtitle explains the distinction behind the headline.',
  heading_large: 'This heading labels a section of related evidence.',
  body: 'This text is an independent object within the slide’s argument.',
  call_to_action: 'This text states the requested action or decision for the slide.',
  structured_evidence: 'The Agent groups aligned rows and columns into a table that preserves their relationships.',
  large_data_number: 'This number carries a key quantity in the slide’s argument.',
  supporting_visual: 'The library icon represents the adjacent message and remains a separate object.',
  directed_workflow_relationship: 'This connector expresses the direction of a workflow or a feedback path.',
  native_presentation_geometry: 'This shape provides the background or accent for nearby content.',
};
const nativeDescriptions = {
  chart: ['Build an editable chart', 'The categories and values remain editable in the chart’s data sheet.'],
  table: ['Build an editable table', 'Rows, columns and cell text remain editable in PowerPoint.'],
  text: ['Build a text box', 'The wording, typeface and formatting remain editable.'],
  image: ['Place the original SVG', 'The library icon becomes a separate artwork layer.'],
  connector: ['Build a native connector', 'The line and its endpoints remain editable in PowerPoint.'],
  shape: ['Build a native shape', 'Its position, size, fill and outline remain editable.'],
};

export function nativePreviewBox(object, size) {
  const xs = object.polygon.map(point => point[0] * size.width);
  const ys = object.polygon.map(point => point[1] * size.height);
  const padding = size.height * .006;
  const x = Math.min(...xs) - padding, y = Math.min(...ys) - padding;
  return [x, y, Math.max(...xs) - x + padding, Math.max(...ys) - y + padding];
}

function nativePreview(object, slide, source, size) {
  const icon = originalIconSource(source);
  if (icon) {
    const image = new Image();
    image.src = new URL('./assets/remix/' + icon, import.meta.url).href;
    image.alt = 'Original library SVG icon';
    image.className = 'lab-native-icon';
    return image;
  }
  const ns = 'http://www.w3.org/2000/svg';
  const crop = document.createElementNS(ns, 'svg');
  const box = nativePreviewBox(object, size);
  crop.setAttribute('class', 'lab-native-crop');
  crop.setAttribute('viewBox', box.join(' '));
  crop.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  crop.setAttribute('role', 'img');
  crop.setAttribute('aria-label', `${object.label || object.kind} rendered from PowerPoint`);
  const image = document.createElementNS(ns, 'image');
  image.setAttribute('href', slide.render);
  image.setAttribute('width', size.width);
  image.setAttribute('height', size.height);
  image.setAttribute('preserveAspectRatio', 'none');
  const clip = document.createElementNS(ns, 'clipPath');
  clip.id = `native-preview-${slide.id}-${object.id}`;
  const boundary = document.createElementNS(ns, 'rect');
  ['x', 'y', 'width', 'height'].forEach((key, index) => boundary.setAttribute(key, box[index]));
  clip.append(boundary);
  image.setAttribute('clip-path', `url(#${clip.id})`);
  crop.append(clip);
  crop.append(image);
  return crop;
}

export function createReconstructionLab({ root, slide, semantic, measurement, objects }) {
  const data = reconstructionItems(semantic, measurement);
  const native = reconstructionObjects(semantic, objects);
  const authored = new Map(semantic.entities.map(item => [item.id, item]));
  const items = data.entities.filter(item => native.has(item.id) && item.planned?.length === 4).map(item => {
    const connector = authored.get(item.id).connector_intent;
    const from = authored.get(connector?.source_entities?.[0])?.display_label;
    const to = authored.get(connector?.target_entities?.[0])?.display_label;
    return from && to ? { ...item, label: connector.connector_family === 'direct_flow' ? `${from} to ${to}` : item.label, relationship: `The arrow links “${from}” to “${to}”.` } : item;
  });
  const controls = root.querySelector('.lab-object-choices');
  const layer = root.querySelector('.lab-hotspots');
  const image = root.querySelector('.lab-source-image');
  const detail = root.querySelector('.lab-result');
  controls.replaceChildren();
  layer.replaceChildren();
  const measuredRegion = element('div', 'lab-measured-region');
  measuredRegion.setAttribute('aria-hidden', 'true');
  layer.append(measuredRegion);
  image.src = slide.target;
  image.alt = 'Generated slide design with inspectable object regions and OpenCV measurements.';
  image.parentElement.style.aspectRatio = `${data.width} / ${data.height}`;
  root.querySelector('.lab-source-label').textContent = `Inspect ${items.length} objects in the generated design`;
  const buttons = new Map();
  const shortcuts = new Map();

  function place(node, box) {
    const [x, y, width, height] = box;
    Object.assign(node.style, { left: `${100 * x / data.width}%`, top: `${100 * y / data.height}%`, width: `${100 * width / data.width}%`, height: `${100 * height / data.height}%` });
  }
  function select(id) {
    const item = items.find(entry => entry.id === id);
    if (!item) return;
    const object = native.get(id);
    const source = authored.get(id);
    const group = data.groups.find(entry => entry.children.includes(id));
    for (const [key, button] of buttons) {
      button.setAttribute('aria-pressed', String(key === id));
      button.dataset.related = String(Boolean(group?.children.includes(key)));
    }
    for (const [kind, button] of shortcuts) button.setAttribute('aria-pressed', String(kind === source.kind));
    measuredRegion.hidden = !item.measured;
    if (item.measured) place(measuredRegion, item.measured);

    const interpretation = element('section', 'lab-record lab-interpretation');
    interpretation.append(element('p', 'lab-record-label', 'Agent interpretation'), element('h4', '', item.label), element('p', 'lab-record-copy', item.relationship || interpretations[id] || roleDescriptions[source.role] || `The Agent identifies this region as ${source.kind}.`));
    if (group) {
      const relation = element('p', 'lab-group-reason');
      relation.append(element('strong', '', group.label + '. '), document.createTextNode(group.reason));
      interpretation.append(relation);
    }

    const measured = element('section', 'lab-record lab-measurement');
    measured.append(element('p', 'lab-record-label', 'OpenCV measurement'));
    if (item.measured) {
      const geometry = element('dl', 'lab-geometry');
      for (const [label, value] of [['Left', item.measured[0]], ['Top', item.measured[1]], ['Width', item.measured[2]], ['Height', item.measured[3]]]) {
        const field = element('div');
        field.append(element('dt', '', label), element('dd', '', value + ' px'));
        geometry.append(field);
      }
      measured.append(geometry, element('p', 'lab-record-copy', `Visible bounds in the ${data.width} × ${data.height} source image.`));
    } else measured.append(element('p', 'lab-record-copy', 'This object uses the region defined by the Agent.'));

    const built = element('section', 'lab-record lab-build');
    const [title, description] = nativeDescriptions[object.kind] || nativeDescriptions.shape;
    const copy = element('div');
    copy.append(element('p', 'lab-record-label', 'PowerPoint construction'), element('h5', '', title), element('p', 'lab-record-copy', description));
    if (originalIconSource(source)) built.classList.add('lab-build-icon');
    else if (['shape', 'text', 'connector'].includes(object.kind)) built.classList.add('lab-build-wide');
    built.append(copy, nativePreview(object, slide, source, objects.size));
    detail.replaceChildren(interpretation, measured, built);
  }
  items.forEach(item => {
    const button = element('button', 'lab-hotspot');
    button.type = 'button';
    button.dataset.objectId = item.id;
    button.setAttribute('aria-label', `Inspect ${item.kind}. ${item.label}`);
    button.setAttribute('aria-pressed', 'false');
    button.title = `${item.kind.charAt(0).toUpperCase() + item.kind.slice(1)} · ${item.label}`;
    button.style.zIndex = String(Math.max(1, 1000 - Math.round(999 * item.planned[2] * item.planned[3] / (data.width * data.height))));
    place(button, item.planned);
    button.addEventListener('click', () => select(item.id));
    layer.append(button);
    buttons.set(item.id, button);
  });
  for (const [kind, label] of [['chart', 'Chart'], ['table', 'Table'], ['text', 'Text'], ['icon', 'Icon'], ['connector', 'Connector']]) {
    const candidate = items.find(item => item.kind === kind);
    if (!candidate) continue;
    const button = element('button', '', label);
    button.type = 'button';
    button.addEventListener('click', () => select(candidate.id));
    controls.append(button);
    shortcuts.set(kind, button);
  }
  select((items.find(item => item.kind === 'chart') || items.find(item => item.kind === 'table') || items[0]).id);
  return { select };
}

export function createReconstructionSelector({ root, slides, initialSlide, initialRecords, fetchJSON, validateObjects, onSlideChange }) {
  const selector = root.querySelector('.lab-slide-choices');
  const status = root.querySelector('.lab-selection-status');
  const buttons = new Map();
  const cache = new Map([[initialSlide.id, initialRecords]]);
  let request;
  let inspector;
  async function selectSlide(slide) {
    request?.abort();
    const current = new AbortController();
    request = current;
    root.setAttribute('aria-busy', 'true');
    buttons.forEach((button, id) => { button.dataset.loading = String(id === slide.id); });
    status.classList.add('sr-only');
    status.textContent = `Loading slide ${slides.indexOf(slide) + 1}…`;
    try {
      let records = cache.get(slide.id);
      if (!records) {
        const [semantic, measurement, rawObjects] = await Promise.all([
          fetchJSON(slide.semantic, current.signal), fetchJSON(slide.measurement, current.signal), fetchJSON(slide.objects, current.signal),
        ]);
        records = { semantic, measurement, objects: validateObjects(rawObjects) };
      }
      if (current.signal.aborted) return;
      cache.set(slide.id, records);
      inspector = createReconstructionLab({ root, slide, ...records });
      buttons.forEach((button, id) => button.setAttribute('aria-pressed', String(id === slide.id)));
      status.textContent = `Slide ${slides.indexOf(slide) + 1}. ${slide.title}`;
      onSlideChange(slide);
    } catch (error) {
      if (current.signal.aborted) return;
      status.classList.remove('sr-only');
      status.textContent = 'This slide could not be loaded. Select it to try again.';
      console.error('Reconstruction slide unavailable', error);
    } finally {
      if (!current.signal.aborted) {
        root.setAttribute('aria-busy', 'false');
        buttons.forEach(button => { button.dataset.loading = 'false'; });
      }
    }
  }
  slides.forEach((slide, index) => {
    const button = element('button', 'lab-slide-choice');
    button.type = 'button';
    button.dataset.slideId = slide.id;
    button.setAttribute('aria-label', `Inspect slide ${index + 1}. ${slide.title}`);
    button.setAttribute('aria-pressed', 'false');
    button.title = slide.title;
    const image = new Image();
    image.src = slide.thumbnail || slide.render;
    image.alt = '';
    button.append(image, element('span', '', String(index + 1).padStart(2, '0')));
    button.addEventListener('click', () => selectSlide(slide));
    selector.append(button);
    buttons.set(slide.id, button);
  });
  selectSlide(initialSlide);
  return { select: id => inspector?.select(id) };
}
