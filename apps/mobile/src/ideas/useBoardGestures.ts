import { useMemo, useRef } from 'react';
import { PanResponder, type GestureResponderEvent, type GestureResponderHandlers } from 'react-native';
import { createBoardGestures, type BoardGestureCallbacks, type BoardTouch } from './boardGestures';

/**
 * The board's fingers through React Native's own responder system: no gesture-handler, which is
 * not a dependency of the app and would be a new native module.
 *
 * The board layer and its notes are `pointerEvents="none"`, so every touch lands on the board's
 * view itself. That makes the first finger's `locationX` relative to the board, and `pageX -
 * locationX` the board's offset on the page; every later finger is read through `pageX` minus
 * that offset, which stays right on Android where secondary pointers' `locationX` does not.
 *
 * The callbacks are read through a ref, so the responder is built once and a re-render never
 * swaps it out from under a finger.
 */
export function useBoardGestures(callbacks: BoardGestureCallbacks): GestureResponderHandlers {
  const latest = useRef(callbacks);
  latest.current = callbacks;

  return useMemo(() => {
    const gestures = createBoardGestures({
      getView: () => latest.current.getView(),
      setView: (view) => latest.current.setView(view),
      hitTest: (point) => latest.current.hitTest(point),
      onTap: (id) => latest.current.onTap(id),
      onDragStart: (id) => latest.current.onDragStart(id),
      onDragMove: (delta) => latest.current.onDragMove(delta),
      onDragEnd: (id, delta, committed) => latest.current.onDragEnd(id, delta, committed),
    });
    let origin = { x: 0, y: 0 };

    const touchesOf = (event: GestureResponderEvent): BoardTouch[] => {
      const { touches } = event.nativeEvent;
      const list = touches && touches.length > 0 ? touches : [event.nativeEvent];
      return list.map((touch) => ({
        id: touch.identifier,
        x: touch.pageX - origin.x,
        y: touch.pageY - origin.y,
      }));
    };

    /** Fingers still down after an end event, whether or not the platform already dropped the lifted one. */
    const remainingOf = (event: GestureResponderEvent): BoardTouch[] => {
      const lifted = new Set((event.nativeEvent.changedTouches ?? []).map((touch) => touch.identifier));
      return (event.nativeEvent.touches ?? [])
        .filter((touch) => !lifted.has(touch.identifier))
        .map((touch) => ({ id: touch.identifier, x: touch.pageX - origin.x, y: touch.pageY - origin.y }));
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // A drag or a pinch half done is not handed to anyone else.
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (event) => {
        const { pageX, pageY, locationX, locationY } = event.nativeEvent;
        origin = { x: pageX - locationX, y: pageY - locationY };
        gestures.down(touchesOf(event));
      },
      onPanResponderStart: (event) => gestures.down(touchesOf(event)),
      onPanResponderMove: (event) => gestures.move(touchesOf(event)),
      onPanResponderEnd: (event) => gestures.up(remainingOf(event)),
      onPanResponderRelease: () => gestures.up([]),
      onPanResponderTerminate: () => gestures.cancel(),
    }).panHandlers;
  }, []);
}
