import z from 'zod';

export const signup_schema = z.object({
    name: z.string().max(25,{message: 'Username cant be more than 25 letters'})
            .min(3, {message: 'Username must contain atleast 3 letters'})
            .trim(),

    email: z.email().trim(),

    password: z.string().trim().min(6,{message: 'Password must be 6 digits long'}),
})
