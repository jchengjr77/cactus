import { Text, TextProps, StyleSheet } from "react-native";
import { Fonts } from "@/constants/theme";

export default function MySemiBoldText(props: TextProps) {
  const { style, ...otherProps } = props;

  return (
    <Text
      {...otherProps}
      style={[styles.semibold, style]}
    />
  );
}

const styles = StyleSheet.create({
  semibold: {
    fontFamily: Fonts.semibold,
  },
});
