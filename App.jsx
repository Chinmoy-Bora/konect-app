import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ImageBackground,
  Alert,
  Vibration,
  PermissionsAndroid
} from 'react-native';
import axios from 'axios';
import messaging from '@react-native-firebase/messaging';
import LottieView from 'lottie-react-native';
import Sound from 'react-native-sound';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';



function App() {
  const [text, onChangeText] = useState('');
  const [deviceToken, setDeviceToken] = useState('');
  const [registerState, setRegisterState] = useState(false);
  const [animationDone, setAnimationDone] = useState(false); // New state
  const [session , setSession] = useState('');

  useEffect(() => {
    const requestNotificationPermission = async () => {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.log("Notification permission denied");
        }
      } catch (err) {
        console.warn(err);
      }
    };
  
    requestNotificationPermission();
  }, []);


  const checkDeviceConnection = async () => {
    console.log(deviceToken)
    try {
      const response = await axios.post("https://konect-backend.onrender.com/check-device", {
        deviceToken: deviceToken,
      });
  
      if (response.data.connected) {
        setRegisterState(true);
        setAnimationDone(true);
        setSession(response.data.sessionCodes[0]);
      } else {
        setRegisterState(false);
      }
    } catch (error) {
      if (error.response) {
        // Server responded with a status other than 2xx
        console.error("Error checking connection:", error.response.data);
        console.error("Status Code:", error.response.status);
        console.error("Headers:", error.response.headers);
      } else if (error.request) {
        // No response received
        console.error("No response from backend:", error.request);
      } else {
        // Other errors
        console.error("Error:", error.message);
      }
    }
  };
  
  

  useEffect(() => {
    requestUserPermission();
    getToken(); // This will set the deviceToken state when completed
  }, []);

  useEffect(() => {
    if (deviceToken) {
      checkDeviceConnection(); // Ensures deviceToken is available before making the request
    }
  }, [deviceToken]);

  const playRingtone = () => {
    const ringtone = new Sound('sound_2.mp3', Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        console.log("Failed to load the ringtone", error);
        return;
      }
      ringtone.play((success) => {
        if (!success) {
          console.log("Ringtone playback failed");
        }
        ringtone.release(); // Release memory after playback
      });
    });
  };
  


  useEffect(() => {
    // Foreground Notifications (App is Open)
    const unsubscribeOnMessage = messaging().onMessage(async remoteMessage => {
      console.log('📩 Notification received in foreground:', remoteMessage);
  
      // Vibrate on notification received
      Vibration.vibrate([500,200,500]);
      playRingtone();
  
      // Show alert
      Alert.alert(
        remoteMessage.notification?.title || "New Notification",
        remoteMessage.notification?.body || "You have a new message!"
      );
    });
  
    // Background & Quit State Handling
    const unsubscribeOnNotificationOpened = messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('📩 Notification clicked while in background:', remoteMessage);
  
      // Vibrate on notification tap
      Vibration.vibrate([500,200,500]);
      playRingtone();
  
      Alert.alert(
        remoteMessage.notification?.title || "Opened Notification",
        remoteMessage.notification?.body || "You tapped a notification!"
      );
    });
  
    // App Opened from a Notification (Cold Start)
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('📩 App opened from notification (quit state):', remoteMessage);
  
          // Vibrate when app opens from a notification
          Vibration.vibrate([500,200,500]);
          playRingtone();
  
          Alert.alert(
            remoteMessage.notification?.title || "App Opened from Notification",
            remoteMessage.notification?.body || "You opened the app via a notification!"
          );
        }
      });
  
    return () => {
      unsubscribeOnMessage();
      unsubscribeOnNotificationOpened();
    };
  }, []);

  const handleConnect = async () => {
    try {
      const response = await axios.post('https://konect-backend.onrender.com/register', {
        sessionCode: text,
        deviceToken: deviceToken,
      });
      console.log('Response:', response.data);
      setRegisterState(true);
      setSession(text);
    } catch (error) {
      console.error('Error connecting:', error);
    }
  };

  const handleAlert = async () => {
    console.log("Sending request:", { sessionCode: text, senderToken: "deviceToken" });
  
    try {
      const response = await axios.post(
        "https://konect-backend.onrender.com/trigger-alert",
        {
          sessionCode: session,
          senderToken: deviceToken,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );
  
      console.log("Response:", response.data);
    } catch (error) {
      console.error("Full Error:", error);
  
      if (error.response) {
        console.error("Error Data:", error.response.data);
        console.error("Error Status:", error.response.status);
      } else {
        console.error("Error Message:", error.message);
      }
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Confirm Disconnect",
      "Are you sure you want to disconnect?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Disconnect",
          onPress: async () => {
            try {
              await axios.post("https://konect-backend.onrender.com/remove-device", {
                deviceToken: deviceToken,
              });
  
              setRegisterState(false);
              onChangeText('');
              setAnimationDone(false);
  
              console.log("Logged out successfully");
            } catch (error) {
              console.error("Logout error:", error);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };
  

  

  async function requestUserPermission() {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Authorization status:', authStatus);
    }
  }

  const getToken = async () => {
    const token = await messaging().getToken();
    console.log('Token:', token);
    setDeviceToken(token);
  };



  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ImageBackground
        source={require('/Users/chinmoybora/Academics/konect/konect/asset/download.png')}
        style={styles.backgroundImage}>
                  {/* Logout Button (Visible After Registration) */}
        {registerState && (
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <MaterialIcons name="logout" size={35} color="#fff" />
          </TouchableOpacity>
        )}
        
        <View style={styles.div}>
          {registerState ? (
            <>
              {/* Success Animation */}
              {!animationDone && (
                <LottieView
                  source={require('./asset/Animation-2.json')}
                  autoPlay
                  loop={false}
                  style={styles.lottie}
                  onAnimationFinish={() => setAnimationDone(true)} // Detect when animation finishes
                />
              )}

              {/* Round Animated Button (Only After Animation Completes) */}
              {animationDone && (
                <TouchableOpacity 
                  style={styles.roundButtonContainer} 
                  onPress={handleAlert}
                >
                  <LottieView
                    source={require('./asset/Animation-4.json')} // Your Lottie button
                    autoPlay
                    loop
                    style={styles.roundButton}
                  />
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              <TextInput
                style={styles.input}
                onChangeText={onChangeText}
                value={text}
                placeholder="Enter code to your heart..."
                placeholderTextColor={'#BCCCDC'}
              />
              <TouchableOpacity
                style={styles.btn}
                onPress={handleConnect}>
                <Text style={{ color: '#fff' }}>Connect</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

      </ImageBackground>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#B7B1F2',
    height: '100%',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  div: {
    height: '50%',
    width: '80%',
    backgroundColor: '#FBFBFB',
    borderRadius: 40,
    alignItems: 'center',
    paddingTop: 140,
  },
  input: {
    width: '80%',
    height: 40,
    margin: 12,
    borderRadius: 20,
    backgroundColor: '#FFF2C2',
    paddingLeft: 30,
    color: '#000',
  },
  btn: {
    backgroundColor: '#FDB7EA',
    width: '40%',
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  lottie: {
    width: 150,
    height: 150,
  },
  roundButtonContainer: {
    marginTop: 10, // Spacing between success animation and button
  },
  roundButton: {
    width: 160,
    height: 160,
  },
  logoutButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    borderRadius: 50,
    padding: 10,
    zIndex: 10,
  },
});

export default App;