/* ================================================
   ZAFINN - Cliente Supabase
   A chave "anon" é pública por design — segurança
   vem das políticas RLS no banco de dados.
   ================================================ */

const SUPABASE_URL = 'https://vjeeatwzmywftdlnsqoj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqZWVhdHd6bXl3ZnRkbG5zcW9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NzE2MjEsImV4cCI6MjA5NjI0NzYyMX0._1h3WIZsRbuU44-r6sXossKghByisDAq-pLBBkc7xcM';

const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
