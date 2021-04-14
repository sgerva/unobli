import { useState, useEffect } from "react";
import "firebase/firestore";

export default function useLetters(db, user) {
  const [letters, setLetters] = useState([]);

  useEffect(() => {
    async function getLetters() {
      try {
        let uid = "";
        if (user) {
          uid = user.uid;
        }
        console.log("fetching letters");
        await db
          .collection("users")
          .doc(uid)
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
  }, []);

  return letters;
}
