import { useState, useEffect } from "react";
import "firebase/firestore";

export default function useFriends(db, user) {
  const [friends, setFriends] = useState([]);

  useEffect(() => {
    async function getFriends() {
      try {
        let uid = "";
        if (user) {
          uid = user.uid;
        }
        console.log("fetching friends");
        await db
          .collection("users")
          .doc(uid)
          .onSnapshot((doc) => {
            // console.log("Current data: ", doc.data());
            setFriends(doc.data().friends);
          });
      } catch (e) {
        console.log("Failed to fetch friends: ", e);
        setFriends([]);
      }
    }

    getFriends();

    return () => {
      console.log("This will be logged on unmount");
      // unsubcribe;
    };
  }, []);

  return friends;
}
