const NS = 'http://www.w3.org/2000/svg';

function node(tag, attributes = {}, text) {
  const result = document.createElementNS(NS, tag);
  for (const [name, value] of Object.entries(attributes)) result.setAttribute(name, String(value));
  if (text !== undefined) result.textContent = text;
  return result;
}

function canvas(label) {
  return node('svg', {viewBox: '0 0 480 320', role: 'img', 'aria-label': label, class: 'chart-explainer'});
}

function text(svg, x, y, value, attributes = {}) {
  svg.append(node('text', {x, y, fill: '#30332f', 'font-size': 19, ...attributes}, value));
}

function line(svg, x1, y1, x2, y2, attributes = {}) {
  svg.append(node('line', {x1, y1, x2, y2, stroke: '#aeb5aa', 'stroke-width': 1.5, ...attributes}));
}

export function createChartInterpretation(entity) {
  const chart = entity.chart_structure;
  const categories = chart.categories;
  const series = chart.series[0];
  const svg = canvas('The Agent identifies one chart and links each category to its value.');
  text(svg, 24, 32, 'OBJECT', {'font-size': 14, fill: '#73796e', 'letter-spacing': 1.5});
  text(svg, 188, 32, 'CATEGORY', {'font-size': 14, fill: '#73796e', 'letter-spacing': 1.5});
  text(svg, 450, 32, 'VALUE', {'font-size': 14, fill: '#73796e', 'letter-spacing': 1.5, 'text-anchor': 'end'});
  svg.append(node('rect', {x: 18, y: 132, width: 106, height: 60, rx: 8, fill: '#e8ede3', stroke: '#acb7a1'}));
  text(svg, 71, 169, 'Chart', {'text-anchor': 'middle', 'font-size': 23, 'font-weight': 550});
  line(svg, 124, 162, 150, 162);
  const step = 240 / categories.length;
  const centers = categories.map((_, i) => 48 + step * (i + .5));
  line(svg, 150, centers[0], 150, centers.at(-1));
  categories.forEach((category, index) => {
    const cy = centers[index];
    line(svg, 150, cy, 177, cy);
    svg.append(node('rect', {x: 178, y: cy - 33, width: 288, height: 66, rx: 6, fill: '#fff', stroke: '#dce1d7'}));
    const words = category.split('\n');
    words.forEach((part, row) => text(svg, 190, cy + (row - (words.length - 1) / 2) * 21 + 6, part, {'font-size': 18}));
    text(svg, 450, cy + 7, Number(series.values[index]).toLocaleString('en-US'), {'text-anchor': 'end', 'font-size': 22, 'font-weight': 550});
  });
  text(svg, 24, 310, `${chart.type === 'column' ? 'Column chart' : chart.type} · ${series.name}`, {'font-size': 14, fill: '#73796e'});
  return svg;
}

export function createChartMeasurement(entity, source, imageURL) {
  const [x, y, width, height] = entity.measurement.visible_bbox.px;
  const svg = canvas(`OpenCV visible bounds. x ${x}, y ${y}, width ${width}, height ${height} pixels.`);
  const left = 65, top = 89, drawWidth = 354, drawHeight = drawWidth * height / width;
  const right = left + drawWidth, bottom = top + drawHeight;
  text(svg, 25, 29, `x ${x}   y ${y}`, {'font-family': 'monospace', 'font-size': 19});
  text(svg, 453, 29, 'px', {'text-anchor': 'end', 'font-size': 16, fill: '#73796e'});
  const crop = node('svg', {x: left, y: top, width: drawWidth, height: drawHeight, viewBox: `${x} ${y} ${width} ${height}`, overflow: 'hidden'});
  crop.style.width = `${drawWidth}px`;
  crop.style.height = `${drawHeight}px`;
  crop.append(node('image', {href: imageURL, x: 0, y: 0, width: source.width_px, height: source.height_px}));
  svg.append(crop);
  for (let pixel = Math.ceil(x / 100) * 100; pixel < x + width; pixel += 100) {
    const px = left + (pixel - x) / width * drawWidth;
    line(svg, px, top - 6, px, top, {stroke: '#bca58f'});
    line(svg, px, top, px, bottom, {stroke: '#957a5d', opacity: .12});
  }
  line(svg, left, 59, right, 59, {stroke: '#997246'});
  for (const edge of [left, right]) line(svg, edge, 52, edge, top - 9, {stroke: '#997246'});
  text(svg, (left + right) / 2, 52, `${width} px`, {'text-anchor': 'middle', 'font-family': 'monospace', 'font-size': 19, fill: '#83603c'});
  line(svg, 43, top, 43, bottom, {stroke: '#997246'});
  for (const edge of [top, bottom]) line(svg, 36, edge, left - 9, edge, {stroke: '#997246'});
  text(svg, 30, (top + bottom) / 2, `${height} px`, {transform: `rotate(-90 30 ${(top + bottom) / 2})`, 'text-anchor': 'middle', 'font-family': 'monospace', 'font-size': 19, fill: '#83603c'});
  svg.append(node('rect', {x: left, y: top, width: drawWidth, height: drawHeight, fill: 'none', stroke: '#997246', 'stroke-width': 1.5}));
  for (const cx of [left, right]) for (const cy of [top, bottom]) {
    svg.append(node('rect', {x: cx - 3, y: cy - 3, width: 6, height: 6, fill: '#fff', stroke: '#997246'}));
  }
  text(svg, right, bottom + 25, `(${x + width}, ${y + height})`, {'text-anchor': 'end', 'font-family': 'monospace', 'font-size': 17, fill: '#83603c'});
  text(svg, 24, 310, `Source image · ${source.width_px} × ${source.height_px} px`, {'font-size': 15, fill: '#73796e'});
  return svg;
}
