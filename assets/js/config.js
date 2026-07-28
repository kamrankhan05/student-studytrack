// STUDYTRACK — SUPABASE CONFIG


const SUPABASE_URL = "https://yyeyfzrozvdsjvejbfze.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5ZXlmenJvenZkc2p2ZWpiZnplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyMjM1ODgsImV4cCI6MjEwMDc5OTU4OH0.fxVKyzRip9UMXOAaQ4_pIMERaHyiY03Mj6JbDYgbUOU";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);