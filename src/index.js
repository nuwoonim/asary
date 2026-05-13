const express = require('express');
const cors = require('cors');
const path = require('path');
const stocksRouter = require('./routes/stocks');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api', stocksRouter);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`Asary API Server running on port ${PORT}`);
});