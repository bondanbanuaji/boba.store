const Xendit = require("xendit-node");

const xenditClient = new Xendit({
    secretKey: process.env.XENDIT_SECRET_KEY,
});

const { Invoice } = xenditClient;
const invoiceClient = new Invoice({
    
});

const { Balance } = xenditClient;
const balanceClient = new Balance({
    
});

module.exports = {
    xenditClient,
    invoiceClient,
    balanceClient,
};