import { SkodaVarsovia } from '../models/SkodaVarsovia';
import type { DoorSide, ITrainVisualProfile, MetroLineId } from '../domain/types';
import { BaseTrainConsist, type ITrainConsist } from './shared/baseTrainConsist';

const DEFAULT_VARSOVIA_COLORS = {
  body: 0xf2f4f7,
  roof: 0xb5bcc4,
  red: 0xd61f2c,
  yellow: 0xf5c71a,
} as const;

const VARSOVIA_TRACK_OFFSET_Y = 0.16;
const VARSOVIA_TRACK_OFFSET_Z = 59.0;

function applyVarsoviaLivery(varsovia: SkodaVarsovia, visual: ITrainVisualProfile): void {
  const m = varsovia.materials;
  const liveryId = visual.liveryId ?? 'default';
  if (liveryId === 'default') {
    m.whiteBody.color.setHex(DEFAULT_VARSOVIA_COLORS.body);
    m.whiteBody.roughness = 0.28;
    m.whiteBody.metalness = 0.08;
    m.roofSilver.color.setHex(DEFAULT_VARSOVIA_COLORS.roof);
    m.warsawRed.color.setHex(DEFAULT_VARSOVIA_COLORS.red);
    m.warsawRed.emissive.setHex(0x000000);
    m.warsawRed.emissiveIntensity = 0;
    m.warsawYellow.color.setHex(DEFAULT_VARSOVIA_COLORS.yellow);
    return;
  }
  applyCustomVarsoviaLivery(m, visual, liveryId);
}

function applyCustomVarsoviaLivery(
  m: SkodaVarsovia['materials'],
  visual: ITrainVisualProfile,
  liveryId: string,
): void {
  const isStealth = liveryId === 'stealth_night';
  const isGold = liveryId === 'golden_legend';
  m.whiteBody.color.setHex(visual.bodyHex);
  m.whiteBody.roughness = isStealth ? 0.56 : isGold ? 0.22 : 0.28;
  m.whiteBody.metalness = isStealth ? 0.25 : isGold ? 0.72 : 0.08;
  m.roofSilver.color.setHex(visual.roofHex);
  m.warsawRed.color.setHex(visual.stripeHex);
  m.warsawRed.emissive.setHex(isStealth ? 0xff1e42 : 0x000000);
  m.warsawRed.emissiveIntensity = isStealth ? 1.15 : 0;
  m.warsawYellow.color.setHex(visual.noseHex);
}

export class VarsoviaTrainConsist extends BaseTrainConsist {
  private readonly varsovia: SkodaVarsovia;

  public constructor(maxAnisotropy: number, enableSpotLights = true) {
    super('SkodaVarsoviaConsist');
    this.varsovia = new SkodaVarsovia({
      carCount: 6,
      line: 'M1',
      destination: 'MŁOCINY',
      maxAnisotropy,
      enableSpotLights,
    });
    this.varsovia.rotation.y = Math.PI;
    this.varsovia.position.set(0, VARSOVIA_TRACK_OFFSET_Y, VARSOVIA_TRACK_OFFSET_Z);
    this.group.add(this.varsovia);
    this.registerDisposables(this.varsovia);
  }

  public setVisualProfile(visual: ITrainVisualProfile): void {
    applyVarsoviaLivery(this.varsovia, visual);
  }

  public override setDoorsOpen(openSide: DoorSide | null, _dtSec: number): void {
    this.varsovia.setDoors('left', openSide === 'left');
    this.varsovia.setDoors('right', openSide === 'right');
  }

  public setHeadlights(on: boolean): void {
    this.varsovia.setLightsMode(on ? 'forward' : 'parked');
  }

  public setLine(lineId: MetroLineId, destinationLed: string): void {
    this.varsovia.setLedDisplay(lineId, destinationLed);
  }

  public override updateMotion(_speedMs: number, dtSec: number): void {
    this.varsovia.update(Math.min(Math.max(dtSec, 0), 0.1));
  }
}

export function buildVarsoviaConsist(
  maxAnisotropy: number,
  enableSpotLights = true,
): ITrainConsist {
  return new VarsoviaTrainConsist(maxAnisotropy, enableSpotLights);
}
