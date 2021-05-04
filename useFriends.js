import { useState, useEffect } from "react";
import "firebase/firestore";

export default function useFriends(db, user) {
  const [friends, setFriends] = useState([]);

  const userUid = user ? user.uid : undefined;

  useEffect(() => {
    async function getFriends() {
      if (!userUid) return;

      try {
        console.log("fetching friends");
        await db
          .collection("users")
          .doc(userUid)
          .onSnapshot((doc) => {
            console.log("Current data: ", doc.data());
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
  }, [userUid]);

  return friends;
}
