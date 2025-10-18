import { TextInput, TextInputProps, StyleSheet } from "react-native";
import { Fonts } from "@/constants/theme";

export default function MyTextInput(props: TextInputProps) {
  const { style, ...otherProps } = props;

  return (
    <TextInput
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
