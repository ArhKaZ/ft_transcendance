DO $$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_database
      WHERE datname = 'db_trans'
   ) THEN
      CREATE DATABASE db_trans;
   END IF;
END
$$;
