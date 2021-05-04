import { StatusBar } from "expo-status-bar";
import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Image,
  TextInput,
  Modal,
  Pressable,
  Alert,
  Platform,
  ScrollView,
} from "react-native";
import { Button, Divider, Text } from "react-native-elements";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
// import {
//   requestPermissionsAsync,
//   getExpoPushTokenAsync,
// } from "expo-notifications";
import * as firebase from "firebase";
import firebaseA from "firebase/app";
import "firebase/firestore";
import "firebase/auth";
import useFriends from "./utils/useFriends";
import useLetters from "./utils/useLetters";
// import login from "./utils/login";
import signout from "./utils/signout";
// import signup from "./utils/signup";
// import sendMessage from "./utils/sendMessage";

// imports I might be using
import "firebase/functions";
import darkColors from "react-native-elements/dist/config/colorsDark";
//import "firebase/storage";

// firebase setup
const firebaseConfig = {
  apiKey: "AIzaSyDJLpjhdf9FwAjwRgUiAb5nxmee-toGwJs",
  authDomain: "unobli-90b67.firebaseapp.com",
  databaseURL: "https://unobli-90b67.firebaseio.com",
  storageBucket: "unobli-90b67.appspot.com",
  projectId: "unobli-90b67",
};

let firebaseApp = {};

if (!firebase.apps.length) {
  firebaseApp = firebase.initializeApp(firebaseConfig);
} else {
  firebaseApp = firebase.app(); // if already initialized, use that one
}

let password = "";
let FieldValue = firebaseA.firestore.FieldValue;

async function sendPushNotification(body, username, id) {
  console.log("body: ", body);

  const expoToken_user = await firebaseApp
    .firestore()
    .collection("users")
    .doc(id)
    .get();
  try {
    const expoToken = expoToken_user.data().expoToken;

    const message = {
      to: expoToken,
      sound: "default",
      title: username,
      body: body,
    };

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    console.log("message sent!");
  } catch (e) {
    return console.error("failed to send notification: ", e);
  }
}

async function registerForPushNotificationsAsync(user) {
  let token;
  if (Constants.isDevice) {
    const {
      status: existingStatus,
    } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      alert("Failed to get push token for push notification!");
      return;
    }
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log(token);
  } else {
    alert("Must use physical device for Push Notifications");
  }

  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  await firebaseApp.firestore().collection("users").doc(user.uid).update({
    expoToken: token,
  });
  return token;
}

export default function App() {
  const db = firebaseApp.firestore();
  let [email, setEmail] = useState("");
  let [username, setUsername] = useState("");
  let [password, setPassword] = useState("");
  let [user, setUser] = useState();
  let [currentView, setCurrentView] = useState("signup");
  const [recipient, setRecipient] = useState("");
  const [initializing, setInitializing] = useState(true);
  const [recipientText, setRecipientText] = useState("");
  const [expoPushToken, setExpoPushToken] = useState("");
  const [notification, setNotification] = useState(false);
  const notificationListener = useRef();
  const responseListener = useRef();
  let friends = useFriends(db, user);
  let letters = useLetters(db, user);
  const [currentLetter, setCurrentLetter] = useState({});
  const [modalVisible, setModalVisible] = useState(false);

  // if (user) {
  //   console.log("hello")
  //   friends = useFriends(db, user)
  //   letters = useLetters(db, user)
  // }

  async function addFriend() {
    Alert.prompt("Add a friend", "Please enter your friends username", [
      {
        text: "Cancel",
        onPress: () => console.log("Cancel Pressed"),
        style: "cancel",
      },
      {
        text: "OK",
        onPress: async (uName) => {
          let addFriendUsers = await db
            .collection("users")
            .where("username", "==", uName)
            .get();

          addFriendUsers = addFriendUsers.docs.map((user) => {
            let name = user.data().username;
            let id = user.id;
            let data = {};
            data["username"] = name;
            data["id"] = id;
            return data;
          });

          let currentUser = await db.collection("users").doc(user.uid).get();
          let currentUserName = currentUser.data().username;

          addFriendUsers.forEach(async (data) => {
            let friendName = data.username;
            let friendId = data.id;

            await db
              .collection("users")
              .doc(user.uid)
              .update({
                friends: FieldValue.arrayUnion(friendName),
              })
              .then(async () => {
                console.log(
                  "successfully added friend to current user friends list"
                );
                console.log("...adding current user to friend friends list");

                await db
                  .collection("users")
                  .doc(friendId)
                  .update({
                    friends: FieldValue.arrayUnion(currentUserName),
                  })
                  .then(() => {
                    console.log(
                      "successfully added current user to friend friends list!"
                    );
                  })
                  .catch((e) => {
                    console.error(
                      "failed to add current user to friend friends list: ",
                      e
                    );
                  });
              })
              .catch((error) => {
                console.error("failed to add user: ", error);
              });
          });
        },
      },
    ]);
  }

  async function deleteFriend(friendUsername) {
    Alert.prompt("Delete a friend", "Please enter your friends username", [
      {
        text: "Cancel",
        onPress: () => console.log("Cancel Pressed"),
        style: "cancel",
      },
      {
        text: "OK",
        onPress: async (uName) => {
          let addFriendUsers = await db
            .collection("users")
            .where("username", "==", uName)
            .get();

          addFriendUsers = addFriendUsers.docs.map((user) => {
            let name = user.data().username;
            let id = user.id;
            let data = {};
            data["username"] = name;
            data["id"] = id;
            return data;
          });

          let currentUser = await db.collection("users").doc(user.uid).get();
          let currentUserName = currentUser.data().username;

          addFriendUsers.forEach(async (data) => {
            let friendName = data.username;
            let friendId = data.id;
            console.log("friend uid: ", friendId);
            console.log("friend username: ", friendName);
            console.log("current user uid: ", user.uid);
            console.log("current username: ", currentUserName);

            await db
              .collection("users")
              .doc(user.uid)
              .update({
                friends: FieldValue.arrayRemove(friendName),
              })
              .then(async () => {
                console.log(
                  "successfully removed friend from current user friends list"
                );
                console.log(
                  "...removing current user from friend friends list"
                );

                await db
                  .collection("users")
                  .doc(friendId)
                  .update({
                    friends: FieldValue.arrayRemove(currentUserName),
                  })
                  .then(() => {
                    console.log(
                      "successfully removed current user from friend friends list"
                    );
                  })
                  .catch((e) => {
                    console.error(
                      "failed to remove current user from friend friends list: ",
                      e
                    );
                  });
              })
              .catch((error) => {
                console.error("failed to remove user: ", error);
              });
          });
        },
      },
    ]);
  }

  function signUp(firebaseApp, email, password, username, db) {
    firebaseApp
      .auth()
      .createUserWithEmailAndPassword(email, password)
      .then((userCredential) => {
        var user = userCredential.user;
        setUser(user);
        db.collection("users")
          .doc(user.uid)
          .set({
            username,
          })
          .then(() => {
            console.log("USER RECORD CREATED USERNAME SUCCESSFULLY STORED");
          })
          .catch((e) => {
            console.error(
              "FAILED TO CREATE USER RECORD AND STORE USERNAME: ",
              e
            );
          });
        //create user record containing username
        return user;
      })
      .catch((error) => {
        var errorCode = error.code;
        var errorMessage = error.message;
        console.log("error: ", errorMessage);
        return {};
      });
  }

  async function sendMessage(db, user, text) {
    const uid = user.uid;
    const userRecord = await db.collection("users").doc(uid).get();
    setUsername(userRecord.data().username);

    console.log("recipient: ", recipient);

    let recipientRecords = await db
      .collection("users")
      .where("username", "==", recipient)
      .get();

    recipientRecords.docs.forEach(async (record) => {
      let recipientId = record.id;
      let letter = {
        sender: username,
        text,
        timestamp: Date.now(),
      };

      await db
        .collection("users")
        .doc(recipientId)
        .update({
          letters: FieldValue.arrayUnion(letter),
        });
    });

    // recipientRecords.docs.forEach((record) => {
    //   let recipientId = record.id;
    //   // make sender dynamic
    //   db.collection("letters")
    //     .add({
    //       sender: userRecord.data().username,
    //       text: text,
    //       timestamp: Date.now(),
    //     })
    //     .then((docRef) => {
    //       console.log("Document written with ID: ", docRef.id);
    //       db.collection("users")
    //         .doc(recipientId)
    //         .update({
    //           letters: firebaseApp.firestore.FieldValue.arrayUnion(docRef.id),
    //         })
    //         .then(() => {
    //           console.log("successfully added letter id to user letters");
    //         })
    //         .catch((error) => {
    //           console.error("Error adding letter id to user letters: ", error);
    //         });
    //     })
    //     .catch((error) => {
    //       console.error("Error adding document: ", error);
    //     });
    // });

    Alert.alert("Letter Sent", "Your friend will see your message soon!", [
      { text: "OK", onPress: () => setCurrentView("home") },
    ]);
  }

  function login(firebaseApp, email, password) {
    console.log(email);
    firebaseApp
      .auth()
      .signInWithEmailAndPassword(email, password)
      .then((userCredential) => {
        console.log("Signed in");
        var user = userCredential.user;
        setUser(user);
        return user;
      })
      .catch((error) => {
        var errorCode = error.code;
        var errorMessage = error.message;
        console.log("error: ", errorMessage);
        return {};
      });
  }

  const onAuthStateChanged = (user) => {
    setUser(user);
    setCurrentView("home");

    registerForPushNotificationsAsync(user).then((token) =>
      setExpoPushToken(token)
    );

    // This listener is fired whenever a notification is received while the app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        setNotification(notification);
      }
    );

    // This listener is fired whenever a user taps on or interacts with a notification (works when app is foregrounded, backgrounded, or killed)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log(response);
      }
    );

    if (initializing) setInitializing(false);

    console.log("LOGGED IN");

    if (!user) {
      setCurrentView("login");
      setEmail("");
      setPassword("");

      console.log("LOGGED OUT");
    }

    return () => {
      Notifications.removeNotificationSubscription(
        notificationListener.current
      );
      Notifications.removeNotificationSubscription(responseListener.current);

      console.log("LOGGED OUT");
    };
  };

  async function sendNotification(username) {
    if (username) {
      console.log(username);
      let users = await firebaseApp
        .firestore()
        .collection("users")
        .where("username", "==", username)
        .get();
      let user_ids = [];
      users.docs.forEach((user) => user_ids.push(user.id));
      console.log(user_ids);

      Alert.prompt(
        "Enter notification",
        `please enter the message you would like to notify ${username} with`,
        [
          {
            text: "Cancel",
            onPress: () => console.log("Cancel Pressed"),
            style: "cancel",
          },
          {
            text: "OK",
            onPress: async (text) =>
              user_ids.forEach((id) =>
                sendPushNotification(text, username, id)
              ),
          },
        ]
      );
    } else {
      console.log("no username provided to sendNotification");
    }
  }

  async function signout(firebaseApp, user, subscriber) {
    firebaseApp
      .auth()
      .signOut()
      .then(
        async function () {
          console.log("Signed Out");
        },
        function (error) {
          console.error("Sign Out Error", error);
        }
      );
  }

  function openLetter(letter) {
    setCurrentLetter(letter);
    console.log("opened");
    setModalVisible(!modalVisible);
  }

  function sendLetter(username) {
    // console.log("username: ", username)
    setCurrentView("sendletter");
    setRecipient(username);
  }

  async function closeLetter() {
    let current_user = await db.collection("users").doc(user.uid).get();
    current_user = current_user.data();

    console.log(current_user.letters);
    console.log(currentLetter);

    let current_user_letters = current_user.letters;

    current_user_letters.forEach(async (letter) => {
      if (
        letter.text === currentLetter.text &&
        letter.sender === currentLetter.sender
      ) {
        await db
          .collection("users")
          .doc(user.uid)
          .update({
            letters: FieldValue.arrayRemove(letter),
          });
      }
    });
    // current_user_letters = current_user_letters.filter(
    //   (letter_id) => letter_id !== currentLetter.id
    // );
    // console.log("current user letters after filter: ", current_user_letters);
    // await db
    //   .collection("users")
    //   .doc(user.uid)
    //   .update({
    //     letters: current_user_letters,
    //   })
    //   .then(() => {
    //     console.log("map field successfully deleted!");
    //   })
    //   .catch((e) => {ccc
    //     console.error("failed to delete map field: ", e);
    //   });

    setCurrentLetter({});

    setModalVisible(!modalVisible);
  }

  useEffect(() => {
    const subscriber = firebaseApp
      .auth()
      .onAuthStateChanged(onAuthStateChanged);
    return subscriber; // unsubscribe on unmount
  }, []);

  if (initializing) return null;

  if (!user && currentView === "signup") {
    return (
      <View style={styles.container}>
        <Image style={styles.logo2} source={require("./logo-2-19.png")} />
        <Text style={{ fontStyle: "italic" }}>Reaching out made easy</Text>
        <Text style={{ fontStyle: "italic", marginBottom: 30 }}>
          Conversation made genuine
        </Text>
        <TextInput
          style={styles.textImput}
          placeholder="Email"
          onChangeText={(text) => setEmail(text)}
        />
        <TextInput
          style={styles.textImput}
          placeholder="Username"
          onChangeText={(text) => setUsername(text)}
        />
        <TextInput
          style={styles.textImput}
          placeholder="Password"
          onChangeText={(text) => setPassword(text)}
        />
        <Pressable
          onPress={() => {
            console.log("sign up was pressed");
            setUser(signUp(firebaseApp, email, password, username, db));
          }}
          style={styles.logIn}
        >
          <Text style={{ fontSize: 17 }}>Sign Up</Text>
        </Pressable>

        <Pressable onPress={() => setCurrentView("login")}>
          <Text>Back to Log in</Text>
        </Pressable>
        <StatusBar style="auto" />
      </View>
    );
  }

  if (!user && currentView === "login") {
    return (
      <View style={styles.container}>
        <Image style={styles.image} source={require("./logo-08.png")} />
        <TextInput
          style={styles.textImput}
          placeholder="Email"
          onChangeText={(text) => setEmail(text)}
        />
        <TextInput
          secureTextEntry
          style={styles.textImput}
          placeholder="Password"
          onChangeText={(text) => setPassword(text)}
        />

        <Pressable
          onPress={() => {
            setUser(login(firebaseApp, email, password));
          }}
          style={styles.logIn}
        >
          <Text style={{ fontSize: 17 }}>Log in</Text>
        </Pressable>

        <Pressable onPress={() => setCurrentView("signup")}>
          <Text>New? Sign up</Text>
        </Pressable>
        <StatusBar style="auto" />
      </View>
    );
  }

  if (user && currentView === "letters") {
    return (
      <View style={styles.containerHome}>
        <Image
          style={{ width: "100%", height: 200, marginTop: 0 }}
          source={require("./header-17.png")}
        />
        <Text h3>Your Letters</Text>
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => {
            Alert.alert("Modal has been closed.");
            setModalVisible(modalVisible);
          }}
        >
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              <Text style={styles.modalText}>{currentLetter.text}</Text>
              <Pressable
                style={[styles.button, styles.buttonClose]}
                onPress={() => closeLetter()}
              >
                <Text style={styles.textStyle}>Delete Letter</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {!letters || letters === [] ? (
          <Text>no letters</Text>
        ) : (
          letters.map((letter) => {
            if (letter) {
              return (
                <View key={letter.id}>
                  <Image
                    source={require("./letter-icon-16-16.png")}
                    style={{
                      width: 90,
                      height: 20,
                    }}
                  />
                  <Pressable
                    key={letter.id + 1}
                    onPress={() => openLetter(letter)}
                    style={styles.letters}
                  >
                    <Text>Letter from {letter.sender}</Text>
                  </Pressable>
                </View>
              );
            }
          })
        )}
        <Pressable
          onPress={() => setCurrentView("home")}
          style={styles.viewLetter}
        >
          <Text style={{ fontSize: 17 }}>Return to Friends</Text>
        </Pressable>
      </View>
    );
  }

  if (user && currentView === "sendletter") {
    return (
      <View style={styles.container}>
        <Text>What would you like to tell the recipient?</Text>
        <TextInput
          style={styles.textImput2}
          placeholder="Hello dear..."
          onChangeText={(text) => setRecipientText(text)}
        />
        <Pressable
          onPress={() => sendMessage(db, user, recipientText, username)}
          style={styles.sendButton}
        >
          <Text>Send Letter</Text>
        </Pressable>
        <Pressable
          onPress={() => setCurrentView("home")}
          style={styles.viewLetter}
        >
          <Text style={{ fontSize: 17 }}>Return to Friends</Text>
        </Pressable>
        {letters ? <Text></Text> : <Text>no letter</Text>}
      </View>
    );
  }
  if (user && currentView === "home") {
    return (
      <View style={styles.containerHome}>
        <Image
          style={{ width: "100%", height: 200, marginTop: 0 }}
          source={require("./header-17.png")}
        />
        <Text h3>Your Friends {username}</Text>

        <Pressable
          onPress={() => addFriend()}
          style={styles.friendButtons}
          style={styles.addFriend}
        >
          <Text>+ Add Friend</Text>
        </Pressable>

        <Pressable
          onPress={() => setCurrentView("letters")}
          style={styles.viewLetter}
        >
          <Text style={{ fontSize: 17 }}>View recieved letters</Text>
        </Pressable>

        {!friends || friends === [] ? (
          <Text>no friends</Text>
        ) : (
          friends.map((username) => {
            return (
              <View key={username}>
                <Image
                  style={styles.avatar}
                  source={require("./avatar-18-17-17-17.png")}
                />
                <Text>{username}</Text>
                <Pressable
                  style={styles.notification}
                  onPress={() => sendNotification(username)}
                >
                  <Text>Send Notification</Text>
                </Pressable>
                <Pressable
                  style={styles.letter}
                  onPress={() => sendLetter(username)}
                >
                  <Text>Send Letter</Text>
                </Pressable>
                <Divider
                  style={{
                    backgroundColor: "gray",
                    marginBottom: 5,
                    marginTop: 5,
                  }}
                />
              </View>
            );
          })
        )}
        <Pressable
          onPress={() => signout(firebaseApp, user)}
          style={{ marginTop: 20 }}
        >
          <Text>Sign Out</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <Button
        style={styles.button}
        title="Sign Out"
        onPress={() => signout(firebaseApp, user)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  containerHome: {
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  friendButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  button: {
    backgroundColor: "#FBB68F",
    borderRadius: 250,
    padding: 20,
    margin: 10,
    elevation: 2,
  },

  addFriend: {
    backgroundColor: "#FDE229",
    borderRadius: 250,
    padding: 5,
    margin: 3,
    elevation: 2,
  },

  image: {
    width: 120,
    height: 120,
    resizeMode: "contain",
    marginBottom: 20,
  },

  logo2: {
    width: 90,
    height: 90,
    resizeMode: "contain",
    marginBottom: 20,
  },

  avatar: {
    width: 100,
    height: 70,
    resizeMode: "contain",
    justifyContent: "center",
  },

  header: {
    marginTop: 0,
  },

  logIn: {
    borderRadius: 250,
    padding: 5,
    margin: 10,
    color: "gray",
  },

  viewLetter: {
    backgroundColor: "#FFC932",
    borderRadius: 250,
    padding: 10,
    marginBottom: 10,
    color: "#fff",
  },
  letter: {
    backgroundColor: "#C5DC3F",
    borderRadius: 250,
    padding: 10,
    margin: 2,
  },

  letters: {
    backgroundColor: "#C5DC3F",
    borderRadius: 250,
    padding: 15,
    margin: 10,
  },

  notification: {
    backgroundColor: "#C5DC3F",
    borderRadius: 250,
    padding: 10,
    margin: 2,
  },

  textImput: {
    color: "white",
    borderRadius: 250,
    padding: 20,
    paddingHorizontal: 130,
    margin: 5,
    backgroundColor: "#FBB68F",
  },

  textImput2: {
    color: "white",
    borderRadius: 250,
    padding: 20,
    paddingHorizontal: 130,
    margin: 50,
    backgroundColor: "#FBB68F",
  },

  sendButton: {
    backgroundColor: "#00A98B",
    borderRadius: 250,
    padding: 20,
    margin: 10,
    elevation: 2,
  },

  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  // buttonOpen: {
  //   backgroundColor: "#F194FF",
  // },
  // buttonClose: {
  //   backgroundColor: "#2196F3",
  // },
  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  modalText: {
    marginBottom: 15,
    textAlign: "center",
  },
});
