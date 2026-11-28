import * as THREE from 'three';

export interface IStationFurnitureMaterials {
  readonly column: THREE.MeshStandardMaterial;
  readonly benchWood: THREE.MeshStandardMaterial;
  readonly benchMetal: THREE.MeshStandardMaterial;
  readonly safetyYellow: THREE.MeshStandardMaterial;
  readonly binBody: THREE.MeshStandardMaterial;
  readonly binRim: THREE.MeshStandardMaterial;
  readonly clockFrame: THREE.MeshStandardMaterial;
  readonly clockScreenPlayer: THREE.MeshStandardMaterial;
  readonly clockScreenOpposite: THREE.MeshStandardMaterial;
  readonly liveDigitalClock: THREE.MeshStandardMaterial;
  readonly escalatorMetal: THREE.MeshStandardMaterial;
  readonly escalatorStep: THREE.MeshStandardMaterial;
  readonly escalatorGlass: THREE.MeshStandardMaterial;
  readonly handrailBlack: THREE.MeshStandardMaterial;
  readonly exitGlow: THREE.MeshStandardMaterial;
  readonly exitSign: THREE.MeshStandardMaterial;
}

const STEP_DUMMY = new THREE.Object3D();

export function addEscalatorStructure(
  group: THREE.Group,
  centerX: number,
  centerZ: number,
  totalWidth: number,
  mats: IStationFurnitureMaterials,
  disposables: Array<{ dispose(): void }>,
  facingDirZ: 1 | -1 = 1,
): void {
  const runLength = 12.6;
  const riseHeight = 4.35;
  const slopeLen = Math.hypot(runLength, riseHeight);
  const pitchRad = Math.atan2(riseHeight, runLength);
  const escGroup = new THREE.Group();
  escGroup.position.set(centerX, 1.08, centerZ);
  escGroup.rotation.y = facingDirZ === 1 ? 0 : Math.PI;
  addEscalatorTrussAndSteps(escGroup, totalWidth, runLength, riseHeight, slopeLen, pitchRad, mats, disposables);
  addEscalatorRailsAndLanding(escGroup, totalWidth, runLength, riseHeight, slopeLen, pitchRad, mats, disposables);
  addExitSignboard(escGroup, totalWidth, runLength, riseHeight, mats, disposables);
  group.add(escGroup);
}

function addEscalatorTrussAndSteps(
  escGroup: THREE.Group, totalWidth: number, runLength: number, riseHeight: number,
  slopeLen: number, pitchRad: number, mats: IStationFurnitureMaterials, disposables: Array<{ dispose(): void }>,
): void {
  const trussGeo = new THREE.BoxGeometry(totalWidth, 0.58, slopeLen);
  const truss = new THREE.Mesh(trussGeo, mats.escalatorMetal);
  truss.position.set(0, riseHeight * 0.5 - 0.1, 0);
  truss.rotation.x = pitchRad;
  escGroup.add(truss);
  const stepCount = 20;
  const stepGeo = new THREE.BoxGeometry(totalWidth - 0.24, 0.14, 0.42);
  const steps = new THREE.InstancedMesh(stepGeo, mats.escalatorStep, stepCount);
  for (let i = 0; i < stepCount; i += 1) {
    const t = (i + 0.5) / stepCount;
    STEP_DUMMY.position.set(0, t * riseHeight + 0.08, runLength * 0.5 - t * runLength);
    STEP_DUMMY.rotation.set(0, 0, 0);
    STEP_DUMMY.updateMatrix();
    steps.setMatrixAt(i, STEP_DUMMY.matrix);
  }
  steps.instanceMatrix.needsUpdate = true;
  steps.computeBoundingSphere();
  escGroup.add(steps);
  disposables.push(trussGeo, stepGeo);
}

function addEscalatorRailsAndLanding(
  escGroup: THREE.Group, totalWidth: number, runLength: number, riseHeight: number,
  slopeLen: number, pitchRad: number, mats: IStationFurnitureMaterials, disposables: Array<{ dispose(): void }>,
): void {
  addEscalatorBalustrades(escGroup, totalWidth, riseHeight, slopeLen, pitchRad, mats, disposables);
  const landingGeo = new THREE.BoxGeometry(totalWidth + 0.2, 0.06, 1.4);
  const bottomLanding = new THREE.Mesh(landingGeo, mats.escalatorMetal);
  bottomLanding.position.set(0, 0.03, runLength * 0.5 + 0.65);
  const archBeamGeo = new THREE.BoxGeometry(totalWidth + 0.6, 0.26, 0.4);
  const archGlowGeo = new THREE.BoxGeometry(totalWidth + 0.2, 0.14, 0.44);
  const topArch = new THREE.Mesh(archBeamGeo, mats.clockFrame);
  topArch.position.set(0, riseHeight + 0.05, -runLength * 0.5);
  const topGlow = new THREE.Mesh(archGlowGeo, mats.exitGlow);
  topGlow.position.set(0, riseHeight - 0.12, -runLength * 0.5);
  escGroup.add(bottomLanding, topArch, topGlow);
  disposables.push(landingGeo, archBeamGeo, archGlowGeo);
}

function addExitSignboard(
  escGroup: THREE.Group, totalWidth: number, runLength: number, riseHeight: number,
  mats: IStationFurnitureMaterials, disposables: Array<{ dispose(): void }>,
): void {
  const signW = Math.min(2.6, totalWidth + 0.35);
  const frameGeo = new THREE.BoxGeometry(signW, 0.64, 0.18);
  const faceGeo = new THREE.PlaneGeometry(signW - 0.1, 0.56);
  const rodGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.05, 8);
  const zSign = runLength * 0.5 + 0.35;
  const ySign = Math.min(3.55, riseHeight - 0.65);
  const frame = new THREE.Mesh(frameGeo, mats.clockFrame);
  frame.position.set(0, ySign, zSign);
  const frontFace = new THREE.Mesh(faceGeo, mats.exitSign);
  frontFace.position.set(0, ySign, zSign + 0.095);
  const rearFace = new THREE.Mesh(faceGeo, mats.exitSign);
  rearFace.position.set(0, ySign, zSign - 0.095);
  rearFace.rotation.y = Math.PI;
  const rodL = new THREE.Mesh(rodGeo, mats.benchMetal);
  rodL.position.set(-signW * 0.38, ySign + 0.82, zSign);
  const rodR = new THREE.Mesh(rodGeo, mats.benchMetal);
  rodR.position.set(signW * 0.38, ySign + 0.82, zSign);
  escGroup.add(frame, frontFace, rearFace, rodL, rodR);
  disposables.push(frameGeo, faceGeo, rodGeo);
}

function addEscalatorBalustrades(
  escGroup: THREE.Group, totalWidth: number, riseHeight: number, slopeLen: number,
  pitchRad: number, mats: IStationFurnitureMaterials, disposables: Array<{ dispose(): void }>,
): void {
  const sideBalGeo = new THREE.BoxGeometry(0.08, 0.92, slopeLen);
  const railGeo = new THREE.BoxGeometry(0.12, 0.09, slopeLen + 0.4);
  const balOffsets = totalWidth > 2.0 ? [-totalWidth * 0.5, 0, totalWidth * 0.5] : [-totalWidth * 0.5, totalWidth * 0.5];
  balOffsets.forEach((bx) => {
    const bal = new THREE.Mesh(sideBalGeo, mats.escalatorGlass);
    bal.position.set(bx, riseHeight * 0.5 + 0.62, 0);
    bal.rotation.x = pitchRad;
    const rail = new THREE.Mesh(railGeo, mats.handrailBlack);
    rail.position.set(bx, riseHeight * 0.5 + 1.1, 0);
    rail.rotation.x = pitchRad;
    escGroup.add(bal, rail);
  });
  disposables.push(sideBalGeo, railGeo);
}
