import * as THREE from 'three';
import type { TimeOfDayId, WeatherModeId } from '../../domain/types';
import type { IDepotMaterials } from './depotMaterials';

export interface IDepotSkyController {
  sync(outdoorBlend: number, timeOfDayId: TimeOfDayId, weatherMode: WeatherModeId, cameraPos: THREE.Vector3, mats: IDepotMaterials): void;
}

const SKY_VERTEX_SHADER = `
  varying vec3 vWorldDir;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldDir = normalize(position);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const SKY_FRAGMENT_SHADER = `
  uniform vec3 uTopColor; uniform vec3 uMidColor; uniform vec3 uHorizonColor;
  uniform vec3 uSunDir; uniform vec3 uSunColor; uniform float uSunStrength;
  varying vec3 vWorldDir;
  void main() {
    vec3 dir = normalize(vWorldDir);
    float h = clamp(dir.y, 0.0, 1.0);
    vec3 col = mix(uHorizonColor, uMidColor, smoothstep(0.0, 0.28, h));
    col = mix(col, uTopColor, smoothstep(0.24, 0.85, h));
    float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
    float glow = pow(sunDot, 10.0) * 0.09 + pow(sunDot, 56.0) * 0.28 + smoothstep(0.99935, 0.99972, sunDot) * 1.45;
    gl_FragColor = vec4(col + uSunColor * glow * uSunStrength, 1.0);
  }
`;

interface ISkyUniforms {
  uTopColor: { value: THREE.Color };
  uMidColor: { value: THREE.Color };
  uHorizonColor: { value: THREE.Color };
  uSunDir: { value: THREE.Vector3 };
  uSunColor: { value: THREE.Color };
  uSunStrength: { value: number };
}

function createSkyUniforms(): ISkyUniforms {
  return {
    uTopColor: { value: new THREE.Color(0x2867b8) },
    uMidColor: { value: new THREE.Color(0x6fb1ea) },
    uHorizonColor: { value: new THREE.Color(0xcde2f7) },
    uSunDir: { value: new THREE.Vector3(0.32, 0.36, -0.88).normalize() },
    uSunColor: { value: new THREE.Color(0xfff1cc) },
    uSunStrength: { value: 1.0 },
  };
}

export function createDepotSkyController(root: THREE.Group, disposables: Array<{ dispose(): void }>): IDepotSkyController {
  const skyUniforms = createSkyUniforms();
  const skyGroup = new THREE.Group();
  const skyGeo = new THREE.SphereGeometry(270, 24, 16);
  const skyMat = new THREE.ShaderMaterial({ vertexShader: SKY_VERTEX_SHADER, fragmentShader: SKY_FRAGMENT_SHADER, uniforms: skyUniforms as unknown as Record<string, THREE.IUniform>, side: THREE.BackSide, depthWrite: false, fog: false });
  const skyMesh = new THREE.Mesh(skyGeo, skyMat);
  skyMesh.frustumCulled = false;
  const stars = buildStarfield(disposables);
  skyGroup.add(skyMesh, stars);
  root.add(skyGroup);
  disposables.push(skyGeo, skyMat);
  let lastSkyKey = '';
  return {
    sync: (outdoorBlend, timeOfDayId, weatherMode, cameraPos, mats) => {
      const visibleSky = outdoorBlend > 0.02;
      skyGroup.visible = visibleSky;
      if (visibleSky) skyGroup.position.copy(cameraPos);
      const skyKey = `${timeOfDayId}|${weatherMode}`;
      if (lastSkyKey === skyKey) return;
      lastSkyKey = skyKey;
      applyDepotSurfacePalette(mats, weatherMode === 'snow');
      applySkyPreset(skyUniforms, stars, mats, timeOfDayId, weatherMode);
    },
  };
}

function buildStarfield(disposables: Array<{ dispose(): void }>): THREE.Points {
  const starCount = 560;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i += 1) {
    const theta = (((i * 73 + 19) % 997) / 997) * Math.PI * 2;
    const phi = Math.acos(0.06 + (((i * 151 + 43) % 991) / 991) * 0.92);
    positions[i * 3] = 245 * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = 245 * Math.cos(phi);
    positions[i * 3 + 2] = 245 * Math.sin(phi) * Math.sin(theta);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ color: 0xf8fafc, size: 2.3, sizeAttenuation: false, transparent: true, opacity: 0.94, depthWrite: false, fog: false });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.visible = false;
  disposables.push(geo, mat);
  return pts;
}

function applyDepotSurfacePalette(mats: IDepotMaterials, isSnow: boolean): void {
  mats.grass.color.setHex(isSnow ? 0xf1f5f9 : 0x3b6036);
  mats.grass.roughness = isSnow ? 0.78 : 0.95;
  mats.gravel.color.setHex(isSnow ? 0xdbe4ef : 0x52565c);
  mats.gravel.roughness = isSnow ? 0.82 : 0.94;
  mats.hangarRoof.color.setHex(isSnow ? 0xe2e8f0 : 0x334155);
  mats.foliage.color.setHex(isSnow ? 0xdbeafe : 0x2f5a32);
  mats.darkConcrete.color.setHex(isSnow ? 0x94a3b8 : 0x383f4a);
}

function applyNightSkyPreset(
  skyUniforms: ISkyUniforms, stars: THREE.Points, mats: IDepotMaterials, deep: boolean, isRain: boolean, isSnow: boolean,
): void {
  skyUniforms.uTopColor.value.setHex(isSnow ? 0x0d1624 : isRain ? 0x090e14 : deep ? 0x01030a : 0x020612);
  skyUniforms.uMidColor.value.setHex(isSnow ? 0x1e2c40 : isRain ? 0x151d28 : deep ? 0x040918 : 0x071228);
  skyUniforms.uHorizonColor.value.setHex(isSnow ? 0x33465e : isRain ? 0x222c38 : deep ? 0x0b152a : 0x112040);
  skyUniforms.uSunDir.value.set(-0.26, 0.34, -0.9).normalize();
  skyUniforms.uSunColor.value.setHex(0xe2ecff);
  skyUniforms.uSunStrength.value = isRain || isSnow ? 0.08 : deep ? 0.45 : 0.85;
  stars.visible = !isRain && !isSnow;
  mats.mastLamp.emissiveIntensity = deep ? 6.0 : 5.2;
  mats.hangarWindow.emissiveIntensity = deep ? 1.8 : 2.6;
  mats.hangarSign.emissiveIntensity = 0.95;
}

function applySkyPreset(
  skyUniforms: ISkyUniforms, stars: THREE.Points, mats: IDepotMaterials, timeOfDayId: TimeOfDayId, weatherMode: WeatherModeId,
): void {
  const isRain = weatherMode === 'rain';
  const isSnow = weatherMode === 'snow';
  if (timeOfDayId === 'evening' || timeOfDayId === 'night_service') {
    applyNightSkyPreset(skyUniforms, stars, mats, timeOfDayId === 'night_service', isRain, isSnow);
    return;
  }
  const preset = isSnow
    ? { top: 0x5b728e, mid: 0x8fa6c0, hor: 0xdbe7f4, sunY: 0.32, sunCol: 0xf1f5f9, sunStr: 0.25, mast: 2.1, win: 1.35, sign: 0.65 }
    : isRain
      ? { top: 0x475569, mid: 0x6c7c8e, hor: 0x9aa8b8, sunY: 0.34, sunCol: 0xe2e8f0, sunStr: 0.14, mast: 2.4, win: 1.4, sign: 0.65 }
      : { top: 0x2563b5, mid: 0x6db0ea, hor: 0xd4e6f8, sunY: 0.34, sunCol: 0xfff1cc, sunStr: 1.05, mast: 0.9, win: 0.4, sign: 0.35 };
  skyUniforms.uTopColor.value.setHex(preset.top);
  skyUniforms.uMidColor.value.setHex(preset.mid);
  skyUniforms.uHorizonColor.value.setHex(preset.hor);
  skyUniforms.uSunDir.value.set(0.32, preset.sunY, -0.88).normalize();
  skyUniforms.uSunColor.value.setHex(preset.sunCol);
  skyUniforms.uSunStrength.value = preset.sunStr;
  stars.visible = false;
  mats.mastLamp.emissiveIntensity = preset.mast;
  mats.hangarWindow.emissiveIntensity = preset.win;
  mats.hangarSign.emissiveIntensity = preset.sign;
}
