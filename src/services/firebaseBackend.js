export { auth, db, sendPasswordResetEmail } from '../firebase';
export { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
export { collection, doc, getDoc, getDocs, query, where, orderBy, limit, runTransaction, writeBatch, updateDoc, deleteDoc } from 'firebase/firestore';
export const isSandbox = false;
export const resetSandbox = () => { throw new Error('Reset local indisponível em produção.'); };
