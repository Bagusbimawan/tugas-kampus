import { transactionRepository } from '../repositories/transaction.repository';
import { settingsService } from './settings.service';
import { ApiError } from '../utils/api-error';
import {
  CreateTransactionInput,
  TransactionQueryInput
} from '../validations/transaction.validation';

const invoicePrefix = 'TRX';

const formatInvoiceDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}${month}${day}`;
};

const getDayRange = (date: Date) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return { startOfDay, endOfDay };
};

const normalizeDateRange = (startDate?: string, endDate?: string) => {
  if (!startDate || !endDate) {
    return {};
  }

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString()
  };
};

export const transactionService = {
  async create(payload: CreateTransactionInput, userId: number) {
    try {
      return await transactionRepository.sequelize.transaction(async (t: unknown) => {
        const now = new Date();
        const { startOfDay, endOfDay } = getDayRange(now);
        const todayCount = await transactionRepository.countTodayTransactions(
          startOfDay,
          endOfDay,
          t
        );
        const invoiceSequence = String(todayCount + 1).padStart(4, '0');
        const invoiceNumber = `${invoicePrefix}-${formatInvoiceDate(now)}-${invoiceSequence}`;

        const processedItems = [];

        for (const item of payload.items) {
          const product = await transactionRepository.findActiveProductByIdForUpdate(
            item.productId,
            t
          );

          if (!product) {
            throw new Error(`Produk tidak ditemukan: ${item.productId}`);
          }

          if (product.stock < item.quantity) {
            throw new Error(`Stok tidak cukup: ${product.name}`);
          }

          const lineGross = Number(product.price) * item.quantity;
          const itemDiscount = Math.min(Math.max(0, item.discount || 0), lineGross);
          const itemSubtotal = lineGross - itemDiscount;

          if (itemSubtotal < 0) {
            throw new Error(`Diskon item melebihi subtotal: ${product.name}`);
          }

          processedItems.push({
            product,
            productId: item.productId,
            quantity: item.quantity,
            discount: itemDiscount,
            itemSubtotal
          });
        }

        const subtotal = processedItems.reduce((sum, item) => sum + item.itemSubtotal, 0);
        const discount = Math.min(Math.max(0, payload.discount || 0), subtotal);
        const taxableAmount = Math.max(0, subtotal - discount);
        const taxRate = await settingsService.getTaxRate();
        const tax = Math.round(taxableAmount * taxRate);
        const total = Math.max(0, subtotal - discount + tax);

        if (total <= 0) {
          throw new Error('Total transaksi tidak valid');
        }

        if (payload.payment.amountPaid < total) {
          throw new Error('Nominal pembayaran kurang');
        }

        const changeAmount =
          payload.payment.method === 'cash' ? payload.payment.amountPaid - total : 0;

        const transaction = await transactionRepository.createTransaction(
          {
            invoiceNumber,
            userId,
            customerName: payload.customerName || null,
            subtotal,
            discount,
            tax,
            total,
            status: 'completed',
            notes: payload.notes || null
          },
          t
        );

        await transactionRepository.createItems(
          processedItems.map((item) => ({
            transactionId: transaction.id,
            productId: item.productId,
            productName: item.product.name,
            price: item.product.price,
            quantity: item.quantity,
            discount: item.discount,
            subtotal: item.itemSubtotal
          })),
          t
        );

        for (const item of processedItems) {
          await transactionRepository.decrementProductStock(item.productId, item.quantity, t);
          await transactionRepository.createStockLog(
            {
              productId: item.productId,
              userId,
              type: 'out',
              qtyBefore: item.product.stock,
              qtyChange: item.quantity,
              qtyAfter: item.product.stock - item.quantity,
              reason: `Penjualan: ${invoiceNumber}`
            },
            t
          );
        }

        await transactionRepository.createPayment(
          {
            transactionId: transaction.id,
            method: payload.payment.method,
            amountPaid: payload.payment.amountPaid,
            changeAmount,
            referenceNo: payload.payment.referenceNo || null
          },
          t
        );

        return {
          success: true,
          transactionId: transaction.id,
          invoiceNumber
        };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal membuat transaksi';
      throw new ApiError(400, message);
    }
  },

  async getAll(params: TransactionQueryInput) {
    const offset = (params.page - 1) * params.limit;
    const normalizedDates = normalizeDateRange(params.startDate, params.endDate);
    const result = await transactionRepository.findAndCountAll({
      ...params,
      ...normalizedDates,
      offset
    });

    return {
      data: result.rows,
      total: result.count,
      page: params.page,
      totalPages: Math.ceil(result.count / params.limit) || 1
    };
  },

  async getById(id: number) {
    const transaction = await transactionRepository.findById(id);

    if (!transaction) {
      throw new ApiError(404, 'Transaksi tidak ditemukan');
    }

    return transaction;
  },

  async cancel(id: number, userId: number) {
    try {
      return await transactionRepository.sequelize.transaction(async (t: unknown) => {
        const transaction = await transactionRepository.findByIdWithItems(id, t);

        if (!transaction) {
          throw new Error('Transaksi tidak ditemukan');
        }

        if (transaction.status !== 'completed') {
          throw new Error('Transaksi tidak dapat dibatalkan');
        }

        await transactionRepository.updateTransactionStatus(transaction, 'cancelled', t);

        for (const item of transaction.items) {
          const product = await transactionRepository.findActiveProductByIdForUpdate(
            item.productId,
            t
          );

          if (!product) {
            throw new Error(`Produk tidak ditemukan: ${item.productId}`);
          }

          await transactionRepository.incrementProductStock(item.productId, item.quantity, t);
          await transactionRepository.createStockLog(
            {
              productId: item.productId,
              userId,
              type: 'in',
              qtyBefore: product.stock,
              qtyChange: item.quantity,
              qtyAfter: product.stock + item.quantity,
              reason: `Pembatalan: ${transaction.invoiceNumber}`
            },
            t
          );
        }

        return {
          message: 'Transaksi berhasil dibatalkan'
        };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal membatalkan transaksi';
      throw new ApiError(400, message);
    }
  },

  async getReceipt(id: number) {
    const transaction = await transactionRepository.findById(id);

    if (!transaction) {
      throw new ApiError(404, 'Transaksi tidak ditemukan');
    }

    const storeSettings = await settingsService.getSettings();

    return {
      store: {
        name: storeSettings.storeName,
        address: storeSettings.storeAddress,
        phone: storeSettings.storePhone
      },
      invoiceNumber: transaction.invoiceNumber,
      createdAt: transaction.createdAt,
      cashier: transaction.user,
      customerName: transaction.customerName,
      items: transaction.items.map((item: any) => ({
        productId: item.productId,
        productName: item.productName,
        price: item.price,
        quantity: item.quantity,
        discount: item.discount,
        subtotal: item.subtotal
      })),
      summary: {
        subtotal: transaction.subtotal,
        discount: transaction.discount,
        tax: transaction.tax,
        total: transaction.total,
        status: transaction.status,
        notes: transaction.notes
      },
      payment: transaction.payment
    };
  }
};
