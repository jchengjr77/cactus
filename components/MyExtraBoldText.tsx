import { Fonts } from "@/constants/theme";
import { StyleSheet, Text, TextProps } from "react-native";

export default function MyBoldText(props: TextProps) {
  const { style, ...otherProps } = props;

  return (
    <Text
      {...otherProps}
      style={[styles.extrabold, style]}
    />
  );
}

const styles = StyleSheet.create({
  extrabold: {
    fontFamily: Fonts.extrabold,
  },
});
