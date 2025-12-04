const providerConfig = {
  vipreseller: {
    baseUrl: 'https://vip-reseller.co.id/api',
    apiId: process.env.VIPRESELLER_API_ID,
    apiKey: process.env.VIPRESELLER_API_KEY,
    timeout: 30000,
    endpoints: {
      services: '/services',
      order: '/order',
      status: '/status',
      profile: '/profile',
    },
  },
  
  categories: {
    game: ['mobile-legends', 'free-fire', 'pubg-mobile', 'genshin-impact', 'valorant', 'honkai-star-rail'],
    pulsa: ['telkomsel', 'indosat', 'xl', 'axis', 'three', 'smartfren'],
    ewallet: ['dana', 'gopay', 'ovo', 'shopeepay', 'linkaja'],
    pln: ['token-listrik', 'tagihan-listrik'],
    voucher: ['google-play', 'steam', 'playstation', 'xbox', 'netflix', 'spotify'],
  },
  
  gameTargetValidation: {
    'mobile-legends': {
      format: /^\d{5,15}$/,
      requireServer: true,
      serverFormat: /^\d{4,5}$/,
    },
    'free-fire': {
      format: /^\d{6,15}$/,
      requireServer: false,
    },
    'pubg-mobile': {
      format: /^\d{8,15}$/,
      requireServer: false,
    },
    'genshin-impact': {
      format: /^\d{8,12}$/,
      requireServer: true,
      serverFormat: /^(os_asia|os_eur|os_usa|os_cht)$/,
    },
  },
  
  statusMapping: {
    vipreseller: {
      pending: 'processing',
      process: 'processing',
      success: 'success',
      failed: 'failed',
      error: 'failed',
    },
  },
};

const getProviderConfig = (provider) => {
  return providerConfig[provider] || null;
};

const getCategoryProviders = (category) => {
  return providerConfig.categories[category] || [];
};

const validateGameTarget = (provider, targetId, serverId = null) => {
  const validation = providerConfig.gameTargetValidation[provider];
  if (!validation) return { valid: true };
  
  if (!validation.format.test(targetId)) {
    return { valid: false, error: 'Format User ID tidak valid' };
  }
  
  if (validation.requireServer) {
    if (!serverId) {
      return { valid: false, error: 'Server ID diperlukan' };
    }
    if (!validation.serverFormat.test(serverId)) {
      return { valid: false, error: 'Format Server ID tidak valid' };
    }
  }
  
  return { valid: true };
};

const mapProviderStatus = (provider, status) => {
  const mapping = providerConfig.statusMapping[provider];
  if (!mapping) return status;
  return mapping[status.toLowerCase()] || status;
};

module.exports = {
  providerConfig,
  getProviderConfig,
  getCategoryProviders,
  validateGameTarget,
  mapProviderStatus,
};
