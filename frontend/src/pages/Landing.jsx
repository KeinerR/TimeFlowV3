import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { useTheme } from '@/context/ThemeContext';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  BarChart3, 
  CreditCard, 
  Bell,
  ChevronRight,
  Moon,
  Sun,
  Globe,
  Check,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Landing = () => {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [businesses, setBusinesses] = useState([]);
  const [services, setServices] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  const [bookingData, setBookingData] = useState({
    business_id: '',
    service_id: '',
    staff_id: '',
    date: null,
    time: '',
    client_name: '',
    client_email: '',
    client_phone: ''
  });

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    try {
      const res = await axios.get(`${API}/public/businesses`);
      setBusinesses(res.data);
    } catch (error) {
      console.error('Error fetching businesses:', error);
    }
  };

  const fetchServices = async (businessId) => {
    try {
      const res = await axios.get(`${API}/public/businesses/${businessId}/services`);
      setServices(res.data);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const fetchStaff = async (serviceId) => {
    try {
      const res = await axios.get(`${API}/public/services/${serviceId}/staff`);
      setStaffList(res.data);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const handleBusinessChange = (value) => {
    setBookingData({ ...bookingData, business_id: value, service_id: '', staff_id: '' });
    setServices([]);
    setStaffList([]);
    fetchServices(value);
  };

  const handleServiceChange = (value) => {
    setBookingData({ ...bookingData, service_id: value, staff_id: '' });
    setStaffList([]);
    fetchStaff(value);
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const dateTime = new Date(bookingData.date);
      const [hours, minutes] = bookingData.time.split(':');
      dateTime.setHours(parseInt(hours), parseInt(minutes));
      
      await axios.post(`${API}/public/book`, {
        business_id: bookingData.business_id,
        service_id: bookingData.service_id,
        staff_id: bookingData.staff_id,
        date: dateTime.toISOString(),
        client_name: bookingData.client_name,
        client_email: bookingData.client_email,
        client_phone: bookingData.client_phone
      });
      
      toast.success(t('landing.booking.success'));
      setBookingStep(1);
      setBookingData({
        business_id: '',
        service_id: '',
        staff_id: '',
        date: null,
        time: '',
        client_name: '',
        client_email: '',
        client_phone: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || t('landing.booking.error'));
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: CalendarIcon, title: t('landing.features.booking.title'), desc: t('landing.features.booking.description') },
    { icon: Clock, title: t('landing.features.calendar.title'), desc: t('landing.features.calendar.description') },
    { icon: Users, title: t('landing.features.staff.title'), desc: t('landing.features.staff.description') },
    { icon: BarChart3, title: t('landing.features.reports.title'), desc: t('landing.features.reports.description') },
    { icon: CreditCard, title: t('landing.features.payments.title'), desc: t('landing.features.payments.description') },
    { icon: Bell, title: t('landing.features.notifications.title'), desc: t('landing.features.notifications.description') },
  ];

  const timeSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <span className="font-heading font-bold text-xl">TimeFlow</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => i18n.changeLanguage(i18n.language === 'es' ? 'en' : 'es')}
              className="p-2 rounded-md hover:bg-accent transition-colors"
              data-testid="language-toggle"
            >
              <Globe className="w-5 h-5" />
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md hover:bg-accent transition-colors"
              data-testid="theme-toggle"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <Link to="/login">
              <Button variant="ghost" data-testid="login-nav-btn">{t('auth.login')}</Button>
            </Link>
            <Link to="/register">
              <Button className="btn-brand" data-testid="register-nav-btn">{t('auth.register')}</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-24 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand/5 to-transparent" />
        <div className="container mx-auto px-4 relative">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <h1 className="font-heading font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight mb-6">
              {t('landing.hero.title')}
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              {t('landing.hero.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" className="btn-brand text-lg px-8" data-testid="hero-cta-btn">
                  {t('landing.hero.cta')}
                  <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <a href="#booking">
                <Button size="lg" variant="outline" className="text-lg px-8" data-testid="hero-demo-btn">
                  {t('landing.hero.ctaSecondary')}
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-heading font-bold text-3xl sm:text-4xl mb-4">{t('landing.features.title')}</h2>
            <p className="text-muted-foreground text-lg">{t('landing.features.subtitle')}</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full card-hover">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-lg bg-brand/10 flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-brand" />
                    </div>
                    <h3 className="font-heading font-semibold text-lg mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Booking Section */}
      <section id="booking" className="py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="font-heading text-2xl">{t('landing.booking.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleBooking} className="space-y-6">
                  {/* Step 1: Select Business & Service */}
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label>{t('landing.booking.selectBusiness')}</Label>
                      <Select
                        value={bookingData.business_id}
                        onValueChange={handleBusinessChange}
                      >
                        <SelectTrigger data-testid="booking-business-select">
                          <SelectValue placeholder={t('landing.booking.selectBusiness')} />
                        </SelectTrigger>
                        <SelectContent>
                          {businesses.map((b) => (
                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {bookingData.business_id && (
                      <div className="space-y-2">
                        <Label>{t('landing.booking.selectService')}</Label>
                        <Select
                          value={bookingData.service_id}
                          onValueChange={handleServiceChange}
                        >
                          <SelectTrigger data-testid="booking-service-select">
                            <SelectValue placeholder={t('landing.booking.selectService')} />
                          </SelectTrigger>
                          <SelectContent>
                            {services.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name} - {s.duration_minutes} min {s.price && `- $${s.price}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {bookingData.service_id && (
                      <div className="space-y-2">
                        <Label>{t('landing.booking.selectStaff')}</Label>
                        <Select
                          value={bookingData.staff_id}
                          onValueChange={(v) => setBookingData({ ...bookingData, staff_id: v })}
                        >
                          <SelectTrigger data-testid="booking-staff-select">
                            <SelectValue placeholder={t('landing.booking.selectStaff')} />
                          </SelectTrigger>
                          <SelectContent>
                            {staffList.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.user?.first_name} {s.user?.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Step 2: Select Date & Time */}
                  {bookingData.staff_id && (
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t('landing.booking.selectDate')}</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                              data-testid="booking-date-btn"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {bookingData.date ? (
                                format(bookingData.date, 'PPP', { locale: i18n.language === 'es' ? es : enUS })
                              ) : (
                                <span>{t('landing.booking.selectDate')}</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={bookingData.date}
                              onSelect={(date) => setBookingData({ ...bookingData, date })}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label>{t('landing.booking.selectTime')}</Label>
                        <Select
                          value={bookingData.time}
                          onValueChange={(v) => setBookingData({ ...bookingData, time: v })}
                        >
                          <SelectTrigger data-testid="booking-time-select">
                            <SelectValue placeholder={t('landing.booking.selectTime')} />
                          </SelectTrigger>
                          <SelectContent>
                            {timeSlots.map((time) => (
                              <SelectItem key={time} value={time}>{time}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Client Info */}
                  {bookingData.date && bookingData.time && (
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="font-medium">{t('landing.booking.yourInfo')}</h3>
                      <div className="grid gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="client_name">{t('common.name')}</Label>
                          <Input
                            id="client_name"
                            data-testid="booking-name-input"
                            value={bookingData.client_name}
                            onChange={(e) => setBookingData({ ...bookingData, client_name: e.target.value })}
                            required
                          />
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="client_email">{t('common.email')}</Label>
                            <Input
                              id="client_email"
                              type="email"
                              data-testid="booking-email-input"
                              value={bookingData.client_email}
                              onChange={(e) => setBookingData({ ...bookingData, client_email: e.target.value })}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="client_phone">{t('common.phone')}</Label>
                            <Input
                              id="client_phone"
                              type="tel"
                              data-testid="booking-phone-input"
                              value={bookingData.client_phone}
                              onChange={(e) => setBookingData({ ...bookingData, client_phone: e.target.value })}
                              required
                            />
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        type="submit"
                        className="w-full btn-brand"
                        disabled={loading}
                        data-testid="booking-submit-btn"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t('common.loading')}
                          </>
                        ) : (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            {t('landing.booking.bookNow')}
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <span className="font-heading font-bold">TimeFlow</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} TimeFlow. {t('landing.footer.rights')}.
            </p>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">{t('landing.footer.privacy')}</a>
              <a href="#" className="hover:text-foreground transition-colors">{t('landing.footer.terms')}</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
