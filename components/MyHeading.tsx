import { Fonts } from "@/constants/theme";
import { StyleSheet, Text, TextProps } from "react-native";

export default function MyHeading(props: TextProps) {
  const { style, ...otherProps } = props;

  return (
    <Text
      {...otherProps}
      style={[styles.heading, style]}
    />
  );
}

const styles = StyleSheet.create({
  heading: {
    fontFamily: Fonts.extrabold,
  },
});
