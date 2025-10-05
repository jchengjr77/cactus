import { Redirect } from "expo-router";

export default function Index() {
  // TODO: Check if user is authenticated, if so redirect to /(tabs)
  // For now, always redirect to login
  return <Redirect href='/(tabs)' />;
}
