import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart3, Calendar as CalendarIcon, Users, DollarSign, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';



const Reports = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [appointmentsReport, setAppointmentsReport] = useState(null);
  const [incomeReport, setIncomeReport] = useState(null);
  const [clientsReport, setClientsReport] = useState(null);

  const COLORS = ['#FF5533', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

  useEffect(() => {
    fetchReports();
  }, [dateRange]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange.from) params.append('date_from', dateRange.from.toISOString().split('T')[0]);
      if (dateRange.to) params.append('date_to', dateRange.to.toISOString().split('T')[0]);

      const [aptsRes, incomeRes, clientsRes] = await Promise.all([
        api.get(`/reports/appointments?${params}`),
        api.get(`/reports/income?${params}`),
        api.get(`/reports/clients?${params}`)
      ]);

      setAppointmentsReport(aptsRes.data);
      setIncomeReport(incomeRes.data);
      setClientsReport(clientsRes.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(amount || 0);
  };

  const getStatusChartData = () => {
    if (!appointmentsReport?.by_status) return [];
    return Object.entries(appointmentsReport.by_status).map(([status, count]) => ({
      name: t(`appointments.status.${status}`),
      value: count
    }));
  };

  const getMethodChartData = () => {
    if (!incomeReport?.by_method) return [];
    return Object.entries(incomeReport.by_method).map(([method, amount]) => ({
      name: method.charAt(0).toUpperCase() + method.slice(1),
      value: amount
    }));
  };

  return (
    <div data-testid="reports-page" className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-heading font-bold">{t('reports.title')}</h1>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" data-testid="date-range-btn">
                <CalendarIcon className="w-4 h-4 mr-2" />
                {dateRange.from ? (
                  dateRange.to ? (
                    `${format(dateRange.from, 'PP', { locale: es })} - ${format(dateRange.to, 'PP', { locale: es })}`
                  ) : (
                    format(dateRange.from, 'PP', { locale: es })
                  )
                ) : (
                  t('reports.dateRange')
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          <Button onClick={fetchReports} className="btn-brand" data-testid="generate-report-btn">
            {t('reports.generate')}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-brand" />
        </div>
      ) : (
        <Tabs defaultValue="appointments" className="space-y-6">
          <TabsList>
            <TabsTrigger value="appointments" data-testid="tab-appointments">
              <CalendarIcon className="w-4 h-4 mr-2" />
              {t('reports.appointments')}
            </TabsTrigger>
            <TabsTrigger value="income" data-testid="tab-income">
              <DollarSign className="w-4 h-4 mr-2" />
              {t('reports.income')}
            </TabsTrigger>
            <TabsTrigger value="clients" data-testid="tab-clients">
              <Users className="w-4 h-4 mr-2" />
              {t('reports.clients')}
            </TabsTrigger>
          </TabsList>

          {/* Appointments Tab */}
          <TabsContent value="appointments" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="stat-card">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">Total Citas</p>
                  <p className="text-3xl font-heading font-bold mt-1">{appointmentsReport?.total || 0}</p>
                </CardContent>
              </Card>
              <Card className="stat-card">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">Atendidas</p>
                  <p className="text-3xl font-heading font-bold mt-1 text-success">
                    {appointmentsReport?.by_status?.attended || 0}
                  </p>
                </CardContent>
              </Card>
              <Card className="stat-card">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">Canceladas</p>
                  <p className="text-3xl font-heading font-bold mt-1 text-destructive">
                    {appointmentsReport?.by_status?.cancelled || 0}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Citas por Estado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getStatusChartData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {getStatusChartData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Income Tab */}
          <TabsContent value="income" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="stat-card">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">{t('finance.income')}</p>
                  <p className="text-3xl font-heading font-bold mt-1">
                    {formatCurrency(incomeReport?.total_income)}
                  </p>
                </CardContent>
              </Card>
              <Card className="stat-card">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">{t('finance.payments')}</p>
                  <p className="text-3xl font-heading font-bold mt-1">{incomeReport?.payment_count || 0}</p>
                </CardContent>
              </Card>
              <Card className="stat-card">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">Promedio</p>
                  <p className="text-3xl font-heading font-bold mt-1">
                    {formatCurrency(incomeReport?.payment_count > 0 ? incomeReport.total_income / incomeReport.payment_count : 0)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Ingresos por Método</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getMethodChartData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Bar dataKey="value" fill="#FF5533" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Clients Tab */}
          <TabsContent value="clients" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="stat-card">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">{t('dashboard.totalClients')}</p>
                  <p className="text-3xl font-heading font-bold mt-1">{clientsReport?.total_clients || 0}</p>
                </CardContent>
              </Card>
              <Card className="stat-card">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">Clientes con Citas</p>
                  <p className="text-3xl font-heading font-bold mt-1">
                    {Object.keys(clientsReport?.client_stats || {}).length}
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default Reports;
