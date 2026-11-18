import { ComponentProps } from 'react';
import { StyleSheet, Text as RNText, TextInput as RNTextInput, TextProps, TextStyle } from 'react-native';

/**
 * Noto Kufi Arabic everywhere (Kurdish, Arabic and English). Phones need one font file per weight,
 * so the weight in a style is turned into the matching font family.
 */
export const FONT_FILES = {
  NotoKufiArabic_400Regular: require('@expo-google-fonts/noto-kufi-arabic/400Regular/NotoKufiArabic_400Regular.ttf'),
  NotoKufiArabic_500Medium: require('@expo-google-fonts/noto-kufi-arabic/500Medium/NotoKufiArabic_500Medium.ttf'),
  NotoKufiArabic_600SemiBold: require('@expo-google-fonts/noto-kufi-arabic/600SemiBold/NotoKufiArabic_600SemiBold.ttf'),
  NotoKufiArabic_700Bold: require('@expo-google-fonts/noto-kufi-arabic/700Bold/NotoKufiArabic_700Bold.ttf'),
  NotoKufiArabic_800ExtraBold: require('@expo-google-fonts/noto-kufi-arabic/800ExtraBold/NotoKufiArabic_800ExtraBold.ttf'),
};

function family(weight: TextStyle['fontWeight']): string {
  switch (String(weight ?? '400')) {
    case '500': return 'NotoKufiArabic_500Medium';
    case '600': return 'NotoKufiArabic_600SemiBold';
    case '700': case 'bold': return 'NotoKufiArabic_700Bold';
    case '800': case '900': return 'NotoKufiArabic_800ExtraBold';
    default: return 'NotoKufiArabic_400Regular';
  }
}

const withFont = (style: TextProps['style']) => {
  const flat = StyleSheet.flatten(style) ?? {};
  // Kufi letters are tall; a little extra line height keeps Kurdish/Arabic marks from clipping.
  return { ...flat, fontFamily: family(flat.fontWeight), fontWeight: 'normal' as const };
};

export function Text(props: ComponentProps<typeof RNText>) {
  return <RNText {...props} style={withFont(props.style)} />;
}

export function TextInput(props: ComponentProps<typeof RNTextInput>) {
  return <RNTextInput {...props} style={withFont(props.style as TextProps['style'])} />;
}
