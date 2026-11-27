import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DOOH_ROTATION_INTERVAL_SEC,
  getDoohSlideIndex,
  getStationAdAssignment,
  isDoohStation,
  METRO_AD_CAMPAIGNS,
} from './metroAdsCatalog';
import type { IStationSpec } from './types';

function makeStation(name: string, distanceM: number): IStationSpec {
  return {
    id: 1,
    code: 'A13',
    name,
    distanceM,
    stopZoneHalfWidthM: 6,
    platformLengthM: 120,
    platformLayout: 'island',
    platformSide: 'left',
    accentHex: 0x2563eb,
    wallBaseHex: 0x1e293b,
    waitingPassengers: 18,
  };
}

describe('metroAdsCatalog', () => {
  it('provides 10 complete bilingual (PL/EN) fictional metro ad campaigns', () => {
    assert.equal(METRO_AD_CAMPAIGNS.length, 10);
    for (const ad of METRO_AD_CAMPAIGNS) {
      assert.ok(ad.titlePl.length > 0);
      assert.ok(ad.titleEn.length > 0);
      assert.ok(ad.taglinePl.length > 0);
      assert.ok(ad.taglineEn.length > 0);
      assert.ok(ad.bgStartHex.startsWith('#'));
      assert.ok(ad.accentHex.startsWith('#'));
    }
  });

  it('enables DOOH digital screens on major hub stations', () => {
    assert.equal(isDoohStation(makeStation('A13 Centrum', 11000), 1), true);
    assert.equal(isDoohStation(makeStation('A14 Świętokrzyska', 11700), 3), true);
    assert.equal(isDoohStation(makeStation('C9 Rondo Daszyńskiego', 4200), 5), true);
    assert.equal(isDoohStation(makeStation('C15 Dworzec Wileński', 9500), 7), true);
    assert.equal(isDoohStation(makeStation('A23 Młociny', 23100), 9), true);
  });

  it('rotates DOOH slide index every 8 seconds and offsets distinct DOOH slots', () => {
    const t0Slot0 = getDoohSlideIndex(0, 0);
    const t7Slot0 = getDoohSlideIndex(DOOH_ROTATION_INTERVAL_SEC - 0.1, 0);
    const t8Slot0 = getDoohSlideIndex(DOOH_ROTATION_INTERVAL_SEC + 0.1, 0);
    const t0Slot1 = getDoohSlideIndex(0, 1);

    assert.equal(t0Slot0, t7Slot0);
    assert.equal(t8Slot0, (t0Slot0 + 1) % METRO_AD_CAMPAIGNS.length);
    assert.notEqual(t0Slot0, t0Slot1);
  });

  it('assigns deterministic banner and citylight indices per station', () => {
    const st = makeStation('A11 Politechnika', 9400);
    const assign = getStationAdAssignment(st, 4);
    assert.equal(assign.bannerIndices.length, 4);
    assert.equal(assign.citylightIndices.length, 3);
    assert.equal(assign.hasDoohScreens, true);
  });
});
