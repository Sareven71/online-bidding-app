// imports !-------------------------------

import { db } from './main.js';
import { eq, lte, gt, and, gte } from 'drizzle-orm';
import { usersTable, itemsTable, tokensTable } from './src/schema.js';
import argon2 from 'argon2';
import { signup_schema } from './validators.js';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { sql, desc } from 'drizzle-orm';
import { Resend } from 'resend';
import ejs from 'ejs';
import mjml from 'mjml';
import Randomstring from 'randomstring';
import { emailQueue } from './bullMQ/queue.js';
import { worker } from './bullMQ/worker.js';
import mjml2html from 'mjml';
import { tryCatch } from 'bullmq';
// import mjml2html from 'mjml';




const resend = new Resend(process.env.RESEND_API);


// renders !----------------------------------------------
// ,eq(itemsTable.isSold,false)
export const homePage = async (req, res) => {
    // console.log('user:',res.locals.user);
    if (res.locals.user == null) {
        return res.redirect('/login');
    }
    const data = await db.select().from(usersTable).where(eq(usersTable.id, res.locals.user));
    // console.log('data:',data);
    if (!data[0]) {
        req.flash('errors', 'Please Signup first to access the application');
        return res.redirect('/sign-up');
    }
    const items_data = await db.select().from(itemsTable);
    const user_items = await db.select().from(itemsTable).where(eq(itemsTable.userId, res.locals.user));
    const current_time = new Date();
    // console.log('current time: ', current_time);
    // console.log('db stored: ', new Date(items_data[0].bidDate));
    try {
        const current_items = await db.select()
            .from(itemsTable).where(and(lte(itemsTable.bidDate, current_time), gte(itemsTable.endDate, current_time), eq(itemsTable.isSold, false)))
            .orderBy(itemsTable.bidDate);
        //const current_items = await db.select().from(itemsTable).where(and(and(lte(itemsTable.bidDate, current_time), gte(itemsTable.endDate,current_time)),ne(itemsTable.isSold,true)));

        // console.log('current items: ', current_items);
        const future_items = await db.select().from(itemsTable).where(gt(itemsTable.bidDate, new Date())).orderBy(itemsTable.bidDate);
        // console.log('future_items: ', future_items);
        return res.render('home', { data, items_data, user_items, current_items, future_items });
    } catch (error) {
        console.log('catch error: ', error);
        return res.send(error.message);
    }
    // console.log('data: ', data);
    // console.log('items data: ', items_data);
}

export const loginPage = async (req, res) => {
    res.render('loginPage', { errors: req.flash('errors') });
}

export const signupPage = async (req, res) => {
    res.render('sign-up', { errors: req.flash('errors') });
}

export const adminPage = async (req, res) => {
    if (!res.locals.user) {
        return res.redirect('/login');
    }
    const data = await db.select().from(itemsTable).where(eq(itemsTable.userId, res.locals.user)).orderBy(desc(itemsTable.id));
    const [userData] = await db.select().from(usersTable).where(eq(usersTable.id, res.locals.user));
    // console.log('data: ', data);
    res.render('admin', { data, userData, errors: req.flash('errors') });
}

export const forgotPassword = async (req, res) => {
    res.render('forgot-password');
}

export const joinNow = async (req, res) => {
    res.render('join-now', { errors: req.flash('errors') });
}

export const editItem = async (req, res) => {
    if (res.locals.user == null) {
        req.flash('errors', 'Login to access the page')
        return res.redirect('/login');
    }
    const id = req.query.id;
    // console.log('id: ', id);
    const [data] = await db.select().from(itemsTable).where(eq(itemsTable.id, id));
    if (!data) {
        return res.send('something went wrong.')
    }
    // console.log('data: ', data);
    return res.render('edit-item', { data, errors: req.flash('errors') });
}

export const allItems = async (req, res) => {
    if (res.locals.user == null) {
        req.flash('errors', 'Login to access the page')
        return res.redirect('/login');
    }
    // console.log(req.query.category);
    let items = [];
    let category = req.query.category;
    if (req.query.category == 'future') {
        items = await db.select().from(itemsTable).where(gt(itemsTable.bidDate, new Date())).orderBy(itemsTable.bidDate);
    } else if (req.query.category == 'current') {
        items = await db.select().from(itemsTable).where(and(lte(itemsTable.bidDate, new Date()), gte(itemsTable.endDate, new Date()), eq(itemsTable.isSold, false))).orderBy(itemsTable.bidDate);
    } else {
        return res.send('Error occured');
    }
    // console.log('items: ', items);
    return res.render('all-items', { items, category });
}

export const participate = async (req, res) => {
    if (res.locals.user == null) {
        req.flash('errors', 'Login to access the page')
        return res.redirect('/login');
    }
    const id = req.query.id;
    // console.log('id: ', id);
    const [data] = await db.select().from(itemsTable).where(eq(itemsTable.id, id));
    const [userData] = await db.select().from(usersTable).where(eq(usersTable.id, data.lastBidBy));
    // console.log('user data:',userData);
    // console.log('data:',data);
    const price = data.startPrice || 0;
    // console.log(typeof price);
    // console.log(price);
    // console.log('data: ', data);
    return res.render('participate', { data, price, userData: userData || { name: '' } });
}

export const endDetails = async (req, res) => {
    // console.log(req.query.id);
    if (!req.query.id) return res.send('Something went wrong');
    try {
        const [itemData] = await db.select().from(itemsTable).where(eq(itemsTable.id, req.query.id));
        const [ownerData] = await db.select().from(usersTable).where(eq(usersTable.id, itemData.ownerId));
        if (!ownerData) return res.send('Bid was ended without any interactions. Try adding this item another time to test your luck !')
        const [previousOwnerData] = await db.select().from(usersTable).where(eq(usersTable.id, itemData.userId));
        return res.render('end-details', { itemData, ownerData, previousOwnerData });
    } catch (error) {
        console.log(error);
        return res.send('Error occured in controller - endDetails function');
    }
}

// ------------------------------------------------------------------------------------------------------------------------------------------------------------------

// General Functions !---------------------------------------------

const findUserById = async (id) => {
    console.log('id: ', id);
    return await db.select().from(usersTable).where(eq(usersTable.id, id));
}

export const bidPriceandOwnerIdUpdate = async (price, id, ownerId) => {
    // console.log('price:',price);
    // console.log('id:',id);
    // console.log('owner id:', ownerId);
    try {
        const [itemData] = await db.select().from(itemsTable).where(eq(itemsTable.id, id));
        // console.log('id:',itemData.ownerId);
        if (itemData.lastBidBy == ownerId) return [];
        await db.update(itemsTable).set({ bidPrice: price, lastBidBy: ownerId }).where(eq(itemsTable.id, id));
        return await db.select().from(itemsTable).where(eq(itemsTable.id, id));
    } catch (error) {
        console.log('price update error:', error);
    }
}

export const findUser = async (id) => {
    try {
        return await db.select().from(usersTable).where(eq(usersTable.id, id));
    } catch (error) {
        console.log('find user funciton error:', error);
    }
}

export const out = async (user, id) => {
    // console.log(user,id);
    const [itemData] = await db.select().from(itemsTable).where(eq(itemsTable.id, id));
    // console.log('itemData:', itemData);
    if (itemData.lastBidBy == user) {
        return [];
    } else {
        return [itemData];
    }
}





// Main requests !------------------------------------------------------------------------------------

export const postLogin = async (req, res) => {
    // console.log('req.body: ',req.body);
    const [results] = await db.select().from(usersTable).where(eq(usersTable.email, req.body.email));
    if (!results || !await argon2.verify(results.password, req.body.password)) {
        req.flash("errors", "Invalid Email or Password");
        return res.redirect('/login');
    }
    // console.log('results: ', results);
    try {
        const access_token = jwt.sign(results.id, process.env.JWT_KEY);
        // console.log('access_token: ', access_token);
        res.cookie('access_token', access_token, {
            maxAge: 7 * 24 * (60 * 60) * 1000,
        });
        return res.redirect('/');
    } catch (error) {
        console.log('cookie setting error: ', error);
        return res.redirect('/login');
    }

}

export const postSignup = async (req, res) => {
    // console.log('req.body: ', req.body);
    const { name, email, password } = req.body;
    const { data, error } = signup_schema.safeParse(req.body);
    if (error) {
        // console.log('safe parse error: ', error);
        // console.log('message: ', error.issues[0].message);
        req.flash('errors', error.issues[0].message);
        return res.redirect('/sign-up');
    }
    const [users] = await db.select().from(usersTable).where(eq(usersTable.email, req.body.email));
    // console.log('users: ', users);
    if (users) {
        req.flash('errors', 'User Already Exists');
        return res.redirect('/sign-up');
    }
    try {
        await db.insert(usersTable).values({
            name, email,
            password: await argon2.hash(password)
        })
        const [data] = await db.select().from(usersTable).where(eq(usersTable.email, email));
        // console.log('data:',data);
        if (data) {
            const dummy_access_token = req.cookies.access_token;
            if (dummy_access_token) {
                res.clearCookie('access_token', process.env.JWT_KEY);
            }
            const access_token = jwt.sign(data.id, process.env.JWT_KEY);
            res.cookie('access_token', access_token, {
                maxAge: 7 * 24 * (60 * 60) * 1000,
            });
        }
        return res.redirect('/');
    } catch (error) {
        console.log('insert error: ', error);
        return res.redirect('/sign-up')
    }
}

export const logout = async (req, res) => {
    res.clearCookie('access_token', process.env.JWT_KEY);
    return res.redirect('/');
}

export const postJoinNow = async (req, res) => {
    // console.log('req.body: ', req.body);
    // console.log('req.files: ', req.files);
    if (res.locals.user == null) {
        req.flash('errors', 'Login to access the page')
        return res.redirect('/login');
    }
    try {

        const { name, condition, category, year, description, bidDate, price } = req.body;
        if (new Date(year) > new Date()) {
            req.flash('errors', 'Choose a valid purchased date');
            return res.redirect('/join-now');
        }

        if (new Date(bidDate) < new Date()) {
            req.flash('errors', 'please provide a valid date and time to start the bid');
            return res.redirect('/join-now');
        }

        if (price < 0) {
            req.flash('errors', 'Please provide a valid price tag for your item');
            return res.redirect('/join-now');
        }

        const endDate = new Date(bidDate);
        endDate.setDate(endDate.getDate() + 1);
        // console.log('end date: ', endDate);
        const photo1 = req.files[0].originalname;
        const photo2 = req.files[1].originalname;
        var photo3 = '';
        var photo4 = '';
        // console.log('length: ', req.files.length);
        if (req.files.length > 2) {
            photo3 = req.files[2].originalname;
        } else {
            photo3 = null;
        }

        if (req.files.length > 3) {
            photo4 = req.files[3].originalname;
        } else {
            photo4 = null;
        }
        // console.log(req.files[0].path);
        // console.log('photo1: ', photo1);
        // console.log('photo2: ', photo2);
        // console.log('photo3: ', photo3);
        // console.log('photo4: ', photo4);


        await db.insert(itemsTable).values({
            name, condition, category,
            manufacturedYear: year,
            description, photo1, photo2, photo3, photo4,
            bidDate: new Date(bidDate),
            endDate,
            userId: res.locals.user,
            startPrice: price || 0,
            bidPrice: price || 0,
        })
        return res.redirect('/admin');

    } catch (error) {
        console.log('inserting error: ', error);
    }
}

export const deleteItem = async (req, res) => {
    // console.log('id: ', req.query.id);
    if (res.locals.user == null) {
        req.flash('errors', 'Login to access the page')
        return res.redirect('/login');
    }
    const id = req.query.id;
    try {
        const [data] = await db.select().from(itemsTable).where(eq(itemsTable.id, id));
        if (!data) {
            console.log('data error');
            return res.send('something went wrong!!');
        }
        await db.delete(itemsTable).where(eq(itemsTable.id, id));
        return res.redirect('/admin');
    } catch (error) {
        console.log('catch block error: ', error);
    }
    return res.redirect('/admin');
}

export const details = async (req, res) => {
    if (res.locals.user == null) {
        req.flash('errors', 'Login to access the page')
        return res.redirect('/login');
    }
    const id = req.query.id;
    // console.log('id: ',id);
    try {
        const [data] = await db.select().from(itemsTable).where(eq(itemsTable.id, id));
        // console.log('data:',data);
        const [user_data] = await db.select().from(usersTable).where(eq(usersTable.id, data.userId));
        // console.log('user data:',user_data);
        // console.log('bid date: ', data.bidDate);
        let isCurrent = false;
        let isFuture = false;
        if (!data || !user_data) {
            console.log('db error');
            return res.send('something went wrong');
        }
        if (new Date() < new Date(data.bidDate)) {
            isFuture = true;
        } else {
            isCurrent = true;
        }
        // console.log('isCureent: ', isCurrent);
        // console.log('isFuture: ', isFuture);
        // console.log('data:', data);
        // console.log('user:',user_data);
        return res.render('details', { data, user_data, isCurrent, isFuture, errors: req.flash('errors') });
    } catch (error) {
        console.log('catch error: ', error);
        res.send('something went wrong');
    }
    // return res.redirect('/');
}

export const postEdit = async (req, res) => {
    if (res.locals.user == null) {
        req.flash('errors', 'Login to access the page')
        return res.redirect('/login');
    }
    const id = req.query.id;
    // console.log('id: ', id);
    // console.log('req.body: ', req.body);
    const [item_data] = await db.select().from(itemsTable).where(eq(itemsTable.id, id));
    if (new Date() >= new Date(item_data.bidDate)) return res.send("Can't Edit Item Info now !");
    if (!item_data) return res.send('Item data not found');
    if (item_data.userId != res.locals.user) return res.send('Invalid user to update');
    // console.log('item data: ', item_data);
    if (new Date(req.body.year) > new Date()) {
        req.flash('errors', 'Choose a valid purchased date');
        return res.redirect(`/edit/?id=${id}`);
    }
    try {
        await db.update(itemsTable)
            .set({ name: req.body.name, condition: req.body.condition, category: req.body.category, manufacturedYear: req.body.year, description: req.body.description, startPrice: req.body.price })
            .where(eq(itemsTable.id, id));
        // console.log('update finished');
        return res.redirect('/admin');
    } catch (error) {
        console.log('catch block error: ', error);
        return res.redirect(`/edit/?id=${id}`);
    }
}

export const emailAlert = async (req, res, next) => {
    if (res.locals.user == null) {
        req.flash('errors', 'Login to access the page')
        return res.redirect('/login');
    }

    try {
        const [userData] = await db.select().from(usersTable).where(eq(usersTable.id, res.locals.user));
        if (!userData) return res.send('User not found. Try Again');
        const [itemData] = await db.select().from(itemsTable).where(eq(itemsTable.id,req.query.id));
        if (!itemData) return res.send('Item not found. Try Again');
        // console.log(new Date(itemData.endDate) - new Date())
        const delay = itemData.bidDate - new Date();
        const email = await fs.readFile(path.join(import.meta.dirname, './emails/alert-email.mjml'), 'utf-8');
        // console.log('email:',email);
        const filledTemplate = ejs.render(email,{
            userName: userData.name,
            itemName: itemData.name,
            price: itemData.startPrice,
        })
        // console.log('filledTemplate:',filledTemplate);
        const htmlTemplate = await mjml(filledTemplate);
        // console.log('html:',htmlTemplate)
        await emailQueue.add('email', {
            from: "website <website@resend.dev>",
            to: userData.email,
            subject: 'Alert for an Item',
            html:htmlTemplate.html,
        },{
            delay: delay,
        })
    } catch (error) {
        console.log('error:',error);
    }
    return res.redirect(`/${req.query.url}/?id=${req.query.id}`);
}

const endEmailSending = async ({itemID,ownerId}) => {
    console.log('itemId:',itemID);
    console.log('ownerId:',ownerId);
    if(ownerId != null){
        try {
            const [owner] = await db.select().from(usersTable).where(eq(usersTable.id,ownerId));
            const [itemData] = await db.select().from(itemsTable).where(eq(itemsTable.id,itemID));
            const template = await fs.readFile(path.join(import.meta.dirname,'./emails/end-email.mjml'),'utf-8');
            // console.log('template:',template);
            const filledTemplate = ejs.render(template,{
                itemName: itemData.name,
            });
            // console.log('filledTemplate:',filledTemplate);
            const htmlTemplate = await mjml(filledTemplate);
            // console.log('htmlTemplate:', htmlTemplate.html);
            const {data,error} = await resend.emails.send({
                from: "website <website@resend.dev>",
                to: owner.email,
                subject: "Congratulations. Item is Your's now!!",
                html:htmlTemplate.html,
            })
        } catch (error) {
            res.send('error at endEmailSending function in controller');
        }
    }
    
}

export const end = async (req, res) => {
    console.log(req.query.id);
    try {
        const [itemData] = await db.select().from(itemsTable).where(eq(itemsTable.id, req.query.id));
        // console.log('itemData:',itemData);
        await db.update(itemsTable).set({ ownerId: itemData.lastBidBy, isSold: true }).where(eq(itemsTable.id, req.query.id));
        await endEmailSending({itemID:req.query.id,ownerId:itemData.lastBidBy});
        return res.redirect('/');
    } catch (error) {
        console.log(error);
        return res.send('Something went wrong at end functoin in the controller');
    }
}

export const verifyEmail = async (req, res) => {
    try {
        const [userData] = await db.select().from(usersTable).where(eq(usersTable.id, res.locals.user));
        const [tokenData] = await db.select().from(tokensTable).where(eq(tokensTable.userId, userData.id));
        // console.log('tokenData:',tokenData);
        if (userData.emailVerified || tokenData) {
            req.flash('errors', 'Verification link has been already sent!');
            return res.redirect('/admin');
        }
        const code = Randomstring.generate({
            length: 12,
            charset: 'numeric',
        })
        const mjmlTemplate = await fs.readFile(path.join(import.meta.dirname, './emails/verify-email.mjml'), 'utf-8');
        const ejsTemplate = ejs.render(mjmlTemplate, { code: `http://localhost:3000/verify?token=${code}&id=${userData.id}` });
        const htmlTemplate = await mjml(ejsTemplate); // This function converts this into html from mjml
        const { data, error } = await resend.emails.send({
            from: "website <website@resend.dev>",
            to: userData.email,
            subject: 'Email Verification',
            html: htmlTemplate.html,
        })
        await db.insert(tokensTable).values({
            token: code,
            userId: userData.id,
        })
        return res.redirect('/admin');
    } catch (error) {
        console.log('error:', error);
        return res.send(error.message);
    }
}

export const verifyToken = async (req, res) => {
    try {
        // console.log('token:', req.query.token);
        // console.log('id:', req.query.id);
        const [userData] = await db.select().from(usersTable).where(eq(usersTable.id, req.query.id));
        if (userData.emailVerified == true) {
            return res.send('Email is already Verified!!');
        }
        const [tokenData] = await db.select().from(tokensTable).where(eq(tokensTable.userId, req.query.id));
        // console.log('tokenData:', tokenData);

        // console.log('userData:',userData);
        if (userData && tokenData.token == req.query.token && userData.emailVerified == false) {
            await db.update(usersTable).set({ emailVerified: true }).where(eq(usersTable.id, req.query.id));
        } else {
            return res.send('Something went wrong at verifyToken functoin in controller ...');
        }
        return res.send('Email Verification Successful. Return to main window');
    } catch (error) {
        console.log('error:', error);
    }
}