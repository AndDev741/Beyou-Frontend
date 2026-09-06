import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

export interface FieldMarkerProps {
  /** The server refuses the form without this field. Draws the accent asterisk. */
  required?: boolean;
  /** The field may stay empty. Writes "optional" after the label, muted. */
  optional?: boolean;
}

interface FieldLabelProps extends FieldMarkerProps {
  children: string;
  className?: string;
  testID?: string;
}

/**
 * The label above a control, in the web's typography, with the field's standing spelled
 * out: an accent asterisk when the server will refuse the form without it, a muted
 * "optional" when it may stay empty. One marker per field, never both, and a field with
 * neither flag draws a bare label (read-only fields, group headings).
 *
 * The marker is a SIBLING Text, not nested in the label's Text: nested, it would join
 * the label's string, so `getByText('Name')` and a screen reader would both meet
 * "Name *". The standing reaches assistive tech through the validation messages.
 *
 * Every mobile label renderer (`FormField`, `Input`, `IconPickerField`, `DateField`,
 * `TimeField`) goes through here so the convention lives in one file. The web's
 * `FormLabel` is the same component in the DOM.
 */
export default function FieldLabel({ children, required, optional, className = '', testID }: FieldLabelProps) {
  const { t } = useTranslation();
  return (
    <View className={`mb-1.5 flex-row items-baseline gap-1 ${className}`} testID={testID}>
      <Text className="text-[12.5px] font-semibold text-text-2">{children}</Text>
      {required ? (
        <Text
          className="text-[12.5px] font-semibold text-accent"
          accessibilityElementsHidden
          importantForAccessibility="no"
          testID={testID ? `${testID}-required` : undefined}
        >
          *
        </Text>
      ) : optional ? (
        <Text className="font-mono text-[10.5px] text-text-3" testID={testID ? `${testID}-optional` : undefined}>
          · {t('FieldOptional')}
        </Text>
      ) : null}
    </View>
  );
}
