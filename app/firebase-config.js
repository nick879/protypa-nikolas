// Ρυθμίσεις Firebase και μέλη της οικογένειας.
// Το firebaseConfig ΔΕΝ είναι μυστικό: την πρόσβαση την ελέγχουν οι κανόνες (firestore.rules).
window.APP_CONFIG = {
  firebase: {
    apiKey: "AIzaSyBh5QfBbSIQPhBRyLOMFv069GTUnCjHL64",
    authDomain: "protypa-nikolas.firebaseapp.com",
    projectId: "protypa-nikolas",
    storageBucket: "protypa-nikolas.firebasestorage.app",
    messagingSenderId: "961010023561",
    appId: "1:961010023561:web:eed83598e7e0e37fb61a58"
  },
  // Διεύθυνση από όπου η εφαρμογή παίρνει νέο περιεχόμενο (GitHub Pages)
  remoteBase: "https://nick879.github.io/protypa-nikolas/",
  members: {
    "***":            { role: "parent",  name: "Μπαμπάς", focus: "math" },
    "***":     { role: "parent",  name: "Μαμά",    focus: "lang" },
    "***":  { role: "student", name: "Νικόλας", vocative: "Νικόλα" }
  }
};
