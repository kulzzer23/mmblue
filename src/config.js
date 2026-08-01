export const config = {
  // Супер-пароль (видит ВСЕ подразделения)
  adminCode: 'mm-2026',
  adminSessionKey: 'lsfm-pro-admin-session',
  supabaseUrl: 'https://late-heart-9c2c.vadimobormot.workers.dev/',
  supabaseAnonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpampldGxhaW91cmd6a3pzcXB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNzI1NTksImV4cCI6MjA5Njg0ODU1OX0.WkjbDWWOm9EJkBzIyJS-CWRV8bxGffrkR0-SmoycWPM',
  supabaseTable: 'submissions',
  // Таблица с паролями подразделений
  adminPasswordsTable: 'admin_passwords',
  // Список подразделений
  subdivisions: ['TVC', 'LSFM', 'SFFM', 'LVFM'],
};
