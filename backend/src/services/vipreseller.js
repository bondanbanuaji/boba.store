const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { providerConfig, mapProviderStatus } = require('../config/provider');
const { retry } = require('../utils/helpers');

class VipResellerService {
  constructor() {
    this.config = providerConfig.vipreseller;
    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  generateSign(data = {}) {
    const signString = this.config.apiId + this.config.apiKey;
    return crypto.createHash('md5').update(signString).digest('hex');
  }

  async request(endpoint, data = {}) {
    const sign = this.generateSign(data);
    const payload = {
      api_id: this.config.apiId,
      sign,
      ...data,
    };

    try {
      const response = await retry(async () => {
        const res = await this.client.post(endpoint, payload);
        return res.data;
      }, 3, 1000);

      logger.debug('VipReseller API response', { endpoint, response });
      return response;
    } catch (error) {
      logger.error('VipReseller API error', {
        endpoint,
        error: error.message,
        response: error.response?.data,
      });
      throw error;
    }
  }

  async getServices() {
    try {
      const response = await this.request('/services');
      if (response.result === false) {
        throw new Error(response.message || 'Failed to get services');
      }
      return response.data || [];
    } catch (error) {
      logger.error('Failed to get VipReseller services', error);
      throw error;
    }
  }

  async getProfile() {
    try {
      const response = await this.request('/profile');
      if (response.result === false) {
        throw new Error(response.message || 'Failed to get profile');
      }
      return response.data;
    } catch (error) {
      logger.error('Failed to get VipReseller profile', error);
      throw error;
    }
  }

  async createOrder(orderData) {
    const { sku, targetId, targetServer } = orderData;

    try {
      const payload = {
        service: sku,
        data_no: targetServer ? `${targetId}|${targetServer}` : targetId,
      };

      logger.payment('VipReseller', 'Creating order', { sku, targetId, targetServer });

      const response = await this.request('/order', payload);

      if (response.result === false) {
        throw new Error(response.message || 'Order failed');
      }

      return {
        success: true,
        trxId: response.data?.trxid,
        status: mapProviderStatus('vipreseller', response.data?.status || 'pending'),
        message: response.message,
        data: response.data,
      };
    } catch (error) {
      logger.error('VipReseller order failed', {
        sku,
        targetId,
        error: error.message,
      });
      return {
        success: false,
        error: error.message,
        status: 'failed',
      };
    }
  }

  async checkStatus(trxId) {
    try {
      const response = await this.request('/status', { trxid: trxId });

      if (response.result === false) {
        throw new Error(response.message || 'Status check failed');
      }

      const data = response.data;
      return {
        success: true,
        trxId: data.trxid,
        status: mapProviderStatus('vipreseller', data.status),
        sn: data.sn || null,
        message: data.message || response.message,
        data,
      };
    } catch (error) {
      logger.error('VipReseller status check failed', { trxId, error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async checkTarget(provider, targetId, serverId = null) {
    // VIP Reseller doesn't have a dedicated check target endpoint
    // This is a placeholder for validation
    try {
      // For Mobile Legends, we can attempt nickname lookup
      if (provider === 'mobile-legends') {
        const payload = {
          service: 'nickname-ml',
          data_no: serverId ? `${targetId}|${serverId}` : targetId,
        };

        const response = await this.request('/order', payload);
        
        if (response.result && response.data?.nickname) {
          return {
            valid: true,
            targetName: response.data.nickname,
          };
        }
      }

      // For other games, return valid by default (validated by format only)
      return { valid: true, targetName: null };
    } catch (error) {
      logger.debug('Target check error', { provider, targetId, error: error.message });
      return { valid: true, targetName: null };
    }
  }

  processCallback(data) {
    try {
      const { trxid, status, sn, message } = data;

      return {
        trxId: trxid,
        status: mapProviderStatus('vipreseller', status),
        sn: sn || null,
        message: message || null,
      };
    } catch (error) {
      logger.error('Failed to process VipReseller callback', error);
      throw error;
    }
  }
}

module.exports = new VipResellerService();
