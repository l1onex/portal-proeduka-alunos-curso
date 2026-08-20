"use client";

import Image from "next/image";
import { useState } from "react";
import { SupportContactInline } from "@/components/contact/support-contact-panel";
import { BRAND_LOGO_URL } from "@/lib/brand-logo";

type LoginFormProps = {
  redirectTo?: string | null;
};

type LoginFailJson = { error?: string; code?: string };

function mapLoginError(j: LoginFailJson, httpStatus: number | null): string {
  if (j.code === "no_student_record") {
    return "Este e-mail não está registado como aluno. Use o mesmo e-mail da sua matrícula ou peça ajuda à instituição.";
  }
  if (j.code === "bad_credentials" || httpStatus === 401) {
    return "E-mail ou palavra-passe incorretos. Verifique os dados ou peça ajuda à instituição.";
  }
  if (httpStatus === 429) {
    return "Demasiadas tentativas. Aguarde um pouco e tente novamente.";
  }
  if (typeof j.error === "string") {
    if (/rate limit|too many|Demasiadas/i.test(j.error)) {
      return "Demasiadas tentativas. Aguarde um pouco e tente novamente.";
    }
    if (j.error.length > 0 && j.error.length < 220) return j.error;
  }
  return "Não foi possível iniciar sessão. Tente novamente.";
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          password,
          ...(redirectTo ? { next: redirectTo } : {}),
        }),
      });

      const j = (await res.json()) as {
        ok?: boolean;
        redirect?: string;
        error?: string;
        code?: string;
      };

      if (!res.ok || !j.ok || !j.redirect) {
        setError(mapLoginError(j, res.status));
        return;
      }

      window.location.assign(j.redirect);
    } catch (err) {
      console.error("[login]", err);
      setError(
        "Não foi possível ligar ao serviço. Verifique a internet e tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fbff] lg:flex-row">
      <div
        className="flex min-h-[220px] w-full items-center justify-center px-8 py-12 lg:min-h-screen lg:w-[45%] lg:px-12"
        style={{
          background:
            "linear-gradient(145deg, #D9571E 0%, #F66828 60%, #FF8A3D 100%)",
        }}
      >
        <div className="max-w-[340px] text-white">
          <div className="mb-8 inline-block rounded-full bg-white/15 px-4 py-1.5 text-[0.75rem] font-bold tracking-[0.15em]">
            PORTAL DE ACESSO
          </div>
          <h1 className="mb-5 text-[2.2rem] font-extrabold leading-[1.15] sm:text-[2.8rem]">
            Plataforma
            <br />
            ProEduka
          </h1>
          <p className="mb-12 text-base leading-[1.7] opacity-80">
            Gestão completa de alunos,
            <br />
            documentos e certificados.
          </p>
          <div className="flex gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-white opacity-100" />
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-white opacity-40" />
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-white opacity-20" />
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-8 sm:py-10">
        <div className="flex w-full max-w-[440px] flex-col items-center rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.07)] sm:p-10 md:p-12">
          <Image
            src={BRAND_LOGO_URL}
            alt="ProEduka"
            width={200}
            height={48}
            className="mb-8 h-[38px] w-auto object-contain"
            priority
          />
          <h2 className="mb-1.5 text-center text-[1.6rem] font-bold text-[#D9571E]">
            Bem-vindo de volta
          </h2>
          <p className="mb-8 text-center text-[0.9rem] text-gray-500">
            Insira suas credenciais para acessar o sistema.
          </p>

          <form className="w-full" onSubmit={handleLogin}>
            <div className="mb-5 w-full">
              <label
                htmlFor="login-email"
                className="mb-2 block text-[0.82rem] font-semibold text-gray-700"
              >
                E-mail Institucional
              </label>
              <input
                id="login-email"
                className="w-full rounded-lg border-[1.5px] border-gray-200 bg-white px-[1.1rem] py-[0.9rem] text-[0.95rem] outline-none transition-[border-color,box-shadow] placeholder:text-gray-400 focus:border-[#F66828] focus:ring-2 focus:ring-[#F66828]/20"
                type="email"
                placeholder="Digite o seu e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="mb-5 w-full">
              <label
                htmlFor="login-password"
                className="mb-2 block text-[0.82rem] font-semibold text-gray-700"
              >
                Senha de Acesso
              </label>
              <input
                id="login-password"
                className="w-full rounded-lg border-[1.5px] border-gray-200 bg-white px-[1.1rem] py-[0.9rem] text-[0.95rem] outline-none transition-[border-color,box-shadow] placeholder:text-gray-400 focus:border-[#F66828] focus:ring-2 focus:ring-[#F66828]/20"
                type="password"
                placeholder="Digite a sua palavra-passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {error ? (
              <div className="mb-5 flex items-center gap-2 rounded-lg border border-amber-200 bg-orange-50 px-4 py-[0.85rem] text-[0.88rem] text-orange-700">
                <span aria-hidden>⚠</span>
                <span>{error}</span>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-lg border-0 bg-gradient-to-br from-[#F66828] to-[#D9571E] py-4 text-base font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-75"
            >
              {loading ? "Autenticando..." : "Entrar no Portal"}
            </button>
          </form>

          <p className="mt-8 text-center text-[0.82rem] text-gray-400">
            Primeiro acesso? Solicite suas credenciais ao Administrador.
          </p>
          <div className="mt-6 border-t border-gray-100 pt-6">
            <SupportContactInline />
          </div>
        </div>
      </div>
    </div>
  );
}
