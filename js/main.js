/**
 * United Carriers — Main init (mobile nav + Dooted Globe hero)
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

// =====================================================
// Mobile navigation
// =====================================================

(function initMobileNav() {
  "use strict";

  const toggle = document.querySelector(".navbar__toggle");
  const nav = document.querySelector(".navbar__nav");

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
      document.body.style.overflow = isOpen ? "hidden" : "";
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      });
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      }
    });
  }
})();

// =====================================================
// DOOTED GLOBE — THREE.JS IMPLEMENTATION
// Integrated from existing Dooted Globe folder
// =====================================================

const DOOTED_GLOBE_BASE = "globe/";

let heroGlobeCleanup = null;

// ─── Error handling ───────────────────────────────────────────────────────────

function showError(message) {
  const overlay = null;
  const msg = null;
  if (overlay && msg) {
    msg.textContent = message;
    overlay.hidden = false;
  }
  console.error(message);
}

// ─── Constants ───────────────────────────────────────────────────────────────

const GLOBE_RADIUS = 2.0;
const ROTATION_SPEED = 0.0015;
const STAR_COUNT = 12000;

const COLORS = {
  background: 0x020202,
  ocean: new THREE.Color("#030303"),
  oceanNavy: new THREE.Color("#07101F"),
  dots: new THREE.Color("#FFFFFF"),
  // Orange top palette
  orangeRim: new THREE.Color("#FF7A1A"),
  orangeCore: new THREE.Color("#FFB36A"),
  orangeFade: new THREE.Color("#C95716"),
  // Blue bottom palette
  blueLower: new THREE.Color("#145CFF"),
  blueAtmo: new THREE.Color("#3A7BFF"),
  blueBloom: new THREE.Color("#6FA8FF"),
  marker: new THREE.Color("#FF6A00"),
};

// ─── Utilities ───────────────────────────────────────────────────────────────

async function loadShader(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load shader: ${path}`);
  return res.text();
}

function latLngToVector3(lat, lng, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// ─── Star Field ──────────────────────────────────────────────────────────────

function createStarField() {
  const positions = new Float32Array(STAR_COUNT * 3);
  const sizes = new Float32Array(STAR_COUNT);

  for (let i = 0; i < STAR_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 80 + Math.random() * 120;

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    sizes[i] = Math.random() * 1.8 + 0.3;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
    },
    vertexShader: `
      attribute float size;
      uniform float time;
      varying float vBrightness;

      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = size * (200.0 / -mvPosition.z);

        float phase = fract(sin(dot(position.xy, vec2(12.9898, 78.233))) * 43758.5453) * 6.28318;
        vBrightness = 0.6 + 0.4 * sin(time * 1.5 + phase);
      }
    `,
    fragmentShader: `
      varying float vBrightness;
      void main() {
        vec2 center = gl_PointCoord - 0.5;
        float dist = length(center);
        if (dist > 0.5) discard;
        float alpha = smoothstep(0.5, 0.1, dist) * vBrightness;
        gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return { points: new THREE.Points(geometry, material) };
}

// ─── Space Background ─────────────────────────────────────────────────────────

function createSpaceBackground(nebulaTexture, noiseTexture) {
  const group = new THREE.Group();

  nebulaTexture.wrapS = THREE.ClampToEdgeWrapping;
  nebulaTexture.wrapT = THREE.ClampToEdgeWrapping;
  noiseTexture.wrapS = THREE.RepeatWrapping;
  noiseTexture.wrapT = THREE.RepeatWrapping;

  const bgGeometry = new THREE.SphereGeometry(300, 64, 64);
  const bgMaterial = new THREE.ShaderMaterial({
    uniforms: {
      nebulaMap: { value: nebulaTexture },
      noiseMap: { value: noiseTexture },
      bgColor: { value: new THREE.Color("#020202") },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D nebulaMap;
      uniform sampler2D noiseMap;
      uniform vec3 bgColor;
      varying vec2 vUv;

      void main() {
        vec3 nebula = texture2D(nebulaMap, vUv).rgb;
        float noise = texture2D(noiseMap, vUv * 4.0).r;
        vec3 color = bgColor;
        color += nebula * 0.35;
        color += vec3(noise * 0.015);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
  });

  group.add(new THREE.Mesh(bgGeometry, bgMaterial));
  return group;
}

// ─── Dotted Globe Material ───────────────────────────────────────────────────

function createDotsMaterial(landMaskTexture, vertSrc, fragSrc) {
  landMaskTexture.minFilter = THREE.LinearFilter;
  landMaskTexture.magFilter = THREE.LinearFilter;
  landMaskTexture.generateMipmaps = false;

  return new THREE.ShaderMaterial({
    uniforms: {
      landMask: { value: landMaskTexture },
      dotSize: { value: 0.15 },
      dotBrightness: { value: 1.65 },
      gridScale: { value: 420.0 },
      dotColor: { value: COLORS.dots },
      oceanColor: { value: COLORS.ocean },
      oceanNavy: { value: COLORS.oceanNavy },
    },
    vertexShader: vertSrc,
    fragmentShader: fragSrc,
  });
}

// ─── Atmosphere & Sunrise Layers ─────────────────────────────────────────────

function createGlobeAtmosphere(atmoVert, atmoFrag) {
  // Tight shell hugging globe surface — prevents outer ring artifact
  const geometry = new THREE.SphereGeometry(GLOBE_RADIUS * 1.004, 128, 128);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      colorOrangeRim: { value: COLORS.orangeRim },
      colorOrangeCore: { value: COLORS.orangeCore },
      colorOrangeFade: { value: COLORS.orangeFade },
      colorBlueLower: { value: COLORS.blueLower },
      colorBlueAtmo: { value: COLORS.blueAtmo },
      colorBlueBloom: { value: COLORS.blueBloom },
      intensity: { value: 1.15 },
    },
    vertexShader: atmoVert,
    fragmentShader: atmoFrag,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 1;
  return mesh;
}

// ─── Country Markers & Labels ────────────────────────────────────────────────

const MARKER_COLOR = 0xff6a00;

// Fine-tuned offsets for crowded regions; others use auto placement
const LABEL_OVERRIDES = {
  UK: { x: -0.03, y: 0.06, z: 0.018 },
  GERMANY: { x: 0.035, y: 0.065, z: 0.015 },
  SPAIN: { x: -0.04, y: 0.05, z: 0.018 },
  ITALY: { x: 0.03, y: 0.055, z: 0.02 },
  TURKEY: { x: -0.035, y: 0.06, z: 0.018 },
  ISRAEL: { x: 0.04, y: 0.05, z: 0.015 },
  EGYPT: { x: -0.03, y: 0.065, z: 0.018 },
  QATAR: { x: 0.04, y: 0.055, z: 0.012 },
  "SAUDI ARABIA": { x: -0.04, y: 0.05, z: 0.02 },
  KENYA: { x: 0.03, y: 0.06, z: 0.015 },
  CHINA: { x: -0.035, y: 0.065, z: 0.018 },
  JAPAN: { x: 0.04, y: 0.055, z: 0.018 },
  "HONG KONG": { x: 0.03, y: 0.045, z: 0.02 },
  THAILAND: { x: -0.035, y: 0.05, z: 0.018 },
  CANADA: { x: -0.03, y: 0.06, z: 0.015 },
  USA: { x: 0.035, y: 0.055, z: 0.018 },
  MEXICO: { x: -0.035, y: 0.05, z: 0.018 },
  COLOMBIA: { x: 0.04, y: 0.055, z: 0.015 },
  BRAZIL: { x: -0.04, y: 0.06, z: 0.018 },
  ARGENTINA: { x: 0.035, y: 0.05, z: 0.018 },
  "SOUTH AFRICA": { x: -0.03, y: 0.055, z: 0.018 },
  AUSTRALIA: { x: 0.04, y: 0.055, z: 0.02 },
  "NEW ZEALAND": { x: -0.035, y: 0.05, z: 0.018 },
};

const LABEL_DIRECTIONS = [
  { x: 0, y: 0.06, z: 0.02 },
  { x: 0.035, y: 0.055, z: 0.015 },
  { x: -0.035, y: 0.055, z: 0.015 },
  { x: 0.03, y: 0.065, z: 0.012 },
  { x: -0.03, y: 0.065, z: 0.012 },
  { x: 0.04, y: 0.05, z: 0.018 },
  { x: -0.04, y: 0.05, z: 0.018 },
  { x: 0, y: 0.07, z: 0.01 },
];

function angularDistance(a, b) {
  const dLat = a.lat - b.lat;
  const dLng = a.lng - b.lng;
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

function computeLabelOffset(loc, index, locations) {
  if (LABEL_OVERRIDES[loc.name]) {
    const o = LABEL_OVERRIDES[loc.name];
    return new THREE.Vector3(o.x, o.y, o.z);
  }

  let bestIdx = index % LABEL_DIRECTIONS.length;
  let bestScore = -Infinity;

  for (let d = 0; d < LABEL_DIRECTIONS.length; d++) {
    let score = 0;
    for (let i = 0; i < locations.length; i++) {
      const other = locations[i];
      if (other.name === loc.name) continue;
      const dist = angularDistance(loc, other);
      if (dist < 18) {
        score -= (18 - dist) * 1.5;
        if (i % LABEL_DIRECTIONS.length === d) score -= 6;
      }
    }
    score -= d * 0.05;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = d;
    }
  }

  const dir = LABEL_DIRECTIONS[bestIdx];
  const yScale = loc.lat < -20 ? 0.9 : loc.lat > 50 ? 1.08 : 1.0;
  return new THREE.Vector3(dir.x, dir.y * yScale, dir.z);
}

function createCountryMarker(loc, index, locations) {
  const group = new THREE.Group();
  const pos = latLngToVector3(loc.lat, loc.lng, GLOBE_RADIUS);
  group.position.copy(pos);
  group.lookAt(pos.clone().multiplyScalar(2));

  const markerStart = new THREE.Vector3(0, 0, 0.012);
  const labelLocal = computeLabelOffset(loc, index, locations);

  // Core glowing dot
  const dot = new THREE.Mesh(
    new THREE.CircleGeometry(0.016, 24),
    new THREE.MeshBasicMaterial({
      color: MARKER_COLOR,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  dot.position.copy(markerStart);
  group.add(dot);

  // Soft outer glow
  const halo = new THREE.Mesh(
    new THREE.CircleGeometry(0.026, 24),
    new THREE.MeshBasicMaterial({
      color: MARKER_COLOR,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  halo.position.set(markerStart.x, markerStart.y, markerStart.z - 0.002);
  group.add(halo);

  // Pulse rings
  const rings = [];
  for (let i = 0; i < 2; i++) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.02, 0.024, 32),
      new THREE.MeshBasicMaterial({
        color: MARKER_COLOR,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    ring.position.set(markerStart.x, markerStart.y, markerStart.z - 0.003);
    ring.userData = { phase: i * 0.5, speed: 0.013 };
    rings.push(ring);
    group.add(ring);
  }

  // Label must share the same group transform as the marker dot
  const el = document.createElement("div");
  el.className = "globe-label";
  el.innerHTML = `<div class="globe-label__text">${loc.name}</div>`;
  const label = new CSS2DObject(el);
  label.position.copy(labelLocal);
  group.add(label);

  group.userData = { rings };
  return group;
}

function updateCountryMarkers(markers, time) {
  markers.forEach((marker) => {
    marker.userData.rings.forEach((ring) => {
      const t = (time * ring.userData.speed + ring.userData.phase) % 1;
      const scale = 1 + t * 2.8;
      ring.scale.set(scale, scale, 1);
      ring.material.opacity = 0.55 * (1 - t);
    });
  });
}

// ─── Mouse Interaction Ring (3D surface ring) ────────────────────────────────

function createMouseRing() {
  const geometry = new THREE.RingGeometry(0.08, 0.095, 48);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(geometry, material);
  ring.visible = false;
  return ring;
}

// ─── Animated Connection Arcs ────────────────────────────────────────────────

const ARC_COLOR = new THREE.Color("#6A2200");
const ARC_PULSE_COLOR = new THREE.Color("#E06010");
const ARC_LIFE_MIN = 5.5;
const ARC_LIFE_MAX = 9.5;
const ARC_CORE_RADIUS = 0.0042;
const ARC_BLOOM_RADIUS = 0.0095;
const ARC_OUTER_BLOOM_RADIUS = 0.015;

function createArcCurve(startLat, startLng, endLat, endLng, altitude = 0.18) {
  const start = latLngToVector3(startLat, startLng, GLOBE_RADIUS);
  const end = latLngToVector3(endLat, endLng, GLOBE_RADIUS);
  const mid = start.clone().add(end).normalize().multiplyScalar(GLOBE_RADIUS * (1 + altitude));
  return new THREE.QuadraticBezierCurve3(start, mid, end);
}

function createArcPulseMaterial(phase = 0) {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: phase },
      color: { value: ARC_COLOR },
      pulseColor: { value: ARC_PULSE_COLOR },
      pulseSpeed: { value: 0.38 },
    },
    vertexShader: `
      varying float vAlong;
      void main() {
        vAlong = uv.y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform float pulseSpeed;
      uniform vec3 color;
      uniform vec3 pulseColor;
      varying float vAlong;

      void main() {
        float travel = fract(vAlong - time * pulseSpeed);
        float bead = smoothstep(0.0, 0.05, travel) * smoothstep(0.26, 0.04, travel);
        float trail = smoothstep(0.0, 0.42, travel) * 0.4;
        float alpha = clamp(0.95 + bead * 0.05, 0.0, 1.0);
        vec3 col = mix(color, pulseColor, bead * 0.95 + trail * 0.32);
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

function buildConnectionArc(start, end) {
  const dist = angularDistance(start, end);
  const altitude = 0.14 + Math.min(dist / 160, 1) * 0.12;
  const curve = createArcCurve(start.lat, start.lng, end.lat, end.lng, altitude);
  const segments = window.innerWidth < 768 ? 36 : 56;
  const group = new THREE.Group();

  const outerBloomMat = new THREE.MeshBasicMaterial({
    color: ARC_COLOR,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  group.add(
    new THREE.Mesh(
      new THREE.TubeGeometry(curve, segments, ARC_OUTER_BLOOM_RADIUS, 6, false),
      outerBloomMat
    )
  );

  const bloomMat = new THREE.MeshBasicMaterial({
    color: ARC_COLOR,
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  group.add(
    new THREE.Mesh(new THREE.TubeGeometry(curve, segments, ARC_BLOOM_RADIUS, 6, false), bloomMat)
  );

  const coreMat = createArcPulseMaterial(Math.random());
  group.add(
    new THREE.Mesh(new THREE.TubeGeometry(curve, segments, ARC_CORE_RADIUS, 6, false), coreMat)
  );

  return { group, materials: [coreMat, bloomMat, outerBloomMat] };
}

function setArcFullBrightness(arc) {
  arc.materials[1].opacity = 0.88;
  arc.materials[2].opacity = 0.55;
}

function arcRouteKey(a, b) {
  return `${a}->${b}`;
}

function generateCoverageRoutes(locations) {
  const n = locations.length;
  const routes = [];

  for (let i = 0; i < n; i++) {
    const candidates = [...Array(n).keys()]
      .filter((j) => j !== i)
      .map((j) => ({ j, dist: angularDistance(locations[i], locations[j]) }))
      .filter((c) => c.dist >= 8 && c.dist <= 145)
      .sort((a, b) => a.dist - b.dist);

    let partner = null;
    if (candidates.length > 0) {
      const pool = candidates.slice(0, Math.min(6, candidates.length));
      partner = pool[Math.floor(Math.random() * pool.length)].j;
    } else {
      partner = (i + Math.ceil(n / 2)) % n;
      if (partner === i) partner = (i + 1) % n;
    }

    routes.push({
      a: i,
      b: partner,
      key: arcRouteKey(i, partner),
      start: locations[i],
      end: locations[partner],
    });
  }

  return routes;
}

class ConnectionArcManager {
  constructor(locations, parentGroup) {
    this.locations = locations;
    this.group = new THREE.Group();
    this.group.renderOrder = 0;
    parentGroup.add(this.group);

    this.activeArcs = [];
    this.usedRoutes = new Set();
    this.coverageRoutes = generateCoverageRoutes(locations);
    this.minArcs = this.locations.length;

    this.coverageRoutes.forEach((route) => {
      this.usedRoutes.add(route.key);
      this.addArc(route);
    });
  }

  getOutgoingCounts() {
    const counts = new Array(this.locations.length).fill(0);
    for (const arc of this.activeArcs) {
      counts[arc.a]++;
    }
    return counts;
  }

  pickRoute(replaceArc = null) {
    const count = this.locations.length;
    const outgoing = this.getOutgoingCounts();
    const needy = [];

    for (let i = 0; i < count; i++) {
      if (outgoing[i] === 0) needy.push(i);
    }

    if (replaceArc && outgoing[replaceArc.a] <= 1) {
      if (!needy.includes(replaceArc.a)) needy.unshift(replaceArc.a);
    }

    const tryRoute = (a, b) => {
      if (a === b) return null;
      const key = arcRouteKey(a, b);
      if (this.usedRoutes.has(key)) return null;
      const dist = angularDistance(this.locations[a], this.locations[b]);
      if (dist < 8 && count > 2) return null;
      this.usedRoutes.add(key);
      return {
        a,
        b,
        key,
        start: this.locations[a],
        end: this.locations[b],
      };
    };

    for (const a of needy) {
      const partners = [...Array(count).keys()]
        .filter((j) => j !== a)
        .sort(() => Math.random() - 0.5);
      for (const b of partners) {
        const route = tryRoute(a, b);
        if (route) return route;
      }
    }

    if (replaceArc) {
      const partners = [...Array(count).keys()]
        .filter((j) => j !== replaceArc.a)
        .sort(() => Math.random() - 0.5);
      for (const b of partners) {
        const route = tryRoute(replaceArc.a, b);
        if (route) return route;
      }
    }

    for (let attempt = 0; attempt < 80; attempt++) {
      const a = Math.floor(Math.random() * count);
      const b = Math.floor(Math.random() * count);
      const route = tryRoute(a, b);
      if (route) return route;
    }

    return null;
  }

  addArc(route) {
    const built = buildConnectionArc(route.start, route.end);
    const arc = {
      group: built.group,
      materials: built.materials,
      key: route.key,
      a: route.a,
      b: route.b,
      state: "live",
      stateTime: 0,
      lifetime: ARC_LIFE_MIN + Math.random() * (ARC_LIFE_MAX - ARC_LIFE_MIN),
      pulseSpeed: 0.28 + Math.random() * 0.14,
      phase: Math.random(),
    };

    arc.materials[0].uniforms.pulseSpeed.value = arc.pulseSpeed;
    setArcFullBrightness(arc);
    this.activeArcs.push(arc);
    this.group.add(arc.group);
  }

  spawnArc(replaceArc = null) {
    const route = this.pickRoute(replaceArc);
    if (!route) return;
    this.addArc(route);
  }

  disposeArc(index) {
    const arc = this.activeArcs[index];
    this.usedRoutes.delete(arc.key);
    this.group.remove(arc.group);
    arc.group.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
    this.activeArcs.splice(index, 1);
    return arc;
  }

  update(elapsed, delta) {
    for (let i = this.activeArcs.length - 1; i >= 0; i--) {
      const arc = this.activeArcs[i];
      arc.stateTime += delta;
      arc.materials[0].uniforms.time.value = elapsed * arc.pulseSpeed + arc.phase;
      setArcFullBrightness(arc);

      if (arc.stateTime >= arc.lifetime) {
        const removed = this.disposeArc(i);
        this.spawnArc(removed);
      }
    }

    const outgoing = this.getOutgoingCounts();
    if (outgoing.some((c) => c === 0)) {
      this.spawnArc();
    }

    while (this.activeArcs.length < this.minArcs) {
      this.spawnArc();
    }
  }
}

async function initDootedGlobe(container) {
  try {
    return await initScene(container);
  } catch (err) {
    showError(`Globe load nahi ho saka: ${err.message}`);
    return null;
  }
}

async function initScene(container) {
  const [locations, dotsVert, dotsFrag, atmoVert, atmoFrag] =
    await Promise.all([
      fetch(`${DOOTED_GLOBE_BASE}data/locations.json`).then((r) => r.json()),
      loadShader(`${DOOTED_GLOBE_BASE}shaders/dots.vert.glsl`),
      loadShader(`${DOOTED_GLOBE_BASE}shaders/dots.frag.glsl`),
      loadShader(`${DOOTED_GLOBE_BASE}shaders/atmosphere.vert.glsl`),
      loadShader(`${DOOTED_GLOBE_BASE}shaders/atmosphere.frag.glsl`),
    ]);

  const textureLoader = new THREE.TextureLoader();
  const landMaskTexture = await textureLoader.loadAsync(`${DOOTED_GLOBE_BASE}assets/land-mask.png`);

  // DOOTED GLOBE: Scene initialization
  const scene = new THREE.Scene();

  const getSize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    return { w: Math.max(w, 1), h: Math.max(h, 1) };
  };

  let { w: viewW, h: viewH } = getSize();

  const camera = new THREE.PerspectiveCamera(35, viewW / viewH, 0.1, 1000);
  camera.position.set(-2, 1, 9);

  const canvas = container.querySelector("#webgl-canvas");
  // DOOTED GLOBE: Renderer
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setSize(viewW, viewH);
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  // High-quality land mask sampling for full world map
  landMaskTexture.wrapS = THREE.ClampToEdgeWrapping;
  landMaskTexture.wrapT = THREE.ClampToEdgeWrapping;
  landMaskTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(viewW, viewH);
  labelRenderer.domElement.className = "hero-globe__labels";
  labelRenderer.domElement.style.position = "absolute";
  labelRenderer.domElement.style.inset = "0";
  labelRenderer.domElement.style.pointerEvents = "none";
  labelRenderer.domElement.style.zIndex = "1";
  container.appendChild(labelRenderer.domElement);

  // ── Lighting ──
  scene.add(new THREE.AmbientLight(0xffffff, 0.22));
  const dirLight = new THREE.DirectionalLight(0xffa060, 0.45);
  dirLight.position.set(5, 8, 3);
  scene.add(dirLight);

  const rimLight = new THREE.DirectionalLight(0x4488ff, 0.12);
  rimLight.position.set(-4, -2, -5);
  scene.add(rimLight);

  // DOOTED GLOBE: Globe group (auto-rotation container) ──
  const globeGroup = new THREE.Group();
  scene.add(globeGroup);

  // ThreeGlobe for arcs + custom dotted material
  const dotsMaterial = createDotsMaterial(landMaskTexture, dotsVert, dotsFrag);

  // Native globe mesh (reliable rendering)
  const globeMesh = new THREE.Mesh(
    new THREE.SphereGeometry(GLOBE_RADIUS, 128, 128),
    dotsMaterial
  );
  globeMesh.renderOrder = 0;
  globeGroup.add(globeMesh);

  // Unified embedded atmosphere (orange top + blue bottom)
  globeGroup.add(createGlobeAtmosphere(atmoVert, atmoFrag));

  // Dynamic animated connection arcs (below markers in scene graph)
  const arcManager = new ConnectionArcManager(locations, globeGroup);

  // Country markers + labels (lat/lng anchored)
  const countryMarkers = locations.map((loc, i) => createCountryMarker(loc, i, locations));
  countryMarkers.forEach((m) => globeGroup.add(m));

  // 3D mouse ring on globe surface
  const mouseRing3D = createMouseRing();
  globeGroup.add(mouseRing3D);

  // ── Orbit Controls ──
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.minPolarAngle = Math.PI * 0.35;
  controls.maxPolarAngle = Math.PI * 0.65;
  controls.rotateSpeed = 0.4;
  controls.target.set(0, 0, 0);
  controls.update();

  // ── Mouse interaction ──
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const invGlobeMatrix = new THREE.Matrix4();
  const localRayOrigin = new THREE.Vector3();
  const localRayDir = new THREE.Vector3();

  let isHovering = false;
  const targetRingPos = new THREE.Vector3();
  const currentRingPos = new THREE.Vector3();
  let ringScale = 0;
  let targetRingScale = 0;

  function intersectGlobeLocal(ray) {
    invGlobeMatrix.copy(globeGroup.matrixWorld).invert();
    localRayOrigin.copy(ray.origin).applyMatrix4(invGlobeMatrix);
    localRayDir.copy(ray.direction).transformDirection(invGlobeMatrix);

    const b = 2 * localRayOrigin.dot(localRayDir);
    const c = localRayOrigin.dot(localRayOrigin) - GLOBE_RADIUS * GLOBE_RADIUS;
    const disc = b * b - 4 * c;
    if (disc < 0) return null;

    const t = (-b - Math.sqrt(disc)) / 2;
    if (t <= 0) return null;

    return localRayOrigin.clone().addScaledVector(localRayDir, t);
  }

  function onPointerMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const localHit = intersectGlobeLocal(raycaster.ray);

    if (localHit) {
      isHovering = true;
      targetRingPos.copy(localHit);
      targetRingScale = 1;
      return;
    }

    isHovering = false;
    targetRingScale = 0;
  }

  function onPointerLeave() {
    isHovering = false;
    targetRingScale = 0;
  }

  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerleave", onPointerLeave);

  // DOOTED GLOBE: Resize handling
  function onResize() {
    const size = getSize();
    viewW = size.w;
    viewH = size.h;
    camera.aspect = viewW / viewH;
    camera.updateProjectionMatrix();
    renderer.setSize(viewW, viewH);
    labelRenderer.setSize(viewW, viewH);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  const resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(container);
  window.addEventListener("resize", onResize);

  // DOOTED GLOBE: Animation loop
  const clock = new THREE.Clock();
  let autoRotation = ROTATION_SPEED;
  let animationFrameId = 0;
  let disposed = false;

  function animate() {
    if (disposed) return;
    animationFrameId = requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    // Auto-rotation with mouse slowdown
    const rotSpeed = isHovering ? autoRotation * 0.3 : autoRotation;
    globeGroup.rotation.y += rotSpeed;

    // Pulsing marker rings only (dots stay static)
    updateCountryMarkers(countryMarkers, elapsed);

    // Animated connection arcs (fade + pulse + route cycling)
    arcManager.update(elapsed, delta);

    // Mouse ring smooth follow
    currentRingPos.lerp(targetRingPos, 0.12);
    ringScale = lerp(ringScale, targetRingScale, 0.1);

    if (ringScale > 0.01) {
      mouseRing3D.visible = true;
      mouseRing3D.position.copy(currentRingPos);
      mouseRing3D.lookAt(currentRingPos.clone().multiplyScalar(2));
      mouseRing3D.material.opacity = ringScale * 0.85;
      mouseRing3D.scale.setScalar(0.8 + ringScale * 0.4);
    } else {
      mouseRing3D.visible = false;
    }

    controls.update();
    globeGroup.updateMatrixWorld(true);
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }

  animate();

  return function cleanupDootedGlobe() {
    disposed = true;
    cancelAnimationFrame(animationFrameId);
    resizeObserver.disconnect();
    window.removeEventListener("resize", onResize);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerleave", onPointerLeave);
    controls.dispose();
    renderer.dispose();
    if (labelRenderer.domElement.parentNode) {
      labelRenderer.domElement.parentNode.removeChild(labelRenderer.domElement);
    }
    scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  };
}



async function bootHeroGlobe() {
  const container = document.getElementById("hero-globe-container");
  if (!container) return;

  const waitForSize = () =>
    new Promise((resolve) => {
      const check = () => {
        if (container.clientWidth > 0 && container.clientHeight > 0) {
          resolve();
          return;
        }
        requestAnimationFrame(check);
      };
      check();
    });

  try {
    await waitForSize();
    if (heroGlobeCleanup) heroGlobeCleanup();
    heroGlobeCleanup = await initDootedGlobe(container);
  } catch (err) {
    console.error("Dooted Globe hero init failed:", err);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootHeroGlobe);
} else {
  bootHeroGlobe();
}

window.addEventListener("beforeunload", () => {
  if (heroGlobeCleanup) heroGlobeCleanup();
});
