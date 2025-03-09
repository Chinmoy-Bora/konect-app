/**
 * @format
 */

import { AppRegistry, Linking } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';

// Function to play notification sound immediately
const playNotificationSound = async () => {
  try {
    await notifee.createChannel({
      id: 'default',
      name: 'Default Channel',
      sound: 'sound_2', // Ensure sound_2.mp3 is placed in android/app/src/main/res/raw/
      importance: AndroidImportance.HIGH,
    });

    // Trigger notification sound immediately
    await notifee.displayNotification({
      title: 'Incoming Alert!',
      body: 'You have a new important message!',
      android: {
        channelId: 'default',
        sound: 'sound_2', // Ensure this matches the filename in res/raw/
        importance: AndroidImportance.HIGH,
        pressAction: {
          id: 'default',
        },
      },
    });
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
};

// Function to launch the app when a notification arrives
const openApp = async () => {
  try {
    console.log('🚀 Opening App Automatically...');
    Linking.openURL('myapp://notification'); // Replace with your deep link scheme
  } catch (error) {
    console.error('Failed to open app:', error);
  }
};

// Background Message Handler
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('📩 Background notification received:', remoteMessage);

  // Open the app automatically
  await openApp();

  // Immediately play the sound
  await playNotificationSound();
});

// Foreground Notification Handler
messaging().onMessage(async (remoteMessage) => {
  console.log('📩 Foreground notification received:', remoteMessage);

  // Immediately play the sound
  await playNotificationSound();
});

// Background Event Handling (Handles Notification Press)
notifee.onBackgroundEvent(async ({ type, detail }) => {
  console.log('🔥 Background Event:', type, detail);

  if (type === EventType.PRESS) {
    console.log('🔔 Notification Clicked:', detail.notification);
    await openApp(); // Open the app when the notification is clicked
  }
});

AppRegistry.registerComponent(appName, () => App);
