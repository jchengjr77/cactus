import { Text, TextProps, StyleSheet } from "react-native";
import { Fonts } from "@/constants/theme";

export default function MyText(props: TextProps) {
  const { style, ...otherProps } = props;

  return (
    <Text
      {...otherProps}
      style={[styles.defaultFont, style]}
    />
  );
}

const styles = StyleSheet.create({
  defaultFont: {
    fontFamily: Fonts.default,
  },
});
