const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SK);
const port = process.env.PORT || 8000;
const app = express()

// midlware
app.use(cors())
app.use(express.json());
app.use(fileUpload());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@practice.ltifab8.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        const database = client.db('Machine-House');
        const productsCollection = database.collection('products')
        const usersCollection = database.collection('users')
        const bookedCollection = database.collection('booked')
        const paymentCollection = database.collection('payments')

        app.get('/products', async (req, res) => {
            const query = {};
            const products = await productsCollection.find(query).toArray();
            res.send(products)
        })
        // later work
        app.get('/products/:category', async (req, res) => {
            const category = req.params.category;
            const query = { category: category }
            const result = await productsCollection.find(query).toArray()
            res.send(result)
        })

        // user related 
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result)
        })

        app.get('/users', async (req, res) => {
            const query = {};
            const users = await usersCollection.find(query).toArray();
            res.send(users)
        })

        app.post('/booked', async (req, res) => {
            const booked = req.body;
            const result = await bookedCollection.insertOne(booked)
            res.send(result);
        })

        app.get('/booked', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const bookings = await bookedCollection.find(query).toArray();
            res.send(bookings)
        })

        // make admin
        app.put('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        })
        // delete
        app.delete('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result)
        })

        // check admin
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' })

        })
        // make seller 
        app.put('/users/seller/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    userRole: 'seller'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        })
        // check seller
        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isSeller: user?.userRole === 'seller' })

        })
        // product added image hosting in server 
        app.post('/products', async (req, res) => {
            const seller = req.body.seller;
            const productName = req.body.productName;
            const category = req.body.category;
            const location = req.body.location;
            const resalePrice = req.body.resalePrice;
            const originalPrice = req.body.originalPrice;
            const years = req.body.years;
            const time = req.body.time;
            const image = req.files.image;
            const imageData = image.data;
            const enCodeImage = imageData.toString('base64');
            const imageBuffer = Buffer.from(enCodeImage, 'base64');

            const product = {
                seller,
                productName,
                category,
                location,
                resalePrice,
                originalPrice,
                years,
                time,
                image: imageBuffer
            }

            const result = await productsCollection.insertOne(product);
            res.send(result)
        })

        app.delete('/products/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await productsCollection.deleteOne(filter);
            res.send(result)

        })

        app.get('/orders', async (req, res) => {
            const query = {};
            const orders = await bookedCollection.find(query).toArray();
            res.send(orders)
        })

        // payment 

        app.get('/booked/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const booked = await bookedCollection.findOne(query);
            res.send(booked)
        })

        // payment method add
        app.post("/create-payment-intent", async (req, res) => {
            const booked = req.body;
            const price = booked.price;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                "payment_method_types": [
                    "card"
                ],
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        })

        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const result = await paymentCollection.insertOne(payment);
            const id = payment.bookedId;
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updatedResult = await bookedCollection.updateOne(filter, updatedDoc);
            res.send(result)
        })

    } finally {
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Hello Machine House!')
})

app.listen(port, () => {
    console.log(`E-com is running on ${port}`)
})