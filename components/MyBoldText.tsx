import { Text, TextProps, StyleSheet } from "react-native";
import { Fonts } from "@/constants/theme";

export default function MyBoldText(props: TextProps) {
  const { style, ...otherProps } = props;

  return (
    <Text
      {...otherProps}
      style={[styles.bold, style]}
    />
  );
}

const styles = StyleSheet.create({
  bold: {
    fontFamily: Fonts.bold,
  },
});
