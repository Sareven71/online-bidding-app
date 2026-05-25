import { Worker } from "bullmq";
import { Resend } from "resend";
import 'dotenv/config';

const resend = new Resend(process.env.RESEND_API)
export const worker = new Worker('emails', async (job) => {
    const {from,to,subject,html,delay} = job.data;
    const {error,data} = await resend.emails.send({
        from,to,subject,html,
    })
},
 {
        connection: {
            host: '127.0.0.1',
            port: 6379,
        },
 })