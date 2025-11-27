import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signOut, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  type User as FirebaseUser 
} from "firebase/auth";
import { getFirestore, doc, setDoc, onSnapshot } from "firebase/firestore";

// Initialize Firebase with environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize app once
let firebaseApp: any = null;
try {
  firebaseApp = initializeApp(firebaseConfig);
} catch (error: any) {
  if (!error.message?.includes('duplicate-app')) {
    console.error('Firebase initialization error:', error);
  }
}

export interface User {
  id: string;
  email: string;
  username?: string;
  role?: string;
  profileImage?: string;
  phone?: string;
  address?: string;
  zoneId?: string;
  zoneName?: string;
}

interface UserContextType {
  user: User | null;
  signup: (email: string, password: string, username: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
  isLoggedIn: boolean;
  isLoading: boolean;
}

const defaultUserValue: UserContextType = {
  user: null,
  signup: async () => {},
  login: async () => {},
  logout: async () => {},
  updateUserProfile: async () => {},
  isLoggedIn: false,
  isLoading: true,
};

const UserContext = createContext<UserContextType>(defaultUserValue);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [firebaseAuth, setFirebaseAuth] = useState<any>(null);
  const [firestore, setFirestore] = useState<any>(null);

  useEffect(() => {
    try {
      // Get Firebase auth and firestore (initialized above)
      const auth = firebaseApp ? getAuth(firebaseApp) : getAuth();
      const db = firebaseApp ? getFirestore(firebaseApp) : getFirestore();
      setFirebaseAuth(auth);
      setFirestore(db);

      // Listen to Firebase Auth state changes
      let unsubscribeUser: (() => void) | null = null;
      
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
        // Clean up previous user listener
        if (unsubscribeUser) {
          unsubscribeUser();
          unsubscribeUser = null;
        }

        if (firebaseUser) {
          // User is signed in - set up real-time listener for user data from Firestore
          const userRef = doc(db, "users", firebaseUser.uid);
          unsubscribeUser = onSnapshot(userRef, (userSnap) => {
            let role = "user";
            let username = firebaseUser.email?.split("@")[0] || "user";
            let phone = "";
            let address = "";
            let zoneId = "";
            let zoneName = "";
            
            if (userSnap.exists()) {
              const firestoreData = userSnap.data();
              role = firestoreData.role || "user";
              username = firestoreData.username || username;
              phone = firestoreData.phone || "";
              address = firestoreData.address || "";
              zoneId = firestoreData.zoneId || "";
              zoneName = firestoreData.zoneName || "";
            }
            
            const userData: User = {
              id: firebaseUser.uid,
              email: firebaseUser.email || "",
              username: username,
              role: role,
              phone: phone,
              address: address,
              zoneId: zoneId,
              zoneName: zoneName,
            };
            setUser(userData);
            localStorage.setItem("user", JSON.stringify(userData));
            setIsLoading(false);
          }, (error) => {
            console.error("Failed to fetch user data from Firestore:", error);
            const storedUser = localStorage.getItem("user");
            const storedData = storedUser ? JSON.parse(storedUser) : {};
            
            const userData: User = {
              id: firebaseUser.uid,
              email: firebaseUser.email || "",
              username: storedData.username || firebaseUser.email?.split("@")[0],
              role: storedData.role || "user",
              phone: storedData.phone || "",
              address: storedData.address || "",
              zoneId: storedData.zoneId || "",
              zoneName: storedData.zoneName || "",
            };
            setUser(userData);
            localStorage.setItem("user", JSON.stringify(userData));
            setIsLoading(false);
          });
        } else {
          // User is signed out
          setUser(null);
          localStorage.removeItem("user");
          setIsLoading(false);
        }
      });

      return () => {
        unsubscribe();
        if (unsubscribeUser) {
          unsubscribeUser();
        }
      };
    } catch (error) {
      console.error("Failed to initialize Firebase auth:", error);
      setIsLoading(false);
    }
  }, []);

  const signup = async (email: string, password: string, username: string) => {
    if (!firebaseAuth) throw new Error("Firebase not configured");
    if (!firestore) throw new Error("Firestore not configured");

    // Create user with Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    const firebaseUser = userCredential.user;

    // Create user document in Firestore with default role
    try {
      await setDoc(doc(firestore, "users", firebaseUser.uid), {
        email: firebaseUser.email,
        username: username,
        role: "user", // default role for new users
        createdAt: new Date(),
      });
    } catch (error) {
      console.error("Failed to create user document in Firestore:", error);
    }

    // User data is automatically set via onAuthStateChanged
    console.log("User created with Firebase Auth:", firebaseUser.uid);
  };

  const login = async (email: string, password: string) => {
    if (!firebaseAuth) throw new Error("Firebase not configured");

    // Sign in with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
    
    // User data is automatically set via onAuthStateChanged
    console.log("User signed in with Firebase Auth:", userCredential.user.uid);
  };

  const logout = async () => {
    if (!firebaseAuth) throw new Error("Firebase not configured");
    await signOut(firebaseAuth);
  };

  const updateUserProfile = async (data: Partial<User>) => {
    if (!user || !firestore) throw new Error("User not signed in or Firestore not configured");
    
    try {
      const userRef = doc(firestore, "users", user.id);
      const updateData: any = {};
      
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.address !== undefined) updateData.address = data.address;
      if (data.zoneId !== undefined) updateData.zoneId = data.zoneId;
      if (data.zoneName !== undefined) updateData.zoneName = data.zoneName;
      if (data.username !== undefined) updateData.username = data.username;
      
      await setDoc(userRef, updateData, { merge: true });
      
      // Update local state
      setUser({
        ...user,
        ...data,
      });
      localStorage.setItem("user", JSON.stringify({ ...user, ...data }));
    } catch (error) {
      console.error("Failed to update user profile:", error);
      throw error;
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        signup,
        login,
        logout,
        updateUserProfile,
        isLoggedIn: !!user,
        isLoading,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
