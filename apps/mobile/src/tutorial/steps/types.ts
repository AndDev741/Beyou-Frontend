export interface SpotlightStep {
  id: string;
  targetId: string;        // registry id of the View to highlight
  titleKey: string;
  descKey: string;         // imperative copy ("Tap + to create…")
  nextLabelKey?: string;   // default 'TutorialNext'
  disabled?: boolean;      // Next disabled until a data condition flips
  disabledHintKey?: string;// shown under Next when disabled
}
