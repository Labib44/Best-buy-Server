const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// middlewer
app.use(cors());
app.use(express.json());


// Database

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.r6wv8dh.mongodb.net/?retryWrites=true&w=majority`;
// console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// verify jwt
function verifyJwt(req, res, next) {
    // console.log('toooken', req.headers.authorization);
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('Unauthorized');
    }
    const token=authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function(err,decoded){
        if(err){
            return res.status(403).send({message:'forbidden access'})
        }
        req.decoded=decoded;
        next();
    })
}


async function run() {
    try {

        const categorysCollection = client.db('best-buy').collection('categorys');
        const productsCollection = client.db('best-buy').collection('products');
        const bookingsCollection = client.db('best-buy').collection('bookings');
        const usersCollection = client.db('best-buy').collection('users');



        // categorys
        app.get('/categorysCollection', async (req, res) => {
            const query = {};
            const result = await categorysCollection.find(query).toArray();
            res.send(result);
        });
        // all product
        app.get('/productsCollection', async (req, res) => {
            const query = {};
            const result = await productsCollection.find(query).toArray();
            res.send(result);
        });

        app.get('/productsCollection/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const category = await categorysCollection.findOne(query);
            const filter = { category: category.category }
            const result = await productsCollection.find(filter).toArray();
            res.send(result);
        });
        app.get('/categorysCollection', async (req, res) => {
            const query = {}
            const result = await categorysCollection.find(query).toArray()
            res.send(result);
        });

        // bookings product
        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            // console.log(booking);
            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        });

        app.get('/bookings', verifyJwt, async (req, res) => {
            const email = req.query.email;
            const decodedEmail=req.decoded.email;

            const query = { email: email };
            const bookings = await bookingsCollection.find(query).toArray();
            res.send(bookings);
        });

        // JWT
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1d' })
                return res.send({ accessToken: token });
            }
            // console.log(user);
            res.status(403).send({ accessToken: '' })
        })
        // Admin
        app.get('/users/admin/:email', async(req, res)=>{
            const email=req.params.email;
            const query={email};
            const user=await usersCollection.findOne(query);
            res.send({isAdmin:user?.role === 'admin'});
        })

        // user
        app.post('/users', async (req, res) => {
            const user = req.body;
            // console.log(user);
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        app.get('/users', async(req, res)=>{
            const query={};
            const users=await usersCollection.find(query).toArray();
            res.send(users);
        });

        // Make Admin
        app.put('/users/admin/:id',verifyJwt, async(req,res)=>{
            const decodedEmail=req.decoded.email;
            const query={email:decodedEmail}
            const user=await usersCollection.findOne(query);

            if(user?.role !== 'admin'){
                return res.status(403).send({message:'forbidden access'})
            }

            const id=req.params.id;
            const filter={_id:ObjectId(id)}
            const options={upsert:true}
            const updateDoc={
                $set:{
                    role:'admin'
                }
            }
            const result =await usersCollection.updateOne(filter,updateDoc,options);
            res.send(result);
        });

        // add category product 
        app.get('/productCategory',async(req, res)=>{
            const query={}
            const result=await categorysCollection.find(query).project({category:1}).toArray();
            res.send(result);
        })


    }
    finally {

    }
}
run().catch(console.log);



app.get('/', (req, res) => {
    res.send('Best Buy LTD server')
});

app.listen(port, () => {
    console.log(`Best Buy server on going ${port}`);
})