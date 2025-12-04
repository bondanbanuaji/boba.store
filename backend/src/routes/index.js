const express = require("express");
const router = express.Router();

const authRoutes = require("./auth");
const productRoutes = require("./products")
const orderRoutes = requite("./orders");
const paymentRoutes = require("./payments");
const webhookRoutes = require("./webhooks");
const adminRoutes = require("./admin");

router.use("/auth", authRoutes);
router.use("/products", productRoutes);
router.use("/orders", orderRoutes);
router.use("/payments", paymentRoutes);
router.use("/webhooks", webhookRoutes);
router.use("/admin", adminRoutes);

router.get("/health", (req, res) => {
    res.json({ status:'ok', timestamp: new Date().toISOString(), message: "OK" });
});

module.exports = router;