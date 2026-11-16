/* cad-to-html viewer. Plain JS; expects the global THREE (with OrbitControls + GLTFLoader).
 *
 * How parts move: every part mesh is placed directly under `modelRoot` and its matrix is
 *   M = J_outer * ... * J_inner * Explode * Rest
 * where Rest is the part's world matrix in the file and J are the joint transforms
 * (defined in the assembly frame at rest). Joints come pre-sorted outer-first from build.py.
 *
 * Automation API (used by render.py and the tests): window.c2h
 */
(function () {
  'use strict';
  const DATA = JSON.parse(document.getElementById('model-data').textContent);
  const RENDER_MODE = new URLSearchParams(location.search).has('render');
  const nodes = new Map(DATA.tree.nodes.map(n => [n.id, n]));
  const display = Object.assign({ background: 'light', up: 'z', show_axes: true, edges: true, explode_scale: 1 }, DATA.display || {});
  const $ = id => document.getElementById(id);

  // ---------------------------------------------------------------- state
  const parts = new Map();        // leaf id -> { mesh, rest, center, edges, visible, opacity }
  const jointValues = new Map();  // joint id -> value (deg or mm)
  const selected = new Set();     // selected leaf ids
  let selectedNode = null;        // tree node id last selected
  let explode = 0;
  let measureMode = false, measurePts = [];
  let modelBox = new THREE.Box3(), modelCenter = new THREE.Vector3(), modelSize = 1;
  const flags = { edges: !!display.edges, wireframe: false, axes: !!display.show_axes && !RENDER_MODE, dark: display.background === 'dark' };

  // ---------------------------------------------------------------- three setup
  const container = $('viewport');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  } catch (e) {
    return showMessage('WebGL is not available in this browser, so the 3D view cannot be shown.');
  }
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 1e6);
  if (display.up === 'z') camera.up.set(0, 0, 1);
  scene.add(camera);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8890a0, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.8); key.position.set(1, 1.5, 2); camera.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.6); fill.position.set(-2, -1, 0.5); camera.add(fill);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = !RENDER_MODE;
  controls.dampingFactor = 0.15;
  controls.screenSpacePanning = true;

  const modelRoot = new THREE.Group();
  scene.add(modelRoot);
  const helpers = new THREE.Group();
  scene.add(helpers);
  let axesHelper = null, planeHelper = null;

  const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x20242a, transparent: true, opacity: 0.55 });
  const sectionPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
  const section = { on: false, axis: 'Z', flip: false, t: 0.5 };

  function resize() {
    const w = container.clientWidth || window.innerWidth, h = container.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', () => { resize(); requestRender(); });

  let renderQueued = false;
  function requestRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => { renderQueued = false; renderNow(); });
  }
  function renderNow() {
    renderer.render(scene, camera);
    updateMeasureLabel();
  }
  controls.addEventListener('change', requestRender);
  (function loop() { if (controls.enableDamping) controls.update(); requestAnimationFrame(loop); })();

  // ---------------------------------------------------------------- load GLB
  function base64ToBuffer(b64) {
    const bin = atob(b64.trim());
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }

  const ready = new Promise((resolve, reject) => {
    const loader = new THREE.GLTFLoader();
    loader.parse(base64ToBuffer($('glb-data').textContent), '', gltf => {
      try { setup(gltf); resolve(); } catch (e) { showMessage('Viewer setup failed: ' + e.message); reject(e); }
    }, err => { showMessage('Could not read the embedded model: ' + (err.message || err)); reject(err); });
  });

  function setup(gltf) {
    gltf.scene.updateMatrixWorld(true);
    const found = [];
    gltf.scene.traverse(obj => {
      const id = obj.userData && obj.userData.id;
      if (!id || !nodes.has(id) || nodes.get(id).type !== 'part') return;
      let mesh = obj.isMesh ? obj : null;
      if (!mesh) obj.traverse(o => { if (!mesh && o.isMesh) mesh = o; });
      if (mesh) found.push([id, mesh]);
    });
    for (const [id, mesh] of found) {
      const rest = mesh.matrixWorld.clone();
      mesh.removeFromParent();
      mesh.material = mesh.material.clone();
      mesh.material.side = THREE.DoubleSide;
      mesh.matrixAutoUpdate = false;
      mesh.matrix.copy(rest);
      mesh.userData.id = id;
      modelRoot.add(mesh);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 25), edgeMaterial);
      edges.raycast = () => {};
      mesh.add(edges);
      mesh.geometry.computeBoundingBox();
      const center = mesh.geometry.boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(rest);
      parts.set(id, { id, mesh, rest, center, edges, visible: true, opacity: 1,
                      baseEmissive: mesh.material.emissive.clone() });
    }
    modelRoot.updateMatrixWorld(true);
    modelBox.setFromObject(modelRoot);
    modelBox.getCenter(modelCenter);
    modelSize = modelBox.getSize(new THREE.Vector3()).length() || 1;
    camera.near = modelSize / 1000; camera.far = modelSize * 100;

    for (const j of DATA.joints) jointValues.set(j.id, clampJoint(j, j.default || 0));
    for (const id of (display.hidden_parts || [])) for (const leaf of leavesOf(id)) setVisible(leaf, false, false);

    buildTree();
    buildJoints();
    buildInfo();
    applyFlags();
    resize();
    updatePose();
    setView('iso');
    document.body.classList.toggle('dark', flags.dark);
    applyTheme();
  }

  // ---------------------------------------------------------------- pose (joints + explode)
  const _m = new THREE.Matrix4(), _t = new THREE.Matrix4(), _axis = new THREE.Vector3();

  function jointMatrix(j, value, out) {
    _axis.fromArray(j.axis).normalize();
    if (j.type === 'slider') return out.makeTranslation(_axis.x * value, _axis.y * value, _axis.z * value);
    const p = j.pivot;
    out.makeTranslation(p[0], p[1], p[2]);
    out.multiply(_t.makeRotationAxis(_axis, THREE.MathUtils.degToRad(value)));
    return out.multiply(_t.makeTranslation(-p[0], -p[1], -p[2]));
  }

  function updatePose() {
    const jm = DATA.joints.map(j => jointMatrix(j, jointValues.get(j.id), new THREE.Matrix4()));
    const k = explode * (display.explode_scale ?? 1);
    for (const part of parts.values()) {
      const m = part.mesh.matrix.identity();
      DATA.joints.forEach((j, i) => { if (j.leavesSet.has(part.id)) m.multiply(jm[i]); });
      if (k) {
        const d = part.center.clone().sub(modelCenter).multiplyScalar(k);
        m.multiply(_m.makeTranslation(d.x, d.y, d.z));
      }
      m.multiply(part.rest);
    }
    modelRoot.updateMatrixWorld(true);
    requestRender();
  }
  for (const j of DATA.joints) j.leavesSet = new Set(j.leaves);

  function clampJoint(j, v) {
    v = Number(v);
    if (!isFinite(v)) v = 0;
    return Math.min(Math.max(v, j.min), j.max);   // limits enforced for every joint type
  }

  // ---------------------------------------------------------------- camera
  function viewDirection(name) {
    const z = display.up === 'z';
    const dirs = z
      ? { iso: [1, -1, 0.85], front: [0, -1, 0], top: [0, -1e-4, 1], right: [1, 0, 0] }
      : { iso: [1, 0.85, 1], front: [0, 0, 1], top: [0, 1, 1e-4], right: [1, 0, 0] };
    return new THREE.Vector3().fromArray(dirs[name] || dirs.iso).normalize();
  }

  function visibleBox() {
    const box = new THREE.Box3();
    for (const p of parts.values()) if (p.visible) box.expandByObject(p.mesh);
    return box.isEmpty() ? modelBox.clone() : box;
  }

  function fit(dir) {
    dir = (dir || camera.position.clone().sub(controls.target)).normalize();
    const box = visibleBox();
    const center = box.getCenter(new THREE.Vector3());
    // Camera basis for this direction, then the distance at which all 8 bbox corners fit.
    const right = new THREE.Vector3().crossVectors(camera.up, dir).normalize();
    if (right.lengthSq() < 1e-9) right.set(1, 0, 0);
    const up = new THREE.Vector3().crossVectors(dir, right).normalize();
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2), tanH = tanV * camera.aspect;
    let dist = 0;
    for (let i = 0; i < 8; i++) {
      const p = new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z);
      const v = p.sub(center);
      const along = v.dot(dir);
      dist = Math.max(dist, along + Math.abs(v.dot(right)) / tanH, along + Math.abs(v.dot(up)) / tanV);
    }
    dist = Math.max(dist * 1.08, modelSize * 0.05);
    controls.target.copy(center);
    camera.position.copy(center).addScaledVector(dir, dist);
    camera.near = dist / 200; camera.far = dist * 50;
    camera.updateProjectionMatrix();
    controls.update();
    requestRender();
  }
  function setView(name) {
    fit(viewDirection(name));
    document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === name));
  }

  // ---------------------------------------------------------------- appearance flags
  function applyFlags() {
    for (const p of parts.values()) {
      p.edges.visible = flags.edges;
      p.mesh.material.wireframe = flags.wireframe;
    }
    if (!axesHelper) {
      axesHelper = new THREE.AxesHelper(modelSize * 0.35);
      const origin = new THREE.Vector3();
      // Keep the helper at the model origin unless that is far away from the model.
      if (modelBox.distanceToPoint(origin) > modelSize * 0.5) origin.copy(modelBox.min);
      axesHelper.position.copy(origin);
      helpers.add(axesHelper);
    }
    axesHelper.visible = flags.axes;
    setActive('edges', flags.edges); setActive('wireframe', flags.wireframe);
    setActive('axes', flags.axes); setActive('theme', flags.dark);
    requestRender();
  }
  function applyTheme() {
    document.body.classList.toggle('dark', flags.dark);
    scene.background = new THREE.Color(flags.dark ? 0x1b1e23 : 0xf3f4f6);
    edgeMaterial.color.set(flags.dark ? 0x0b0d10 : 0x20242a);
    setActive('theme', flags.dark);
    requestRender();
  }
  function setActive(action, on) {
    const b = document.querySelector(`[data-action="${action}"]`);
    if (b) b.classList.toggle('active', !!on);
  }

  // ---------------------------------------------------------------- visibility / selection
  function leavesOf(id) {
    const n = nodes.get(id);
    if (!n) return [];
    if (n.type === 'part') return [id];
    return n.children.flatMap(leavesOf);
  }
  function setVisible(id, on, refresh = true) {
    const p = parts.get(id);
    if (!p) return;
    p.visible = on;
    p.mesh.visible = on;
    if (refresh) { syncTreeChecks(); requestRender(); }
  }
  function isolate(id) {
    const keep = new Set(leavesOf(id));
    for (const pid of parts.keys()) setVisible(pid, keep.has(pid), false);
    syncTreeChecks();
    select(id);
    fit();
  }
  function showAll() {
    for (const pid of parts.keys()) setVisible(pid, true, false);
    syncTreeChecks();
    requestRender();
  }

  const HIGHLIGHT = new THREE.Color(0x2f6bff);
  function select(id) {
    for (const pid of selected) {
      const p = parts.get(pid);
      if (p) p.mesh.material.emissive.copy(p.baseEmissive);
    }
    selected.clear();
    selectedNode = id && nodes.has(id) ? id : null;
    if (selectedNode) for (const leaf of leavesOf(selectedNode)) {
      selected.add(leaf);
      const p = parts.get(leaf);
      if (p) p.mesh.material.emissive.copy(HIGHLIGHT).multiplyScalar(0.45);
    }
    document.querySelectorAll('.node').forEach(el => el.classList.toggle('selected', el.dataset.id === selectedNode));
    buildInfo();
    requestRender();
  }

  function setOpacity(ids, value) {
    for (const id of ids) {
      const p = parts.get(id);
      if (!p) continue;
      p.opacity = value;
      p.mesh.material.transparent = value < 1;
      p.mesh.material.opacity = value;
      p.mesh.material.depthWrite = value >= 1;
      p.mesh.material.needsUpdate = true;
    }
    requestRender();
  }

  // ---------------------------------------------------------------- tree panel
  function buildTree() {
    $('title').textContent = DATA.title;
    const s = DATA.summary;
    $('summary').textContent = `${s.part_instances} parts (${s.unique_parts} unique) · ` +
      s.bbox.size.map(v => fmt(v, 1)).join(' × ') + ' mm';
    const root = nodes.get(DATA.tree.root);
    const ul = document.createElement('ul');
    ul.appendChild(treeItem(root, 0));
    $('tree').replaceChildren(ul);
    syncTreeChecks();
  }

  function treeItem(n, depth) {
    const li = document.createElement('li');
    const row = document.createElement('div');
    row.className = 'node';
    row.dataset.id = n.id;
    const caret = document.createElement('span');
    caret.className = 'caret';
    caret.textContent = n.type === 'assembly' ? '▾' : '';
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = true;
    check.title = 'Show / hide';
    check.addEventListener('click', e => {
      e.stopPropagation();
      for (const leaf of leavesOf(n.id)) setVisible(leaf, check.checked, false);
      syncTreeChecks();
      requestRender();
    });
    const sw = document.createElement('span');
    sw.className = 'swatch';
    sw.style.background = n.type === 'part' ? n.color : 'transparent';
    if (n.type !== 'part') sw.style.border = 'none';
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = n.name;
    name.title = n.id;
    const iso = document.createElement('button');
    iso.className = 'iso';
    iso.textContent = '◎';
    iso.title = 'Isolate';
    iso.addEventListener('click', e => { e.stopPropagation(); isolate(n.id); });
    row.append(caret, check, sw, name, iso);
    row.addEventListener('click', () => select(n.id));
    caret.addEventListener('click', e => {
      e.stopPropagation();
      li.classList.toggle('collapsed');
      caret.textContent = li.classList.contains('collapsed') ? '▸' : '▾';
    });
    li.appendChild(row);
    if (n.children && n.children.length) {
      const ul = document.createElement('ul');
      for (const c of n.children) ul.appendChild(treeItem(nodes.get(c), depth + 1));
      li.appendChild(ul);
    }
    return li;
  }

  function syncTreeChecks() {
    document.querySelectorAll('.node').forEach(row => {
      const leaves = leavesOf(row.dataset.id).filter(l => parts.has(l));
      const vis = leaves.filter(l => parts.get(l).visible).length;
      const box = row.querySelector('input');
      box.checked = vis > 0 && vis === leaves.length;
      box.indeterminate = vis > 0 && vis < leaves.length;
    });
  }

  // ---------------------------------------------------------------- info panel
  function fmt(v, d = 2) {
    if (v === null || v === undefined) return '—';
    return Number(v).toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: 0 });
  }
  function buildInfo() {
    const info = $('info');
    const opRow = $('opacity-row');
    if (!selectedNode) {
      info.className = 'muted';
      info.textContent = 'Click a part (or a tree row) to select it.';
      opRow.style.display = 'none';
      return;
    }
    const n = nodes.get(selectedNode);
    const rows = [
      ['Name', n.name],
      ['Id', n.id],
      ['Type', n.type === 'part' ? 'part' : `assembly (${leavesOf(n.id).length} parts)`],
      ['BBox (mm)', n.bbox.size.map(v => fmt(v)).join(' × ')],
      ['Volume', n.volume_mm3 ? fmt(n.volume_mm3, 1) + ' mm³' : '—'],
    ];
    if (n.material) rows.push(['Material', n.material]);
    if (n.mass_g !== null && n.mass_g !== undefined) rows.push(['Mass', fmt(n.mass_g, 2) + ' g']);
    if (n.type === 'part' && n.part_name && n.part_name !== n.name) rows.push(['Part', n.part_name]);
    const table = document.createElement('table');
    table.className = 'kv';
    for (const [k, v] of rows) {
      const tr = table.insertRow();
      tr.insertCell().textContent = k;
      const td = tr.insertCell();
      td.textContent = v;
      td.style.wordBreak = 'break-word';
    }
    info.className = '';
    info.replaceChildren(table);
    opRow.style.display = '';
    const first = parts.get(leavesOf(n.id)[0]);
    $('opacity').value = first ? first.opacity : 1;
  }

  // ---------------------------------------------------------------- joints panel
  function buildJoints() {
    const host = $('joints');
    host.replaceChildren();
    if (!DATA.joints.length) {
      host.innerHTML = '<div class="muted">No joints defined in the manifest.</div>';
      $('joint-actions').style.display = 'none';
      return;
    }
    for (const j of DATA.joints) {
      const unit = j.type === 'slider' ? 'mm' : '°';
      const box = document.createElement('div');
      box.className = 'joint';
      const head = document.createElement('div');
      head.className = 'row';
      const label = document.createElement('span');
      label.className = 'grow';
      label.textContent = j.label || j.id;
      label.title = `${j.type} · ${j.id}` + (j.notes ? '\n' + j.notes : '');
      head.appendChild(label);
      if (j.confidence === 'low') {
        const b = document.createElement('span');
        b.className = 'badge';
        b.textContent = 'review';
        b.title = 'Auto-guessed joint (confidence: low)';
        head.appendChild(b);
      }
      const num = document.createElement('input');
      num.type = 'number';
      num.step = 'any';
      num.dataset.joint = j.id;
      head.append(num, document.createTextNode(unit));
      const range = document.createElement('input');
      range.type = 'range';
      range.min = j.min; range.max = j.max;
      range.step = j.type === 'slider' ? Math.max((j.max - j.min) / 400, 0.001) : 0.5;
      range.dataset.joint = j.id;
      const limits = document.createElement('div');
      limits.className = 'limits';
      limits.innerHTML = `<span>${fmt(j.min)}${unit}</span><span class="muted">${j.type}</span><span>${fmt(j.max)}${unit}</span>`;
      range.addEventListener('input', () => setJoint(j.id, range.value));
      num.addEventListener('change', () => setJoint(j.id, num.value));
      box.append(head, range, limits);
      host.appendChild(box);
    }
    syncJointInputs();
  }
  function syncJointInputs() {
    document.querySelectorAll('[data-joint]').forEach(el => {
      const v = jointValues.get(el.dataset.joint);
      el.value = el.type === 'number' ? Math.round(v * 100) / 100 : v;
    });
  }
  function setJoint(id, value) {
    const j = DATA.joints.find(x => x.id === id);
    if (!j) throw new Error('unknown joint ' + id);
    const v = clampJoint(j, value);
    jointValues.set(id, v);
    syncJointInputs();
    updatePose();
    return v;
  }
  function resetJoints() {
    for (const j of DATA.joints) jointValues.set(j.id, clampJoint(j, j.default || 0));
    syncJointInputs();
    updatePose();
  }

  // ---------------------------------------------------------------- section plane
  function updateSection() {
    const i = 'XYZ'.indexOf(section.axis);
    const n = new THREE.Vector3(); n.setComponent(i, section.flip ? 1 : -1);
    const lo = modelBox.min.getComponent(i), hi = modelBox.max.getComponent(i);
    const pad = (hi - lo) * 0.001 + 1e-6;
    const pos = lo - pad + (hi - lo + 2 * pad) * section.t;
    // three.js keeps points with n·p + c >= 0. n = -axis, c = pos keeps coord <= pos; flipped keeps coord >= pos.
    sectionPlane.normal.copy(n);
    sectionPlane.constant = section.flip ? -pos : pos;
    renderer.localClippingEnabled = section.on;
    const planes = section.on ? [sectionPlane] : [];
    for (const p of parts.values()) { p.mesh.material.clippingPlanes = planes; p.mesh.material.needsUpdate = true; }
    edgeMaterial.clippingPlanes = planes;
    edgeMaterial.needsUpdate = true;
    if (!planeHelper) {
      planeHelper = new THREE.PlaneHelper(sectionPlane, modelSize * 0.6, 0x2f6bff);
      planeHelper.material.transparent = true;
      planeHelper.material.opacity = 0.3;
      helpers.add(planeHelper);
    }
    planeHelper.visible = section.on && !RENDER_MODE;
    requestRender();
  }

  // ---------------------------------------------------------------- picking + measure
  const raycaster = new THREE.Raycaster();
  function pick(clientX, clientY) {
    const r = renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const meshes = [...parts.values()].filter(p => p.visible).map(p => p.mesh);
    const hits = raycaster.intersectObjects(meshes, false);
    return hits.find(h => !section.on || sectionPlane.distanceToPoint(h.point) >= 0) || null;
  }

  const markerMat = new THREE.MeshBasicMaterial({ color: 0x2f6bff, depthTest: false });
  const lineMat = new THREE.LineBasicMaterial({ color: 0x2f6bff, depthTest: false });
  const measureGroup = new THREE.Group();
  measureGroup.renderOrder = 10;
  scene.add(measureGroup);

  function addMeasurePoint(point) {
    if (measurePts.length >= 2) clearMeasure();
    measurePts.push(point.clone());
    const m = new THREE.Mesh(new THREE.SphereGeometry(modelSize * 0.006, 16, 12), markerMat);
    m.position.copy(point);
    m.renderOrder = 10;
    measureGroup.add(m);
    if (measurePts.length === 2) {
      const geo = new THREE.BufferGeometry().setFromPoints(measurePts);
      const line = new THREE.Line(geo, lineMat);
      line.renderOrder = 10;
      measureGroup.add(line);
    }
    updateMeasureInfo();
    requestRender();
  }
  function clearMeasure() {
    measurePts = [];
    measureGroup.children.slice().forEach(c => { c.geometry.dispose(); measureGroup.remove(c); });
    updateMeasureInfo();
    requestRender();
  }
  function measuredDistance() {
    return measurePts.length === 2 ? measurePts[0].distanceTo(measurePts[1]) : null;
  }
  function updateMeasureInfo() {
    const el = $('measure-info');
    if (measurePts.length === 0) el.textContent = measureMode ? 'Click the first point…' : 'Press “Measure”, then click two points on the model.';
    else if (measurePts.length === 1) el.textContent = 'Click the second point…';
    else {
      const d = measurePts[1].clone().sub(measurePts[0]);
      el.innerHTML = `<b>${fmt(d.length(), 3)} mm</b><br><span class="muted">ΔX ${fmt(d.x, 3)} · ΔY ${fmt(d.y, 3)} · ΔZ ${fmt(d.z, 3)}</span>`;
    }
  }
  function updateMeasureLabel() {
    const label = $('measure-label');
    if (measurePts.length !== 2) { label.style.display = 'none'; return; }
    const mid = measurePts[0].clone().add(measurePts[1]).multiplyScalar(0.5).project(camera);
    const r = renderer.domElement.getBoundingClientRect();
    label.style.display = mid.z < 1 ? 'block' : 'none';
    label.style.left = (r.left + (mid.x + 1) / 2 * r.width) + 'px';
    label.style.top = (r.top + (1 - mid.y) / 2 * r.height) + 'px';
    label.textContent = fmt(measuredDistance(), 2) + ' mm';
  }
  function setMeasureMode(on) {
    measureMode = on;
    setActive('measure', on);
    renderer.domElement.style.cursor = on ? 'crosshair' : '';
    if (!on) clearMeasure(); else updateMeasureInfo();
  }

  let down = null;
  renderer.domElement.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, b: e.button }; });
  renderer.domElement.addEventListener('pointerup', e => {
    if (!down || down.b !== 0 || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4) return;
    const hit = pick(e.clientX, e.clientY);
    if (measureMode) { if (hit) addMeasurePoint(hit.point); return; }
    select(hit ? hit.object.userData.id : null);
  });

  // ---------------------------------------------------------------- screenshot
  function capture() {
    renderNow();
    return renderer.domElement.toDataURL('image/png');
  }
  function screenshot() {
    const a = document.createElement('a');
    a.href = capture();
    a.download = (DATA.model || 'model') + '.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // ---------------------------------------------------------------- UI wiring
  document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
  const actions = {
    'reset-view': () => setView('iso'),
    'fit': () => fit(),
    'edges': () => { flags.edges = !flags.edges; applyFlags(); },
    'wireframe': () => { flags.wireframe = !flags.wireframe; applyFlags(); },
    'axes': () => { flags.axes = !flags.axes; applyFlags(); },
    'theme': () => { flags.dark = !flags.dark; applyTheme(); },
    'measure': () => setMeasureMode(!measureMode),
    'screenshot': screenshot,
    'show-all': showAll,
    'clear-selection': () => select(null),
    'reset-joints': resetJoints,
    'toggle-tree': () => { $('tree-panel').classList.toggle('open'); $('side-panel').classList.remove('open'); },
    'toggle-side': () => { $('side-panel').classList.toggle('open'); $('tree-panel').classList.remove('open'); },
  };
  document.querySelectorAll('[data-action]').forEach(b => b.addEventListener('click', () => actions[b.dataset.action]()));
  $('explode').addEventListener('input', e => { explode = Number(e.target.value); updatePose(); });
  $('opacity').addEventListener('input', e => setOpacity(selected, Number(e.target.value)));
  $('section-on').addEventListener('change', e => { section.on = e.target.checked; updateSection(); });
  $('section-axis').addEventListener('change', e => { section.axis = e.target.value; updateSection(); });
  $('section-flip').addEventListener('change', e => { section.flip = e.target.checked; updateSection(); });
  $('section-pos').addEventListener('input', e => { section.t = Number(e.target.value); updateSection(); });
  window.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (e.key === 'Escape') { select(null); if (measureMode) setMeasureMode(false); }
    else if (e.key === 'f' || e.key === 'F') fit();
    else if (e.key === 'r' || e.key === 'R') setView('iso');
    else if (e.key === 'm' || e.key === 'M') setMeasureMode(!measureMode);
  });

  function showMessage(text) {
    const el = $('message');
    el.textContent = text;
    el.style.display = 'block';
  }

  if (RENDER_MODE) document.body.classList.add('render-mode');

  // ---------------------------------------------------------------- automation API
  window.c2h = {
    ready,
    setView, fit, select, isolate, showAll, setVisible: (id, on) => leavesOf(id).forEach(l => setVisible(l, on)),
    setExplode: v => { explode = Math.min(Math.max(Number(v), 0), 1); $('explode').value = explode; updatePose(); },
    setJoint, getJoint: id => jointValues.get(id), resetJoints,
    setSection: (on, axis = 'Z', t = 0.5, flip = false) => {
      Object.assign(section, { on, axis, t, flip });
      $('section-on').checked = on; $('section-axis').value = axis; $('section-pos').value = t; $('section-flip').checked = flip;
      updateSection();
    },
    setFlag: (name, on) => { flags[name] = on; name === 'dark' ? applyTheme() : applyFlags(); },
    setOpacity: (id, v) => setOpacity(leavesOf(id), v),
    measure: (a, b) => { clearMeasure(); addMeasurePoint(new THREE.Vector3(...a)); addMeasurePoint(new THREE.Vector3(...b)); return measuredDistance(); },
    pickAt: (x, y) => { const h = pick(x, y); return h ? { id: h.object.userData.id, point: h.point.toArray() } : null; },
    partWorldBox: id => { const b = new THREE.Box3().setFromObject(parts.get(id).mesh); return [b.min.toArray(), b.max.toArray()]; },
    capture,
    joints: DATA.joints.map(j => ({ id: j.id, type: j.type, min: j.min, max: j.max })),
    partCount: () => parts.size,
  };
})();
