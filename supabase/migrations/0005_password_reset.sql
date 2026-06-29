-- Migration 0005: password_reset
-- Adiciona suporte a redefinição de senha iniciada pelo admin.
-- O admin gera um token temporário via admin_create_reset_token(),
-- compartilha com o usuário e ele usa na edge function "reset-password".

ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS reset_token      text,
  ADD COLUMN IF NOT EXISTS reset_expires_at timestamptz;

-- Gera um código de redefinição de 6 chars (hex maiúsculo).
-- Só admins podem chamar. Token expira em 2 horas.
CREATE OR REPLACE FUNCTION admin_create_reset_token(p_participant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token text;
BEGIN
  IF NOT current_is_admin() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  v_token := upper(substring(encode(gen_random_bytes(4), 'hex'), 1, 6));

  UPDATE participants
  SET reset_token      = v_token,
      reset_expires_at = now() + interval '2 hours'
  WHERE id = p_participant_id;

  RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_create_reset_token(uuid) TO authenticated;
