require('dotenv').config()
const express = require('express')
const app = express()
const path = require('path')
const errorHandler = require('./middleware/errorHandler')
const cookieParser = require('cookie-parser')
const cors = require('cors')
const corsOptions = require('./config/corsOptions')
const connectDB = require('./config/dbConn')
const mongoose = require('mongoose')
const PORT = process.env.PORT || 3501
const allowedOrigins = require('./config/allowedOrigins')
const bodyParser = require('body-parser');
const { logger } = require('./middleware/logger')

// app.use(logger)

mongoose.set('strictQuery', true);

connectDB()

app.use(cors(corsOptions));

app.use(
  cors({
    origin: { allowedOrigins },
    credentials: true,
    methods: ['POST', 'PUT', 'GET', 'PATCH', 'OPTIONS', 'HEAD', 'DELETE'],
  }),
)

app.use(express.json())
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }))

app.use(cookieParser())

app.use('/', express.static(path.join(__dirname, 'public')))
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.use('/', require('./routes/root'))
app.use('/auth', require('./routes/authRoutes'))

app.use('/users', require('./routes/userRoutes'));
app.use('/files', require('./routes/fileRoutes'));
app.use('/accounts', require('./routes/accountRoutes'));
app.use('/dumps', require('./routes/dumpRoutes'));
app.use('/ssn', require('./routes/ssnRoutes'));
app.use('/cards', require('./routes/cardRoutes'));
app.use('/mails', require('./routes/mailRoutes'));
app.use('/gvoices', require('./routes/gVoiceRoutes'));
app.use('/cart', require('./routes/cartRoutes'));

app.use('/payments', require('./routes/paymentsRoutes'));

app.use('/orders', require('./routes/orderRoutes'));
app.use('/sellers', require('./routes/sellerRoutes'));
app.use('/support', require('./routes/supportRoutes'));
app.use('/withdrawals', require('./routes/withdrawRoutes'));
app.use('/bases', require('./routes/baseRoutes'));
app.use('/prices', require('./routes/priceRoutes'));
app.use('/admin', require('./routes/adminDashRoutes'));
app.use('/csv', require('./routes/csvUploadRoutes'));
app.use('/categories', require('./routes/productCategoryRoutes'));
app.use('/refunds', require('./routes/refundRoutes'));
app.use('/admin-settings', require('./routes/adminSetttingsRoutes'));






app.all('*', (req, res) => {
  res.status(404)
  if (req.accepts('html')) {
    res.sendFile(path.join(__dirname, 'views', '404.html'))
  } else if (req.accepts('json')) {
    res.json({ message: '404 Not Found' })
  } else {
    res.type('txt').send('404 Not Found')
  }
})

app.use(errorHandler)

mongoose.connection.once('open', () => {
  console.log(process.env.NODE_ENV)
  console.log('connected to mongo db')
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
})

mongoose.connection.on('error', (err) => {
  console.log(err)
})
