const paymentConfig = {
  xendit: {
    secretKey: process.env.XENDIT_SECRET_KEY,
    webhookToken: process.env.XENDIT_WEBHOOK_TOKEN,
    isProduction: process.env.XENDIT_IS_PRODUCTION === 'true',
    callbackUrl: `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/webhooks/xendit`,
    successRedirectUrl: `${process.env.FRONTEND_URL || 'http://localhost:4321'}/order/success`,
    failureRedirectUrl: `${process.env.FRONTEND_URL || 'http://localhost:4321'}/order/failed`,
    invoiceExpiry: 24 * 60 * 60, // 24 hours in seconds
  },

  paymentMethods: {
    ewallet: ['OVO', 'DANA', 'SHOPEEPAY', 'LINKAJA', 'ASTRAPAY'],
    virtualAccount: ['BCA', 'BNI', 'BRI', 'MANDIRI', 'PERMATA', 'CIMB'],
    qris: ['QRIS'],
    retailOutlet: ['ALFAMART', 'INDOMARET'],
  },

  adminFee: {
    default: parseFloat(process.env.DEFAULT_ADMIN_FEE) || 1000,
    ewallet: 0,
    virtualAccount: 2500,
    qris: 0,
    retailOutlet: 2500,
    balance: 0,
  },

  minimumAmount: {
    ewallet: 1000,
    virtualAccount: 10000,
    qris: 1000,
    retailOutlet: 10000,
    balance: 0,
  },
};

const getAdminFee = (paymentMethod) => {
  if (paymentConfig.paymentMethods.ewallet.includes(paymentMethod)) {
    return paymentConfig.adminFee.ewallet;
  }
  if (paymentConfig.paymentMethods.virtualAccount.includes(paymentMethod)) {
    return paymentConfig.adminFee.virtualAccount;
  }
  if (paymentConfig.paymentMethods.qris.includes(paymentMethod)) {
    return paymentConfig.adminFee.qris;
  }
  if (paymentConfig.paymentMethods.retailOutlet.includes(paymentMethod)) {
    return paymentConfig.adminFee.retailOutlet;
  }
  if (paymentMethod === 'BALANCE') {
    return paymentConfig.adminFee.balance;
  }
  return paymentConfig.adminFee.default;
};

const getPaymentMethodType = (method) => {
  for (const [type, methods] of Object.entries(paymentConfig.paymentMethods)) {
    if (methods.includes(method)) {
      return type;
    }
  }
  return null;
};

const isValidPaymentMethod = (method) => {
  if (method === 'BALANCE') return true;
  return Object.values(paymentConfig.paymentMethods).flat().includes(method);
};

const getMinimumAmount = (paymentMethod) => {
  const type = getPaymentMethodType(paymentMethod);
  if (paymentMethod === 'BALANCE') return paymentConfig.minimumAmount.balance;
  return paymentConfig.minimumAmount[type] || 10000;
};

module.exports = {
  paymentConfig,
  getAdminFee,
  getPaymentMethodType,
  isValidPaymentMethod,
  getMinimumAmount,
};
