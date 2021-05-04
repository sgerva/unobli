import { useState, useEffect } from "react";
import "firebase/firestore";

export default function useLetters(db, user) {
  const [letters, setLetters] = useState([]);

  const userUid = user ? user.uid : undefined;

  useEffect(() => {
    async function getLetters() {
      if (!userUid) return;
      try {
        console.log("fetching letters");
        await db
          .collection("users")
          .doc(userUid)
          .onSnapshot((doc) => {
            // console.log("Current data: ", doc.data());
            setLetters(doc.data().letters);
          });
      } catch (e) {
        console.log("Failed to fetch letters: ", e);
        setLetters([]);
      }
    }

    getLetters();

    return () => {
      console.log("letters unmounted");
      // unsubcribe;
    };
  }, [userUid]);

  return letters;
}
