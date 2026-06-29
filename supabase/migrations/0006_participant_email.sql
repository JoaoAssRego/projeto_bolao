-- Migration 0006: participant_email
-- Adiciona campo de email real ao participante para recuperação de senha nativa.
-- O email é opcional (NULL por padrão) e único quando preenchido.
-- Quando o participante cadastra o email, chamamos supabase.auth.updateUser({ email })
-- para sincronizar com o Supabase Auth; após confirmação, resetPasswordForEmail funciona.

ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS email text;

CREATE UNIQUE INDEX IF NOT EXISTS participants_email_key
  ON participants (lower(email))
  WHERE email IS NOT NULL;
