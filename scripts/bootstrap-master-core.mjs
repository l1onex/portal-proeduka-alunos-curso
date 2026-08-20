import { randomUUID } from "node:crypto";

import bcrypt from "bcryptjs";

export function getBootstrapMasterConfigFromEnv(env = process.env) {
  const email = env.BOOTSTRAP_MASTER_EMAIL?.trim().toLowerCase() || "";
  const password = env.BOOTSTRAP_MASTER_PASSWORD?.trim() || "";
  const fullName = env.BOOTSTRAP_MASTER_NAME?.trim() || "";

  if (!email || !password || !fullName) {
    return null;
  }

  return { email, password, fullName };
}

async function resolveProfileNameColumn(sql, env = process.env) {
  // Colunas de nome realmente presentes na tabela. A migração 001 cria
  // `full_name`; bases antigas podem ter `nome`.
  const cols = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name IN ('full_name', 'nome')
  `;
  const names = cols.map((row) => row.column_name);

  // Override por env só vale se a coluna existir de verdade (evita crash por
  // PROFILES_NAME_COLUMN obsoleto apontando para coluna inexistente).
  const override = env.PROFILES_NAME_COLUMN?.trim().toLowerCase();
  if ((override === "full_name" || override === "nome") && names.includes(override)) {
    return override;
  }

  if (names.includes("full_name")) return "full_name";
  if (names.includes("nome")) return "nome";
  return "full_name";
}

function authInstanceIdFromEnv(env = process.env) {
  return env.AUTH_INSTANCE_ID?.trim() || "00000000-0000-0000-0000-000000000000";
}

async function hashAuthPassword(plain) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

async function ensureProfileRow(sql, params) {
  const nameCol = await resolveProfileNameColumn(sql, params.env);

  const existingProfile = await sql`
    SELECT id::text AS id
    FROM public.profiles
    WHERE id = ${params.userId}::uuid
    LIMIT 1
  `;
  if (existingProfile.length > 0) {
    return { created: false };
  }

  await sql.unsafe(
    `
INSERT INTO public.profiles (id, email, role, "${nameCol}", created_at, updated_at)
VALUES ($1::uuid, $2::text, 'master', $3::text, now(), now())
ON CONFLICT (id) DO NOTHING
`,
    [params.userId, params.email, params.fullName],
  );

  return { created: true };
}

export async function ensureBootstrapMaster(sql, params = {}) {
  const config = params.config ?? getBootstrapMasterConfigFromEnv(params.env);
  const env = params.env ?? process.env;

  if (!config) {
    return { skipped: true, createdAuth: false, createdProfile: false };
  }

  const existingAuth = await sql`
    SELECT id::text AS id
    FROM auth.users
    WHERE lower(trim(email::text)) = ${config.email}
    LIMIT 1
  `;

  let userId = existingAuth[0]?.id?.trim() || "";
  let createdAuth = false;

  if (!userId) {
    userId = randomUUID();
    const hashed = await hashAuthPassword(config.password);

    await sql`
      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
      )
      VALUES (
        ${authInstanceIdFromEnv(env)}::uuid,
        ${userId}::uuid,
        'authenticated',
        'authenticated',
        ${config.email},
        ${hashed},
        now(),
        '{}'::jsonb,
        '{}'::jsonb,
        now(),
        now()
      )
    `;
    createdAuth = true;
  }

  const profile = await ensureProfileRow(sql, {
    env,
    userId,
    email: config.email,
    fullName: config.fullName,
  });

  return {
    skipped: false,
    createdAuth,
    createdProfile: profile.created,
    userId,
    email: config.email,
  };
}
