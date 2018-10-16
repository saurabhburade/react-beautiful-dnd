// @flow
import type { Position } from 'css-box-model';
import getDragImpact from '../../get-drag-impact';
import { add, subtract } from '../../position';
import getDimensionMapWithPlaceholder from './util/get-dimension-map-with-placeholder';
import getUserDirection from '../../user-direction/get-user-direction';
import type {
  DraggableDimension,
  DraggingState,
  ClientPositions,
  PagePositions,
  DragPositions,
  DragImpact,
  Viewport,
  DimensionMap,
  UserDirection,
  StateWhenUpdatesAllowed,
} from '../../../types';

type Args = {|
  state: StateWhenUpdatesAllowed,
  clientSelection?: Position,
  dimensions?: DimensionMap,
  viewport?: Viewport,
  // force a custom drag impact
  impact?: ?DragImpact,
  // provide a scroll jump request (optionally provided - and can be null)
  scrollJumpRequest?: ?Position,
|};

export default ({
  state,
  clientSelection: forcedClientSelection,
  dimensions: forcedDimensions,
  viewport: forcedViewport,
  impact: forcedImpact,
  scrollJumpRequest,
}: Args): StateWhenUpdatesAllowed => {
  // DRAGGING: can update position and impact
  // COLLECTING: can update position but cannot update impact

  const viewport: Viewport = forcedViewport || state.viewport;
  const currentWindowScroll: Position = viewport.scroll.current;
  const dimensions: DimensionMap = forcedDimensions || state.dimensions;
  const clientSelection: Position =
    forcedClientSelection || state.current.client.selection;

  const offset: Position = subtract(
    clientSelection,
    state.initial.client.selection,
  );

  const client: ClientPositions = {
    offset,
    selection: clientSelection,
    borderBoxCenter: add(state.initial.client.borderBoxCenter, offset),
  };

  const page: PagePositions = {
    selection: add(client.selection, currentWindowScroll),
    borderBoxCenter: add(client.borderBoxCenter, currentWindowScroll),
  };

  const current: DragPositions = {
    client,
    page,
  };

  const userDirection: UserDirection = getUserDirection(
    state.userDirection,
    state.current.page.borderBoxCenter,
    current.page.borderBoxCenter,
  );

  // Not updating impact while bulk collecting
  if (state.phase === 'COLLECTING') {
    return {
      // adding phase to appease flow (even though it will be overwritten by spread)
      phase: 'COLLECTING',
      ...state,
      dimensions,
      viewport,
      current,
      userDirection,
    };
  }

  const draggable: DraggableDimension =
    state.dimensions.draggables[state.critical.draggable.id];

  const newImpact: DragImpact =
    forcedImpact ||
    getDragImpact({
      pageBorderBoxCenter: page.borderBoxCenter,
      draggable,
      draggables: state.dimensions.draggables,
      droppables: state.dimensions.droppables,
      previousImpact: state.impact,
      viewport,
      userDirection,
    });

  const withUpdatedPlaceholders: DimensionMap = getDimensionMapWithPlaceholder({
    draggable,
    impact: newImpact,
    previousImpact: state.impact,
    dimensions,
  });

  // dragging!
  const result: DraggingState = {
    ...state,
    current,
    userDirection,
    dimensions: withUpdatedPlaceholders,
    impact: newImpact,
    scrollJumpRequest: scrollJumpRequest || null,
    viewport,
    forceShouldAnimate: null,
  };

  return result;
};
