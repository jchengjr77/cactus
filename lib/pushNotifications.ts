import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register for push notifications and get the Expo push token
 * @returns The Expo push token or null if registration failed
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    try {
      // Get project ID from expo constants
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;

      const pushToken = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });
      token = pushToken.data;
    } catch (error) {
      console.error('Error getting push token:', error);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

/**
 * Save the push token to the user's profile in the database
 * @param userId The user's ID
 * @param pushToken The Expo push token
 */
export async function savePushToken(userId: number, pushToken: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ push_token: pushToken })
      .eq('id', userId);

    if (error) {
      console.error('Error saving push token:', error);
    }
  } catch (error) {
    console.error('Exception saving push token:', error);
  }
}

/**
 * Remove the push token from the user's profile (e.g., on logout)
 * @param userId The user's ID
 */
export async function removePushToken(userId: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ push_token: null })
      .eq('id', userId);

    if (error) {
      console.error('Error removing push token:', error);
    }
  } catch (error) {
    console.error('Exception removing push token:', error);
  }
}
