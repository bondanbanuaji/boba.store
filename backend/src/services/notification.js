const axios = require('axios');
const logger = require('../utils/logger');
const { formatCurrency, formatDateIndonesian } = require('../utils/helpers');

class NotificationService {
  constructor() {
    this.whatsappApiUrl = process.env.WHATSAPP_API_URL;
    this.whatsappApiKey = process.env.WHATSAPP_API_KEY;
    this.adminPhone = process.env.ADMIN_WHATSAPP || process.env.CONTACT_WHATSAPP;
  }

  async sendWhatsApp(phone, message) {
    if (!this.whatsappApiUrl || !this.whatsappApiKey) {
      logger.debug('WhatsApp API not configured, skipping notification');
      return { success: false, error: 'WhatsApp API not configured' };
    }

    try {
      const response = await axios.post(
        this.whatsappApiUrl,
        {
          phone,
          message,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.whatsappApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      logger.info('WhatsApp notification sent', { phone: phone.slice(-4) });
      return { success: true, data: response.data };
    } catch (error) {
      logger.error('WhatsApp notification failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  formatOrderCreatedMessage(order) {
    return `🛒 *Order Baru*

Order: #${order.orderNumber}
Produk: ${order.productName}
Target: ${order.targetId}${order.targetServer ? ` (${order.targetServer})` : ''}
Total: ${formatCurrency(order.totalPrice)}
Metode: ${order.paymentMethod}

${order.paymentUrl ? `Link Pembayaran:\n${order.paymentUrl}` : 'Silakan selesaikan pembayaran Anda.'}

Terima kasih telah berbelanja di Boba Store! 🧋`;
  }

  formatOrderPaidMessage(order) {
    return `✅ *Pembayaran Berhasil*

Order: #${order.orderNumber}
Produk: ${order.productName}
Total: ${formatCurrency(order.totalPrice)}

Pesanan Anda sedang diproses. Mohon tunggu beberapa saat.

Terima kasih! 🧋`;
  }

  formatOrderSuccessMessage(order) {
    return `🎉 *Pesanan Selesai*

Order: #${order.orderNumber}
Produk: ${order.productName}
Target: ${order.targetId}${order.targetServer ? ` (${order.targetServer})` : ''}
${order.providerSn ? `SN: ${order.providerSn}` : ''}

Pesanan Anda telah berhasil diproses!

Terima kasih telah berbelanja di Boba Store! 🧋`;
  }

  formatOrderFailedMessage(order) {
    return `❌ *Pesanan Gagal*

Order: #${order.orderNumber}
Produk: ${order.productName}
Pesan: ${order.providerMessage || 'Terjadi kesalahan saat memproses pesanan'}

Dana Anda akan dikembalikan dalam waktu 1x24 jam.
Silakan hubungi CS jika ada pertanyaan.

Mohon maaf atas ketidaknyamanannya. 🙏`;
  }

  formatRefundMessage(order, refundAmount) {
    return `💰 *Refund Berhasil*

Order: #${order.orderNumber}
Jumlah Refund: ${formatCurrency(refundAmount)}

Saldo telah dikembalikan ke akun Anda.

Terima kasih atas pengertiannya! 🙏`;
  }

  formatTopupSuccessMessage(transaction) {
    return `💰 *Top-up Berhasil*

Jumlah: ${formatCurrency(transaction.amount)}
Saldo Sekarang: ${formatCurrency(transaction.balanceAfter)}

Terima kasih telah melakukan top-up! 🧋`;
  }

  formatAdminOrderNotification(order) {
    return `🔔 *New Order Alert*

Order: #${order.orderNumber}
User: ${order.userId || 'Guest'}
Product: ${order.productName}
Target: ${order.targetId}${order.targetServer ? ` | ${order.targetServer}` : ''}
Amount: ${formatCurrency(order.totalPrice)}
Payment: ${order.paymentMethod}
Time: ${formatDateIndonesian(new Date())}`;
  }

  async notifyOrderCreated(order, userPhone = null) {
    const tasks = [];

    if (userPhone) {
      tasks.push(
        this.sendWhatsApp(userPhone, this.formatOrderCreatedMessage(order))
      );
    }

    if (this.adminPhone) {
      tasks.push(
        this.sendWhatsApp(this.adminPhone, this.formatAdminOrderNotification(order))
      );
    }

    await Promise.allSettled(tasks);
  }

  async notifyOrderPaid(order, userPhone = null) {
    if (userPhone) {
      await this.sendWhatsApp(userPhone, this.formatOrderPaidMessage(order));
    }
  }

  async notifyOrderSuccess(order, userPhone = null) {
    if (userPhone) {
      await this.sendWhatsApp(userPhone, this.formatOrderSuccessMessage(order));
    }
  }

  async notifyOrderFailed(order, userPhone = null) {
    if (userPhone) {
      await this.sendWhatsApp(userPhone, this.formatOrderFailedMessage(order));
    }
  }

  async notifyRefund(order, refundAmount, userPhone = null) {
    if (userPhone) {
      await this.sendWhatsApp(userPhone, this.formatRefundMessage(order, refundAmount));
    }
  }

  async notifyTopupSuccess(transaction, userPhone = null) {
    if (userPhone) {
      await this.sendWhatsApp(userPhone, this.formatTopupSuccessMessage(transaction));
    }
  }
}

module.exports = new NotificationService();
