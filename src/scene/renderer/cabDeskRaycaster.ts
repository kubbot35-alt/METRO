import * as THREE from 'three';
import type { CabControlId, ICabHoverTooltip } from '../../domain/cabControlsCatalog';
import type { ISceneRendererContext } from './rendererContext';

const HOVER_THROTTLE_MS = 45;

export interface ICabDeskRaycaster {
  handlePointerMove(ctx: ISceneRendererContext, event: PointerEvent): void;
  handlePointerDown(ctx: ISceneRendererContext, event: PointerEvent): boolean;
  clearHover(ctx: ISceneRendererContext): void;
}

export class CabDeskRaycaster implements ICabDeskRaycaster {
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointerNdc = new THREE.Vector2();
  private lastMoveMs = 0;
  private lastHoveredId: CabControlId | null = null;

  public handlePointerMove(ctx: ISceneRendererContext, event: PointerEvent): void {
    const now = performance.now();
    if (now - this.lastMoveMs < HOVER_THROTTLE_MS) return;
    this.lastMoveMs = now;
    const hitId = this.pickControlAtPointer(ctx, event);
    if (ctx.renderer) {
      ctx.renderer.domElement.style.cursor = hitId ? 'pointer' : '';
    }
    if (!hitId) {
      if (this.lastHoveredId !== null) {
        this.lastHoveredId = null;
        ctx.onCabControlHover?.(null);
      }
      return;
    }
    this.lastHoveredId = hitId;
    const tooltip: ICabHoverTooltip = { controlId: hitId, screenX: event.clientX, screenY: event.clientY };
    ctx.onCabControlHover?.(tooltip);
  }

  public handlePointerDown(ctx: ISceneRendererContext, event: PointerEvent): boolean {
    if (event.button !== 0) return false;
    const hitId = this.pickControlAtPointer(ctx, event);
    if (!hitId) return false;
    ctx.onCabControlClick?.(hitId);
    return true;
  }

  public clearHover(ctx: ISceneRendererContext): void {
    if (this.lastHoveredId !== null) {
      this.lastHoveredId = null;
      ctx.onCabControlHover?.(null);
    }
    if (ctx.renderer) ctx.renderer.domElement.style.cursor = '';
  }

  private pickControlAtPointer(ctx: ISceneRendererContext, event: PointerEvent): CabControlId | null {
    const snap = ctx.lastSnapshot;
    if (!snap || snap.phase !== 'playing' || snap.cameraMode !== 'cab') return null;
    if (!ctx.renderer || !ctx.camera || !ctx.cabRig) return null;
    const targets = ctx.cabRig.getActiveInteractiveControls?.() ?? [];
    if (targets.length === 0) return null;
    const rect = ctx.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    this.pointerNdc.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -(((event.clientY - rect.top) / rect.height) * 2 - 1),
    );
    this.raycaster.setFromCamera(this.pointerNdc, ctx.camera);
    const hits = this.raycaster.intersectObjects([...targets], false);
    const id = hits[0]?.object.userData.cabControlId;
    return typeof id === 'string' ? (id as CabControlId) : null;
  }
}
