/* Demo-only transport. The production Console is copied unchanged apart from its API function. */
(() => {
  const data = structuredClone(window.consoleFixtures);
  delete window.consoleFixtures;
  let revision = 1;
  let generation = {mode: 'auto', tool: '', model: '', instructions: ''};
  const originals = structuredClone(data.designs);
  const clone = value => structuredClone(value);
  function design(id) {
    const result = data.designs[id];
    if (!result) throw new Error('Choose a sample profile.');
    return { ...clone(result), active_profile: data.overview.active_profile, profiles: clone(data.overview.profiles),
      revision: String(revision), profile_revision: String(revision), style_agency: clone(data.profiles[id].profile.style_agency), library_sets: clone(data.libraries.sets) };
  }
  window.consoleDemoAPI = async (path, body) => {
    const url = new URL(path, 'https://demo.invalid');
    const id = body?.profile || body?.profile_id || url.searchParams.get('profile') || data.overview.active_profile;
    if (body !== undefined) {
      if (url.pathname === '/api/generation') {
        if (body.revision !== String(revision)) throw new Error('This demo changed. Reopen the setting and try again.');
        const next = {...generation, ...body.values};
        if (!['auto', 'tool', 'manual'].includes(next.mode) || (next.mode === 'tool' && !next.tool.trim())) throw new Error('Name the image tool you want the Agent to use.');
        generation = next;
        revision++;
        return {values: clone(generation), revision: String(revision)};
      }
      if (url.pathname === '/api/profile') data.overview.active_profile = body.profile_id;
      else if (url.pathname === '/api/profile/style') {
        if (body.revision !== String(revision)) throw new Error('This demo changed. Reopen the setting and try again.');
        Object.assign(data.designs[id].values, body.values);
        const fields = body.profile_values || {};
        if (fields.style_agency) Object.assign(data.profiles[id].profile.style_agency, fields.style_agency);
        if (fields.library_sets) { data.profiles[id].profile.library_sets = clone(fields.library_sets); data.designs[id].selected_sets = clone(fields.library_sets); }
      } else if (url.pathname === '/api/design' && body.reset) data.designs[id] = clone(originals[id]);
      else if (url.pathname === '/api/profile/update') Object.assign(data.profiles[id].profile, body.values);
      else if (url.pathname === '/api/profile/create') {
        const key = 'demo-' + revision;
        const source = body.based_on || data.overview.active_profile;
        data.profiles[key] = clone(data.profiles[source]);
        data.profiles[key].id = key;
        Object.assign(data.profiles[key].profile, {profile_id: key, name: body.name, purpose: body.purpose});
        data.designs[key] = clone(data.designs[source]);
        data.designs[key].values.profile = key;
        originals[key] = clone(data.designs[key]);
        data.references[key] = clone(data.references[source]);
        data.overview.profiles.push({...clone(data.overview.profiles.find(item => item.id === source)), id: key, name: body.name, purpose: body.purpose});
        data.overview.active_profile = key;
        revision++;
        return {profile: {...clone(data.profiles[key]), name: body.name}};
      } else if (url.pathname === '/api/profile/reference/update') {
        const item = data.references[id].items.find(item => item.id === body.id);
        Object.assign(item, body.values);
      } else if (url.pathname === '/api/library-set/update') {
        Object.assign(data.sets[body.set_id], body.values);
        Object.assign(data.libraries.sets.find(item => item.id === body.set_id), body.values);
      } else if (url.pathname === '/api/profile/reference/add' || url.pathname === '/api/library-set/add') {
        if (!/\.(png|jpe?g|webp)$/i.test(body.filename)) throw new Error('This demo accepts PNG, JPEG and WebP images.');
        const mime = /\.png$/i.test(body.filename) ? 'image/png' : /\.webp$/i.test(body.filename) ? 'image/webp' : 'image/jpeg';
        const origin = body.source_type || 'unknown';
        const item = {id: 'upload-' + revision, name: body.name || body.filename, description: body.description || '',
          tags: body.tags || [], provenance: {source_type: origin,
            source_url: body.source_url || (origin === 'user_private_document' ? body.filename : ''),
            source_page: body.source_page || (origin === 'user_private_document' ? 'Uploaded image' : ''),
            generated_reference: origin === 'generated_image' ? true : ['published_document', 'user_private_document'].includes(origin) ? false : null,
            license: body.license || ''}, asset_url: `data:${mime};base64,${body.content_base64}`};
        const library = body.set_id ? data.sets[body.set_id] : data.references[id];
        library.items.push(item); library.count = library.items.length;
      } else if (url.pathname === '/api/library-set/create') {
        const item = {id: 'demo-set-' + revision, name: body.name, kind: body.kind || 'icons', description: body.description || '', source: 'local', items: [], count: 0};
        data.libraries.sets.push(item);data.sets[item.id] = item;
      } else throw new Error('This action is available in the installed Console.');
      revision++;
      return url.pathname === '/api/profile/style' ? design(id) : {profile: clone(data.profiles[id]), overview: clone(data.overview)};
    }
    if (url.pathname === '/api/generation') return {values: clone(generation), revision: String(revision)};
    if (url.pathname === '/api/overview') return clone(data.overview);
    if (url.pathname === '/api/console/revision') return {revision: String(revision)};
    if (url.pathname === '/api/design') return design(id);
    if (url.pathname === '/api/profile') return {...clone(data.profiles[id]), revision: String(revision)};
    if (url.pathname === '/api/library') return {...clone(data.references[id]), revision: String(revision)};
    if (url.pathname === '/api/reference-search') {
      const query = (url.searchParams.get('query') || '').toLowerCase();
      if (!query.trim() || query.length > 1200) throw new Error('Describe what your slide needs to explain.');
      const mode = url.searchParams.get('authenticity') || 'authentic';
      if (!['authentic', 'exclude-generated', 'any'].includes(mode)) throw new Error('Choose an available source filter.');
      const terms = [...new Set(query.match(/[\p{L}\p{N}]+/gu) || [])];
      const items = data.references[id].items.flatMap(item => {
        const source = item.provenance || {};
        const type = item.source_type || source.source_type || '';
        const generated = [item.generated_reference, item.generated_source, source.generated_reference, source.generated_source].some(value => value === true || value === 'true') || ['generated', 'ai_generated', 'generated_image', 'synthetic'].includes(type);
        const original = [item.generated_reference, source.generated_reference].some(value => value === false || value === 'false') && (item.source || item.source_url || source.source_url) && (item.source_page || source.source_page);
        const authenticity = generated ? 'generated' : original ? 'recorded_authentic' : 'unknown';
        if (item.retrieval_eligible === false || (mode === 'authentic' && authenticity !== 'recorded_authentic') || (mode === 'exclude-generated' && generated)) return [];
        const metadata = [item.name, item.description, item.tags, item.roles, item.layout, item.relationships, item.communication_job].flat(Infinity).filter(Boolean).join(' ').toLowerCase();
        const matched_terms = terms.filter(term => metadata.includes(term));
        return matched_terms.length ? [{...clone(item), matched_terms, authenticity}] : [];
      }).sort((a, b) => b.matched_terms.length - a.matched_terms.length || a.id.localeCompare(b.id));
      return {items: items.slice(0, 24), matching_candidate_count: items.length, selection_owner: 'host_agent', profile_id: id};
    }
    if (url.pathname === '/api/library-sets') return clone(data.libraries);
    if (url.pathname === '/api/library-set') return {...clone(data.sets[url.searchParams.get('set_id')]), revision: String(revision)};
    if (url.pathname === '/api/health') return clone(data.health);
    if (url.pathname === '/api/settings') return clone(data.settings);
    if (url.pathname === '/api/component') {
      const set = data.sets[url.searchParams.get('set_id')];
      const component = set.items.find(item => item.id === url.searchParams.get('id'));
      return {component, set_id: set.id, native: false, note: 'This sample component describes a reusable slide structure.', catalog_revision: String(revision)};
    }
    throw new Error('This view is available in the installed Console.');
  };
})();
