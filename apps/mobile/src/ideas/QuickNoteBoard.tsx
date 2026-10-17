import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { noteColors } from '@beyou/state';
import type { QuickNote } from '@beyou/types/quickNote/quickNote';
import { useBeyouTheme } from '../theme/ThemeProvider';
import {
  FIT_PADDING,
  centerOn,
  fitView,
  layerTransform,
  noteAt,
  type BoardView,
  type Point,
  type Size,
} from './boardMath';
import QuickNoteCard, { NoteFace } from './QuickNoteCard';
import { useBoardGestures } from './useBoardGestures';

export type QuickNoteBoardHandle = {
  /**
   * Every note on screen. Pass the notes when they come straight from a server answer: the board
   * has not re-rendered with them yet.
   */
  fit: (notes?: readonly QuickNote[]) => void;
  /** Brings one note to the middle at the current zoom. */
  centerOn: (note: Pick<QuickNote, 'x' | 'y'>) => void;
};

interface QuickNoteBoardProps {
  /** Back to front, the order the slice keeps them in. */
  notes: QuickNote[];
  /** The first load landed: the board fits the notes once, as soon as it also knows its size. */
  ready: boolean;
  onOpen: (note: QuickNote) => void;
  /** A note let go somewhere new, with its new top-left corner in board units. */
  onDrop: (id: string, at: Point) => void;
  /** A tap on empty board (the screen drops the keyboard). */
  onEmptyTap?: () => void;
  /** Drawn over the board (the empty state, a spinner). They take no touches. */
  children?: ReactNode;
  ref?: Ref<QuickNoteBoardHandle>;
}

const MOVE = { duration: 220 };
/** The lifted note grows a touch, so the finger holding it can tell it came up. */
const LIFT_SCALE = 1.04;

/**
 * The free board: notes where they were dropped, pan with one finger, pinch to zoom, hold a note
 * to drag it (see boardGestures for the full list).
 *
 * Kept smooth at 200 notes by never re-rendering them for a gesture. Pan and zoom live in shared
 * values that transform the one layer holding every note; a drag hides the note in place and
 * moves a single stand-in on top. The view itself is kept in a ref as well, so the JS side never
 * reads a shared value back.
 */
export default function QuickNoteBoard({ notes, ready, onOpen, onDrop, onEmptyTap, children, ref }: QuickNoteBoardProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const paints = useMemo(() => noteColors(theme.base), [theme.base]);

  const notesRef = useRef(notes);
  notesRef.current = notes;
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  const [size, setSize] = useState<Size | null>(null);
  const sizeRef = useRef<Size>({ width: 0, height: 0 });
  const view = useRef<BoardView>({ x: FIT_PADDING, y: FIT_PADDING, scale: 1 });

  const tx = useSharedValue(view.current.x);
  const ty = useSharedValue(view.current.y);
  const scale = useSharedValue(view.current.scale);
  const layerWidth = useSharedValue(0);
  const layerHeight = useSharedValue(0);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const lifted = useSharedValue(1);
  const [dragId, setDragId] = useState<string | null>(null);

  const applyView = useCallback(
    (next: BoardView, animate = false) => {
      view.current = next;
      tx.value = animate ? withTiming(next.x, MOVE) : next.x;
      ty.value = animate ? withTiming(next.y, MOVE) : next.y;
      scale.value = animate ? withTiming(next.scale, MOVE) : next.scale;
    },
    [tx, ty, scale],
  );

  const layerStyle = useAnimatedStyle(() => ({
    transform: layerTransform(tx.value, ty.value, scale.value, layerWidth.value, layerHeight.value),
  }));
  const ghostStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dragX.value }, { translateY: dragY.value }, { scale: lifted.value }],
  }));

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    sizeRef.current = { width, height };
    layerWidth.value = width;
    layerHeight.value = height;
    setSize((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }));
  };

  // Opens fitted to the notes, once. Later loads (the assistant, a refresh) leave the view alone:
  // the board jumping under someone who is reading it is worse than a new note off screen.
  const fitted = useRef(false);
  useEffect(() => {
    if (!ready || !size || fitted.current) return;
    fitted.current = true;
    applyView(fitView(notesRef.current, size));
  }, [ready, size, applyView]);

  useImperativeHandle(
    ref,
    () => ({
      fit: (next) => applyView(fitView(next ?? notesRef.current, sizeRef.current), true),
      centerOn: (note) => applyView(centerOn(note, sizeRef.current, view.current.scale), true),
    }),
    [applyView],
  );

  const gestures = useBoardGestures({
    getView: () => view.current,
    setView: (next) => applyView(next),
    hitTest: (point) => noteAt(notesRef.current, view.current, point)?.id ?? null,
    onTap: (id) => {
      const note = id ? notesRef.current.find((item) => item.id === id) : undefined;
      if (note) onOpenRef.current(note);
      else onEmptyTap?.();
    },
    onDragStart: (id) => {
      dragX.value = 0;
      dragY.value = 0;
      lifted.value = withTiming(LIFT_SCALE, { duration: 120 });
      setDragId(id);
    },
    onDragMove: (delta) => {
      dragX.value = delta.x;
      dragY.value = delta.y;
    },
    onDragEnd: (id, delta, committed) => {
      const note = notesRef.current.find((item) => item.id === id);
      // A hold let go where it was is not a move: nothing to save.
      const moved = Math.abs(delta.x) >= 1 || Math.abs(delta.y) >= 1;
      if (committed && note && moved) onDrop(id, { x: note.x + delta.x, y: note.y + delta.y });
      lifted.value = 1;
      setDragId(null);
    },
  });

  const openById = useCallback((id: string) => {
    const note = notesRef.current.find((item) => item.id === id);
    if (note) onOpenRef.current(note);
  }, []);

  // Built only when the notes, the theme or the dragged note change. Typing in the capture field
  // re-renders the screen on every key, and that must not walk 200 notes.
  const cards = useMemo(
    () =>
      notes.map((note) => (
        <QuickNoteCard
          key={note.id}
          note={note}
          paint={paints[note.color]}
          hidden={note.id === dragId}
          onActivate={openById}
        />
      )),
    [notes, paints, dragId, openById],
  );

  const dragged = dragId ? notes.find((note) => note.id === dragId) : undefined;

  return (
    <View
      style={styles.board}
      className="bg-surface-2"
      onLayout={onLayout}
      collapsable={false}
      accessibilityLabel={t('IdeasBoardLabel')}
      testID="ideas-board"
      {...gestures}
    >
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, layerStyle]} testID="ideas-board-layer">
        {cards}
        {dragged ? (
          <Animated.View
            style={[styles.ghost, { left: dragged.x, top: dragged.y }, ghostStyle]}
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
            testID="ideas-drag-ghost"
          >
            <NoteFace text={dragged.text} paint={paints[dragged.color]} />
          </Animated.View>
        ) : null}
      </Animated.View>
      {children ? (
        // `none`, not `box-none`: a touch landing on an overlay would make it the target, and the
        // board reads positions relative to the target (see useBoardGestures).
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {children}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  board: { flex: 1, overflow: 'hidden' },
  ghost: {
    position: 'absolute',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
});
