import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import { Plus, Search, UserCog, MoreHorizontal, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Staff = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [staffList, setStaffList] = useState([]);
  const [users, setUsers] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    user_id: '',
    business_id: '',
    service_ids: [],
    schedule: {
      monday: { start: '09:00', end: '18:00', enabled: true },
      tuesday: { start: '09:00', end: '18:00', enabled: true },
      wednesday: { start: '09:00', end: '18:00', enabled: true },
      thursday: { start: '09:00', end: '18:00', enabled: true },
      friday: { start: '09:00', end: '18:00', enabled: true },
      saturday: { start: '09:00', end: '14:00', enabled: false },
      sunday: { start: '09:00', end: '14:00', enabled: false }
    }
  });

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayNames = {
    monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles',
    thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo'
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [staffRes, usersRes, businessesRes, servicesRes] = await Promise.all([
        axios.get(`${API}/staff`),
        axios.get(`${API}/users`),
        user?.role === 'super_admin' || user?.role === 'admin'
          ? axios.get(`${API}/businesses`)
          : Promise.resolve({ data: [] }),
        axios.get(`${API}/services`)
      ]);
      setStaffList(staffRes.data);
      setUsers(usersRes.data.filter(u => u.role !== 'super_admin'));
      setBusinesses(businessesRes.data);
      setServices(servicesRes.data);
    } catch (error) {
      toast.error(t('errors.serverError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        business_id: formData.business_id || user?.businesses?.[0]
      };

      if (selectedStaff) {
        await axios.put(`${API}/staff/${selectedStaff.id}`, {
          service_ids: data.service_ids,
          schedule: data.schedule
        });
        toast.success(t('common.save'));
      } else {
        await axios.post(`${API}/staff`, data);
        toast.success(t('staff.new'));
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('errors.serverError'));
    }
  };

  const toggleStatus = async (staff) => {
    try {
      await axios.put(`${API}/staff/${staff.id}`, { is_active: !staff.is_active });
      toast.success(staff.is_active ? t('common.disable') : t('common.enable'));
      fetchData();
    } catch (error) {
      toast.error(t('errors.serverError'));
    }
  };

  const openEditDialog = (staff) => {
    setSelectedStaff(staff);
    setFormData({
      user_id: staff.user_id,
      business_id: staff.business_id,
      service_ids: staff.service_ids || [],
      schedule: staff.schedule || formData.schedule
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedStaff(null);
    setFormData({
      user_id: '',
      business_id: '',
      service_ids: [],
      schedule: {
        monday: { start: '09:00', end: '18:00', enabled: true },
        tuesday: { start: '09:00', end: '18:00', enabled: true },
        wednesday: { start: '09:00', end: '18:00', enabled: true },
        thursday: { start: '09:00', end: '18:00', enabled: true },
        friday: { start: '09:00', end: '18:00', enabled: true },
        saturday: { start: '09:00', end: '14:00', enabled: false },
        sunday: { start: '09:00', end: '14:00', enabled: false }
      }
    });
  };

  const updateSchedule = (day, field, value) => {
    setFormData({
      ...formData,
      schedule: {
        ...formData.schedule,
        [day]: { ...formData.schedule[day], [field]: value }
      }
    });
  };

  const filteredStaff = staffList.filter(s =>
    s.user?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.user?.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div data-testid="staff-page" className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-heading font-bold">{t('staff.title')}</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="btn-brand" data-testid="new-staff-btn">
              <Plus className="w-4 h-4 mr-2" />
              {t('staff.new')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedStaff ? t('staff.edit') : t('staff.new')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!selectedStaff && (
                <>
                  {(user?.role === 'super_admin' || user?.role === 'admin') && businesses.length > 0 && (
                    <div className="space-y-2">
                      <Label>{t('nav.businesses')}</Label>
                      <Select
                        value={formData.business_id}
                        onValueChange={(v) => setFormData({ ...formData, business_id: v })}
                        required
                      >
                        <SelectTrigger data-testid="staff-business-select">
                          <SelectValue placeholder={t('landing.booking.selectBusiness')} />
                        </SelectTrigger>
                        <SelectContent>
                          {businesses.map((b) => (
                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>{t('users.title')}</Label>
                    <Select
                      value={formData.user_id}
                      onValueChange={(v) => setFormData({ ...formData, user_id: v })}
                      required
                    >
                      <SelectTrigger data-testid="staff-user-select">
                        <SelectValue placeholder="Seleccionar usuario" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.first_name} {u.last_name} ({u.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>{t('staff.services')}</Label>
                <div className="grid grid-cols-2 gap-2 p-4 border rounded-lg">
                  {services.map((service) => (
                    <label key={service.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.service_ids.includes(service.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, service_ids: [...formData.service_ids, service.id] });
                          } else {
                            setFormData({ ...formData, service_ids: formData.service_ids.filter(id => id !== service.id) });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{service.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('staff.schedule')}</Label>
                <div className="space-y-2 border rounded-lg p-4">
                  {days.map((day) => (
                    <div key={day} className="flex items-center gap-4">
                      <div className="w-24">
                        <Switch
                          checked={formData.schedule[day]?.enabled}
                          onCheckedChange={(checked) => updateSchedule(day, 'enabled', checked)}
                        />
                      </div>
                      <span className="w-24 text-sm font-medium">{dayNames[day]}</span>
                      {formData.schedule[day]?.enabled && (
                        <>
                          <Input
                            type="time"
                            value={formData.schedule[day]?.start}
                            onChange={(e) => updateSchedule(day, 'start', e.target.value)}
                            className="w-32"
                          />
                          <span>-</span>
                          <Input
                            type="time"
                            value={formData.schedule[day]?.end}
                            onChange={(e) => updateSchedule(day, 'end', e.target.value)}
                            className="w-32"
                          />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" className="btn-brand" data-testid="staff-submit-btn">
                  {t('common.save')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('common.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="search-staff"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-brand" />
            </div>
          ) : filteredStaff.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.name')}</TableHead>
                  <TableHead>{t('common.email')}</TableHead>
                  <TableHead>{t('staff.services')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.map((staff) => (
                  <TableRow key={staff.id} data-testid={`staff-row-${staff.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center">
                          <UserCog className="w-5 h-5 text-brand" />
                        </div>
                        <p className="font-medium">{staff.user?.first_name} {staff.user?.last_name}</p>
                      </div>
                    </TableCell>
                    <TableCell>{staff.user?.email}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {staff.service_ids?.slice(0, 2).map((sid) => {
                          const service = services.find(s => s.id === sid);
                          return service ? (
                            <Badge key={sid} variant="outline" className="text-xs">
                              {service.name}
                            </Badge>
                          ) : null;
                        })}
                        {staff.service_ids?.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{staff.service_ids.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={staff.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}>
                        {staff.is_active ? t('common.active') : t('common.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`staff-actions-${staff.id}`}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(staff)}>
                            {t('common.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleStatus(staff)}>
                            {staff.is_active ? t('common.disable') : t('common.enable')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <UserCog className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t('common.noData')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Staff;
