require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const brandRoutes = require('./routes/brandRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require("./routes/productRouts");
const productPriceRoutes = require("./routes/productPriceRoures");
const userRoutes = require("./routes/userRoutes");
const supplierRoutes =require("./routes/supplierRoutes");
const salesRoutes  =require("./routes/salesRoutes");
const dailyStockAllocationRoutes =require("./routes/dailyStockAllocationRoutes")
const stockRoutes = require("./routes/stockRoutes")
const purchaseRouter = require("./routes/purchaseRoutes")
const salaryRouter = require("./routes/salaryRoutes")
const customerRouter = require("./routes/customerRoutes")



const app = express();
app.use(cors());
app.use(bodyParser.json());


app.use('/api/brands', brandRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products',productRoutes);
app.use('/api/productprice',productPriceRoutes)
app.use('/api/users',userRoutes)
app.use('/api/suppliers',supplierRoutes)
app.use('/api/sales',salesRoutes)
app.use('/api/dsa',dailyStockAllocationRoutes)
app.use('/api/stock',stockRoutes)
app.use('/api/purchase',purchaseRouter)
app.use('/api/salary/',salaryRouter)
app.use('/api/customers', customerRouter)


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port http://localhost:${PORT}`));
