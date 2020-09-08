import firebase from 'firebase/app';
import 'firebase/firestore';

let firebaseConfig = {
    apiKey: "AIzaSyCRw2kdy58Eh7IQP0JyOuFtN5u9D_VN0bM",
    authDomain: "ejercicio-adsi.firebaseapp.com",
    databaseURL: "https://ejercicio-adsi.firebaseio.com",
    projectId: "ejercicio-adsi",
    storageBucket: "ejercicio-adsi.appspot.com",
    messagingSenderId: "635365645039",
    appId: "1:635365645039:web:a50004ff600aaeb76cd91a"
};

firebase.initializeApp(firebaseConfig);

export const db = firebase.firestore();