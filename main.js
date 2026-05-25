import express from 'express';
import { router } from './routes.js';
import 'dotenv/config';
import { drizzle } from "drizzle-orm/mysql2";
import session from 'express-session';
import flash from 'connect-flash';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken'
import 'dotenv/config';
import { Server } from 'socket.io';
import http from 'http';
import { bidPriceandOwnerIdUpdate, findUser, out } from './controller.js';
import { itemsTable } from './src/schema.js';
import { and, eq, gt, gte, isNotNull, isNull, ne } from 'drizzle-orm';



const app = express();
const server = http.createServer(app);
const io = new Server(server);
export const db = drizzle(process.env.DATABASE_URL);


app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'abcd', resave: true, saveUninitialized: false }));
app.use(flash());
app.use(cookieParser());
app.use('/images', express.static('images'));

app.use((req, res, next) => {
    const access_token = req.cookies.access_token;
    // console.log('access token:', access_token);
    if (access_token) {
        res.locals.user = jwt.verify(access_token, process.env.JWT_KEY);
        // console.log('req.user: ', req.user);
    } else {
        res.locals.user = null
    }
    // console.log(res.locals.user);
    return next();
})

app.use(async (req,res,next) => {
    try {
        const endItems = await db.select().from(itemsTable).where(and(eq(itemsTable.isSold,false),isNull(itemsTable.ownerId), isNotNull(itemsTable.lastBidBy), gte(new Date(),itemsTable.endDate)));
        // console.log('endItems:',endItems);
        endItems.forEach(async(item) => {
            await db.update(itemsTable).set({ownerId:item.lastBidBy}).where(eq(itemsTable.userId,res.locals.user));
        })
    } catch (error) {
        console.log('error:',error);
    }


    return next();
})


io.on('connection', socket => {
    socket.on('itemData', async (data) => {
        let [updatedData] = await bidPriceandOwnerIdUpdate(data.price, data.id, data.ownerId);
        // console.log('updated data:',updatedData);
        let [ownerData] = await findUser(data.ownerId);
        // console.log('ownerData:',ownerData);
        io.emit('price', {
            price: data.price,
            owner: ownerData.name,
            data: updatedData,
        });
    })

    socket.on('out', async (data) => {
        let [isLastBidBy] = await out(data.user,data.id);
        // console.log(isLastBidBy);
        io.emit('result',{
            result:isLastBidBy,
        })
    })
})

app.use('/', router);




server.listen(3000, () => {
    console.log('server started at port 3000');
})



