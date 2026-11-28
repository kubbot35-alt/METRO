import * as THREE from 'three';

export interface IStationAdsSharedResources {
  readonly geometries: readonly THREE.BufferGeometry[];
  readonly materials: readonly THREE.Material[];
}

export interface IStationAdsBuildContext {
  readonly frameMat: THREE.MeshStandardMaterial;
  readonly bezelMat: THREE.MeshStandardMaterial;
  readonly ledDotMat: THREE.MeshBasicMaterial;
  readonly bannerFrameGeo: THREE.BoxGeometry;
  readonly bannerAdGeo: THREE.PlaneGeometry;
  readonly bannerLightBarGeo: THREE.BoxGeometry;
  readonly cityBaseGeo: THREE.BoxGeometry;
  readonly cityCabinetGeo: THREE.BoxGeometry;
  readonly cityPosterGeo: THREE.PlaneGeometry;
  readonly doohHousingGeo: THREE.BoxGeometry;
  readonly doohScreenGeo: THREE.PlaneGeometry;
  readonly doohStrutGeo: THREE.CylinderGeometry;
  readonly doohDotGeo: THREE.BoxGeometry;
}

function buildAdsGeometries() {
  return {
    bannerFrameGeo: new THREE.BoxGeometry(0.14, 2.52, 6.14),
    bannerAdGeo: new THREE.PlaneGeometry(5.88, 2.28),
    bannerLightBarGeo: new THREE.BoxGeometry(0.24, 0.1, 6.2),
    cityBaseGeo: new THREE.BoxGeometry(1.08, 0.28, 0.28),
    cityCabinetGeo: new THREE.BoxGeometry(1.28, 1.86, 0.16),
    cityPosterGeo: new THREE.PlaneGeometry(1.16, 1.72),
    doohHousingGeo: new THREE.BoxGeometry(2.96, 1.68, 0.16),
    doohScreenGeo: new THREE.PlaneGeometry(2.78, 1.5),
    doohStrutGeo: new THREE.CylinderGeometry(0.045, 0.045, 1.85, 8),
    doohDotGeo: new THREE.BoxGeometry(0.12, 0.05, 0.18),
  };
}

export function createStationAdsContext(): { readonly ctx: IStationAdsBuildContext; readonly resources: IStationAdsSharedResources } {
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x18202c, roughness: 0.35, metalness: 0.78 });
  const bezelMat = new THREE.MeshStandardMaterial({ color: 0x090c12, roughness: 0.25, metalness: 0.85 });
  const ledDotMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
  const geos = buildAdsGeometries();
  return {
    ctx: { frameMat, bezelMat, ledDotMat, ...geos },
    resources: { geometries: Object.values(geos), materials: [frameMat, bezelMat, ledDotMat] },
  };
}
