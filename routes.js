import { Router } from "express";
import {homePage, loginPage, postLogin, signupPage, adminPage, forgotPassword, postSignup, logout, joinNow, postJoinNow, deleteItem, details, editItem, postEdit, allItems, participate, out, emailAlert, end, endDetails, verifyEmail, verifyToken, editProfile, postEditProfile } from './controller.js';
import { upload } from "./multer.js";

export const router = Router();

router.route('/').get(homePage);
router.route('/login').get(loginPage).post(postLogin);
router.route('/sign-up').get(signupPage).post(postSignup);
router.route('/admin').get(adminPage);
router.route('/forgot-password').get(forgotPassword);
router.route('/logout').get(logout);
router.route('/join-now').get(joinNow).post(upload.array('photos',4),postJoinNow);
router.route('/delete-item/').get(deleteItem);
router.route('/details/').get(details);
router.route('/edit/').get(editItem).post(postEdit);
router.route('/all-items/').get(allItems);
router.route('/participate/').get(participate);
router.route('/out/').get(out);
router.route('/alert/').get(emailAlert);
router.route('/end/').get(end)
router.route('/end-details/').get(endDetails);
router.route('/verify-email').get(verifyEmail);
router.route('/verify').get(verifyToken);
router.route('/edit-profile').get(editProfile).post(postEditProfile);