// Entry point used to build vendor/three.bundle.min.js (see vendor/README.md).
// Exposes three.js core plus the two addons the viewer needs as one global: window.THREE
import * as THREE_CORE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

window.THREE = Object.assign({}, THREE_CORE, { OrbitControls, GLTFLoader });
