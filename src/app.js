const express = require('express');
const cookieParser = require('cookie-parser');
const authRoutes = require('./auth/auth.controller');

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use('/auth', authRoutes);

app.listen(3000, () => console.log('Back rodando na 3000'));