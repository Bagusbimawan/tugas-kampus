import { reportRepository } from '../repositories/report.repository';
import { ReportQueryInput } from '../validations/report.validation';

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

const toNumber = (value: unknown) => Number(value || 0);

export const reportService = {
  async getSalesSummary(params: ReportQueryInput) {
    const normalizedDates = normalizeDateRange(params.startDate, params.endDate);
    const [summaryRows, itemRows, dailyData] = await Promise.all([
      reportRepository.findSalesSummary(normalizedDates.startDate, normalizedDates.endDate),
      reportRepository.findSoldItemsSummary(normalizedDates.startDate, normalizedDates.endDate),
      reportRepository.findDailySales(normalizedDates.startDate, normalizedDates.endDate)
    ]);

    const summary = summaryRows[0] || {
      totalRevenue: 0,
      totalTransactions: 0
    };
    const totalRevenue = toNumber(summary.totalRevenue);
    const totalTransactions = toNumber(summary.totalTransactions);
    const totalItems = toNumber(itemRows[0]?.totalItems);

    return {
      totalRevenue,
      totalTransactions,
      totalItems,
      avgOrderValue: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
      dailyData: dailyData.map((item: any) => ({
        date: item.date,
        revenue: toNumber(item.revenue),
        transactions: toNumber(item.transactions)
      }))
    };
  },

  async getTopProducts(params: ReportQueryInput) {
    const normalizedDates = normalizeDateRange(params.startDate, params.endDate);
    const rows = await reportRepository.findTopProducts(
      normalizedDates.startDate,
      normalizedDates.endDate,
      params.limit || 10
    );

    return rows.map((item: any) => ({
      productId: item.productId,
      productName: item.productName,
      totalQty: toNumber(item.totalQty),
      totalRevenue: toNumber(item.totalRevenue)
    }));
  },

  async getRevenueByCategory(params: ReportQueryInput) {
    const normalizedDates = normalizeDateRange(params.startDate, params.endDate);
    const rows = await reportRepository.findRevenueByCategory(
      normalizedDates.startDate,
      normalizedDates.endDate
    );

    return rows.map((item: any) => ({
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      totalRevenue: toNumber(item.totalRevenue),
      totalQty: toNumber(item.totalQty)
    }));
  },

  async getRevenueByCashier(params: ReportQueryInput) {
    const normalizedDates = normalizeDateRange(params.startDate, params.endDate);
    const rows = await reportRepository.findRevenueByCashier(
      normalizedDates.startDate,
      normalizedDates.endDate
    );

    return rows.map((item: any) => ({
      userId: item.userId,
      userName: item.userName,
      totalTransactions: toNumber(item.totalTransactions),
      totalRevenue: toNumber(item.totalRevenue)
    }));
  }
};

