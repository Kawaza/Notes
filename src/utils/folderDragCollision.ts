import {
  closestCenter,
  pointerWithin,
  rectIntersection,
  type Collision,
  type CollisionDetection,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  ARCHIVE_DROP_ID,
  FOLDER_ROOT_DROP_ID,
  isNoteFolderDroppableId,
  isParentDropId,
  SORTABLE_FOLDER_PREFIX,
} from '../types';
import { dndLog } from './dndDebug';

function isFolderDropZone(id: string) {
  return id === ARCHIVE_DROP_ID || id === FOLDER_ROOT_DROP_ID || isParentDropId(id);
}

/** Section headers (not the child-list body zone). */
function isSectionHeaderDropZone(id: string) {
  return (
    id === ARCHIVE_DROP_ID ||
    id === FOLDER_ROOT_DROP_ID ||
    (isParentDropId(id) && !id.endsWith('-body'))
  );
}

function isParentBodyDropZone(id: string) {
  return isParentDropId(id) && id.endsWith('-body');
}

function isSortableFolderTarget(id: string, activeId: string) {
  if (id.startsWith(SORTABLE_FOLDER_PREFIX)) return id !== activeId;
  if (isNoteFolderDroppableId(id)) {
    return `${SORTABLE_FOLDER_PREFIX}${id.slice('folder-'.length)}` !== activeId;
  }
  return false;
}

function isFolderRowTarget(id: string) {
  return id.startsWith(SORTABLE_FOLDER_PREFIX) || isNoteFolderDroppableId(id);
}

/** Map note drop ids on folder rows to sortable folder ids during folder drags. */
export function normalizeFolderDragOverId(id: string): string {
  if (
    id === FOLDER_ROOT_DROP_ID ||
    id === ARCHIVE_DROP_ID ||
    isParentDropId(id)
  ) {
    return id;
  }
  if (isNoteFolderDroppableId(id)) {
    return `${SORTABLE_FOLDER_PREFIX}${id.slice('folder-'.length)}`;
  }
  return id;
}

function pickFolderDragTarget(hits: Collision[], activeId: string): Collision[] {
  const headerZone = hits.find((hit) => isSectionHeaderDropZone(String(hit.id)));
  const sortable = hits.find((hit) => isSortableFolderTarget(String(hit.id), activeId));

  // Parent/root/archive headers beat adjacent folder rows (first parent sits under root list).
  if (headerZone && sortable) return [headerZone];
  if (sortable) return [sortable];
  if (headerZone) return [headerZone];

  const bodyZone = hits.find((hit) => isParentBodyDropZone(String(hit.id)));
  if (bodyZone) return [bodyZone];

  const zone = hits.find((hit) => isFolderDropZone(String(hit.id)));
  if (zone) return [zone];

  return hits;
}

function pickNoteDragTarget(hits: Collision[], activeId: string): Collision[] {
  const folderRow = hits.find((hit) => isFolderRowTarget(String(hit.id)));
  if (folderRow) return [folderRow];

  const headerZone = hits.find((hit) => isSectionHeaderDropZone(String(hit.id)));
  if (headerZone) return [headerZone];

  const bodyZone = hits.find((hit) => isParentBodyDropZone(String(hit.id)));
  if (bodyZone) return [bodyZone];

  const zone = hits.find((hit) => isFolderDropZone(String(hit.id)));
  if (zone) return [zone];

  const noteTarget = hits.find((hit) => String(hit.id) !== activeId);
  if (noteTarget) return [noteTarget];

  return hits;
}

function resolveHits(
  args: Parameters<CollisionDetection>[0],
  activeId: string,
  isFolderDrag: boolean,
): Collision[] {
  const pointerHits = pointerWithin(args);
  if (pointerHits.length > 0) {
    const picked = isFolderDrag
      ? pickFolderDragTarget(pointerHits, activeId)
      : pickNoteDragTarget(pointerHits, activeId);
    dndLog('collision:pointerWithin', {
      activeId,
      all: pointerHits.map((h) => h.id),
      picked: picked.map((h) => h.id),
    });
    return picked;
  }

  // Gap between sidebar rows — prefer section headers over closestCenter guessing wrong.
  const rectHits = rectIntersection(args);
  if (rectHits.length > 0) {
    const picked = isFolderDrag
      ? pickFolderDragTarget(rectHits, activeId)
      : pickNoteDragTarget(rectHits, activeId);
    dndLog('collision:rectIntersection', {
      activeId,
      all: rectHits.map((h) => h.id),
      picked: picked.map((h) => h.id),
    });
    return picked;
  }

  const centerHits = closestCenter(args);
  dndLog('collision:closestCenter', {
    activeId,
    picked: centerHits.map((h) => h.id),
  });
  return centerHits;
}

export const folderDragCollisionDetection: CollisionDetection = (args) => {
  const activeId = String(args.active.id);
  const isFolderDrag = activeId.startsWith(SORTABLE_FOLDER_PREFIX);
  return resolveHits(args, activeId, isFolderDrag);
};

/** Prefer folder rows over section drop zones (event.over → lastOver → collisions). */
export function resolveFolderDragOverId(
  event: DragEndEvent,
  lastOverId: string | null,
): string | null {
  const activeId = String(event.active.id);
  const isFolderDrag = activeId.startsWith(SORTABLE_FOLDER_PREFIX);
  const candidates: string[] = [];

  // Prefer last hover — pointer can snap to a different target on release.
  if (lastOverId) candidates.push(normalizeFolderDragOverId(lastOverId));
  if (event.over?.id != null) candidates.push(normalizeFolderDragOverId(String(event.over.id)));

  for (const collision of event.collisions ?? []) {
    if (collision.id != null) candidates.push(normalizeFolderDragOverId(String(collision.id)));
  }

  type TargetKind = 'header-zone' | 'folder-row' | 'body-zone' | 'note';

  const classify = (id: string): TargetKind | null => {
    if (isSectionHeaderDropZone(id)) return 'header-zone';
    if (isFolderRowTarget(id)) return 'folder-row';
    if (isParentBodyDropZone(id)) return 'body-zone';
    if (!isFolderDrag) return 'note';
    return null;
  };

  const priority: TargetKind[] = isFolderDrag
    ? ['header-zone', 'folder-row', 'body-zone']
    : ['folder-row', 'header-zone', 'body-zone', 'note'];

  const seen = new Set<string>();
  for (const kind of priority) {
    for (const id of candidates) {
      if (seen.has(id) || id === activeId) continue;
      if (classify(id) !== kind) continue;
      seen.add(id);
      dndLog('resolveOverId', {
        activeId,
        resolved: id,
        kind,
        eventOver: event.over?.id ?? null,
        lastOverId,
        candidates,
      });
      return id;
    }
  }

  dndLog('resolveOverId → null', {
    activeId,
    eventOver: event.over?.id ?? null,
    lastOverId,
    candidates,
  });
  return null;
}

export function parentOpenStorageKey(parentId: string) {
  return `sidebar-parent-${parentId}-open`;
}

export function expandParentSection(parentId: string) {
  try {
    localStorage.setItem(parentOpenStorageKey(parentId), 'true');
    window.dispatchEvent(new CustomEvent('notes-expand-parent', { detail: parentId }));
  } catch {
    // ignore
  }
}
