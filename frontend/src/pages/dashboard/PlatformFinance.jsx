import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { DollarSign, Plus, Building2, Loader2 } from 'lucide-react';



const PlatformFinance = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [platformData, setPlatformData] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    business_id: '',
    amount: '',
    method: 'transfer',
    reference: ''
  });

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [platformRes, businessesRes] = await Promise.all([
        api.get(`/finance/platform?period=${period}`),
        api.get(`/businesses`)
      ]);
      setPlatformData(platformRes.data);
      setBusinesses(businessesRes.data);
    } catch (error) {
      console.error('Error fetching platform finance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${API}/finance/platform/payment?business_id=${formData.business_id}&amount=${formData.amount}&method=${formData.method}&reference=${formData.reference}`
      );
      toast.success('Pago registrado');
      setDialogOpen(false);
      setFormData({ business_id: '', amount: '', method: 'transfer', reference: '' });
      fetchData();
    } catch (error) {
      toast.error(t('errors.serverError'));
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(amount || 0);
  };

  const getBusinessName = (id) => {
    const business = businesses.find(b => b.id === id);
    return business?.name || id;
  };

  return (
    <div data-testid="platform-finance-page" className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold">{t('nav.platform')}</h1>
          <p className="text-muted-foreground">Pagos de negocios a TimeFlow</p>
        </div>
        <div className="flex gap-4">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40" data-testid="platform-period-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">{t('finance.period.month')}</SelectItem>
              <SelectItem value="year">{t('finance.period.year')}</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-brand" data-testid="new-platform-payment-btn">
                <Plus className="w-4 h-4 mr-2" />
                Registrar Pago
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Pago de Negocio</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Negocio</Label>
                  <Select
                    value={formData.business_id}
                    onValueChange={(v) => setFormData({ ...formData, business_id: v })}
                    required
                  >
                    <SelectTrigger data-testid="platform-business-select">
                      <SelectValue placeholder="Seleccionar negocio" />
                    </SelectTrigger>
                    <SelectContent>
                      {businesses.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Monto</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    data-testid="platform-amount-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Método</Label>
                  <Select
                    value={formData.method}
                    onValueChange={(v) => setFormData({ ...formData, method: v })}
                  >
                    <SelectTrigger data-testid="platform-method-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transfer">Transferencia</SelectItem>
                      <SelectItem value="payu">PayU</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Referencia</Label>
                  <Input
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    data-testid="platform-reference-input"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" className="btn-brand" data-testid="platform-submit-btn">
                    {t('common.save')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="stat-card" data-testid="platform-total-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ingresos Plataforma</p>
                <p className="text-3xl font-heading font-bold mt-1">
                  {formatCurrency(platformData?.total_income)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card" data-testid="platform-count-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Pagos</p>
                <p className="text-3xl font-heading font-bold mt-1">
                  {platformData?.payment_count || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-brand/10 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-brand" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('finance.platformPayments')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-brand" />
            </div>
          ) : platformData?.payments?.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Negocio</TableHead>
                  <TableHead>{t('common.date')}</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {platformData.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {getBusinessName(payment.business_id)}
                    </TableCell>
                    <TableCell>
                      {new Date(payment.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{formatCurrency(payment.amount)}</TableCell>
                    <TableCell className="capitalize">{payment.method}</TableCell>
                    <TableCell>
                      <Badge className={payment.status === 'completed' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}>
                        {payment.status === 'completed' ? 'Completado' : 'Pendiente'}
                      </Badge>
                    </TableCell>
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

export default PlatformFinance;
