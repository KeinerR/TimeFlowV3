import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, TrendingUp, CreditCard, Loader2, Building2 } from 'lucide-react';



const Finance = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [period, setPeriod] = useState('month');
  const [incomeData, setIncomeData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBusinesses();
  }, []);

  useEffect(() => {
    if (selectedBusiness) {
      fetchIncome();
    }
  }, [selectedBusiness, period]);

  const fetchBusinesses = async () => {
    try {
      const res = await api.get(`/businesses`);
      setBusinesses(res.data);
      if (res.data.length > 0) {
        setSelectedBusiness(res.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchIncome = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/finance/income/${selectedBusiness}?period=${period}`);
      setIncomeData(res.data);
    } catch (error) {
      console.error('Error fetching income:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(amount || 0);
  };

  return (
    <div data-testid="finance-page" className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-heading font-bold">{t('finance.title')}</h1>
        <div className="flex gap-4">
          {businesses.length > 1 && (
            <Select value={selectedBusiness} onValueChange={setSelectedBusiness}>
              <SelectTrigger className="w-48" data-testid="business-select">
                <Building2 className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {businesses.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40" data-testid="period-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">{t('finance.period.day')}</SelectItem>
              <SelectItem value="week">{t('finance.period.week')}</SelectItem>
              <SelectItem value="month">{t('finance.period.month')}</SelectItem>
              <SelectItem value="year">{t('finance.period.year')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="stat-card" data-testid="total-income-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('finance.income')}</p>
                <p className="text-3xl font-heading font-bold mt-1">
                  {formatCurrency(incomeData?.total_income)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card" data-testid="payments-count-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('finance.payments')}</p>
                <p className="text-3xl font-heading font-bold mt-1">
                  {incomeData?.payment_count || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-brand/10 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-brand" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card" data-testid="avg-payment-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Promedio</p>
                <p className="text-3xl font-heading font-bold mt-1">
                  {formatCurrency(incomeData?.payment_count > 0 ? incomeData.total_income / incomeData.payment_count : 0)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('finance.payments')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-brand" />
            </div>
          ) : incomeData?.payments?.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.date')}</TableHead>
                  <TableHead>{t('common.price')}</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Referencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomeData.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {new Date(payment.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell className="capitalize">{payment.method}</TableCell>
                    <TableCell>{payment.reference || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t('common.noData')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Finance;
