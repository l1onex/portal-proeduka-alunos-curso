"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
// (review por campo removido — aprovação direta, sem conferências manuais)
import { isCertificationDataComplete } from "@/lib/aluno-cert-requirements";
import {
  canEditValidacaoSuspensa,
  COLUNA_HOMOLOGADO_EM,
  computePendencias,
  docKeysForRow,
  DOC_LABELS,
  type DocKey,
  isCertificadoSolicitado,
  isDesistente,
  isInadimplente,
  isTruthyFlag,
  isValidacaoSuspensa,
} from "@/lib/aluno-tabela";
import { AdminStudentPasswordReset } from "@/components/admin/admin-student-password-reset";
import { AdminAlunoCertificacaoPanel } from "@/components/admin/admin-aluno-certificacao-panel";
import { fireDataUpdatedWebhook } from "@/lib/client/webhook-dispatch-client";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  networkErrorMessage,
  readJsonResponse,
} from "@/lib/client/fetch-api-json";
import { deleteB2Objects, uploadFileToB2 } from "@/lib/client/b2-upload";
import { fetchPresignedGetUrl } from "@/lib/client/b2-presign";
import {
  b2ObjectKeyForDoc,
  tableValueAfterUpload,
  tableValueDocPending,
} from "@/lib/proeduka-doc-b2";
import Link from "next/link";
import {
  avatarPathForStudent,
  allAvatarStorageKeys,
  AVATAR_B2_EXTENSIONS_FOR_PURGE,
  assertAvatarPhotoAllowed,
} from "@/lib/student-storage";
import { AlunoLogoutButton } from "@/components/aluno/aluno-logout-button";
import { AlunoDadosForm } from "@/components/aluno/aluno-dados-form";
import { BrandLoaderOrb } from "@/components/ui/brand-loader";
import { MatriculaDocumentoCard } from "@/components/aluno/matricula-documento-card";
import { PendenciasCallout } from "@/components/aluno/pendencias-callout";
import { AlunoCursosCard } from "@/components/aluno/aluno-cursos-card";
import { FORMULARIO_MATRICULA_DOC_KEY } from "@/lib/matricula-form/constants";
import { BRAND_LOGO_URL } from "@/lib/brand-logo";
import {
  computeCompletedAgeYearsFromDtNasc,
  formatAlunoDataMatriculaDisplay,
  formatHomologadoEmDisplay,
} from "@/lib/format-br";

/** Padrão estático (SSR-safe) para pré-visualização do QR antes da aprovação. */
function AlunoQrPlaceholder() {
  const cells: boolean[] = [
    true, true, true, true, true, true, true, true, true, true, true, true,
    true, false, false, true, true, false, false, true, true, false, false, true,
    true, false, false, true, true, false, false, true, true, false, false, true,
    true, true, true, true, true, true, true, true, true, true, true, true,
    true, false, false, true, true, false, false, true, true, false, false, true,
    true, false, false, true, true, false, false, true, true, false, false, true,
    true, true, true, true, true, true, true, true, true, true, true, true,
    true, false, false, true, true, false, false, true, true, false, false, true,
    true, false, false, true, true, false, false, true, true, false, false, true,
    true, true, true, true, true, true, true, true, true, true, true, true,
    true, false, false, true, true, false, false, true, true, false, false, true,
    true, false, false, true, true, false, false, true, true, false, false, true,
    true, true, true, true, true, true, true, true, true, true, true, true,
  ];
  return (
    <div
      className="grid h-full w-full grid-cols-12 gap-px bg-slate-200 p-2"
      aria-hidden
    >
      {cells.map((on, i) => (
        <div
          key={i}
          className={`aspect-square ${on ? "bg-slate-900" : "bg-white"}`}
        />
      ))}
    </div>
  );
}

type PortalVariant = "student" | "admin";

type Props = {
  studentId: string;
  initialRow: Record<string, unknown>;
  /** URL pré-assinada no servidor (evita esperar presign no cliente). */
  initialAvatarUrl?: string | null;
  /** Admin: mesma UI do portal, com remoção de documentos e navegação de staff. */
  variant?: PortalVariant;
  /** Admin: link do botão Voltar (ex.: /admin/alunos). */
  adminBackHref?: string;
  /** Aluno: layout com sidebar (rota /aluno). */
  embedStudentLayout?: boolean;
  /** Aluno: secção mostrada — portal (ficha) ou só validação. */
  studentView?: "portal" | "validacao";
};

const DOC_EXTS_REMOVE = ["pdf", "jpg", "jpeg", "png", "webp"] as const;

export function AlunoPortal({
  studentId,
  initialRow,
  initialAvatarUrl = null,
  variant = "student",
  adminBackHref = "/admin/alunos",
  embedStudentLayout = false,
  studentView = "portal",
}: Props) {
  const isAdmin = variant === "admin";
  const router = useRouter();
  const { confirm, dialog } = useConfirmDialog();
  const [row, setRow] = useState(initialRow);
  const [busyDoc, setBusyDoc] = useState<
    DocKey | "Foto estilo 3x4" | typeof FORMULARIO_MATRICULA_DOC_KEY | null
  >(null);
  const [globalErr, setGlobalErr] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    initialAvatarUrl ?? null,
  );
  const [avatarImgReady, setAvatarImgReady] = useState(false);
  /** Se a URL do servidor falhar no <img>, passa a usar presign no cliente (tentativas por extensão). */
  const [forceClientAvatar, setForceClientAvatar] = useState(false);
  const [avatarExtIdx, setAvatarExtIdx] = useState(0);
  const [photoRemoving, setPhotoRemoving] = useState(false);
  const [photoInputNonce, setPhotoInputNonce] = useState(0);
  const [certBusy, setCertBusy] = useState(false);
  const [gerarValidadorBusy, setGerarValidadorBusy] = useState(false);
  const [validacaoSuspensaBusy, setValidacaoSuspensaBusy] = useState(false);
  const [desistenteBusy, setDesistenteBusy] = useState(false);
  const [inadimplenteBusy, setInadimplenteBusy] = useState(false);
  const [deleteStudentBusy, setDeleteStudentBusy] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    setRow(initialRow);
  }, [initialRow]);

  const nome = typeof row.nome === "string" ? row.nome : null;
  const email = typeof row.email === "string" ? row.email : "";
  const dataMatriculaLabel = useMemo(
    () => formatAlunoDataMatriculaDisplay(row),
    [row],
  );

  const idadeAnos = useMemo(
    () => computeCompletedAgeYearsFromDtNasc(row.dt_nasc),
    [row.dt_nasc],
  );

  const adminCursoLabel = useMemo(() => {
    const c = row.curso;
    if (c == null || String(c).trim() === "") return "Não informado";
    return String(c).trim();
  }, [row.curso]);

  const adminEmissaoCertificadoLabel = useMemo(() => {
    const raw = row[COLUNA_HOMOLOGADO_EM];
    if (raw != null && String(raw).trim() !== "") {
      return formatHomologadoEmDisplay(raw);
    }
    if (isTruthyFlag(row.final)) return "Sem data registada";
    return "Ainda não emitido";
  }, [row]);

  const fotoOk = isTruthyFlag(row["Foto estilo 3x4"]);

  const docProgress = useMemo(() => {
    const keys = docKeysForRow(row);
    const total = keys.length;
    const done = keys.filter((k) => isTruthyFlag(row[k])).length;
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [row]);

  const pendencias = useMemo(() => computePendencias(row), [row]);

  const docsComplete = docProgress.done === docProgress.total;
  const certAlreadyFinal = isTruthyFlag(row.final);

  const adminCadastroStatus = useMemo(() => {
    if (isDesistente(row)) return "Desistente";
    if (isInadimplente(row)) return "Inadimplente";
    if (pendencias.totalCount > 0) return "Em andamento";
    if (certAlreadyFinal) {
      if (isValidacaoSuspensa(row)) return "Aprovado — pendência administrativa";
      return "Aprovado";
    }
    if (!isCertificadoSolicitado(row)) return "Aguarda solicitação (portal)";
    return "Em análise";
  }, [pendencias.totalCount, certAlreadyFinal, row]);

  const showCadastroSituacaoSelect =
    isAdmin &&
    !certAlreadyFinal &&
    (pendencias.totalCount > 0 || isDesistente(row));
  const certificationReady = isCertificationDataComplete(row);
  const canStartCertificate =
    isAdmin &&
    docsComplete &&
    !certAlreadyFinal &&
    !certBusy &&
    certificationReady;

  /** Com sidebar: validação fica em /aluno/validacao; na ficha não repetimos o bloco. */
  const showValidationTabContent =
    !isAdmin && embedStudentLayout && studentView === "validacao";
  const showPortalMainContent =
    isAdmin ||
    !embedStudentLayout ||
    (embedStudentLayout && studentView === "portal");

  /** Aba Validação: embaçado até aprovação ou se a instituição suspendeu a validação. */
  const validationLockedNoHomolog =
    showValidationTabContent && !certAlreadyFinal;
  const validationSuspensaBloqueado =
    showValidationTabContent &&
    !isAdmin &&
    certAlreadyFinal &&
    isValidacaoSuspensa(row);
  const validationBlur =
    validationLockedNoHomolog || validationSuspensaBloqueado;

  const codigoValidacao = useMemo(() => {
    const c = row.codigo_validacao;
    return typeof c === "string" ? c.trim() : "";
  }, [row]);

  const validationCodePreview = codigoValidacao || "XXXX-XXXX-XXXX-XXXX";

  const qrDisplayUrl = useMemo(() => {
    const u = row.qr_certificado_url;
    if (typeof u !== "string" || !u.trim()) return "";
    const trimmed = u.trim();
    // Se a URL gravada for absoluta (legado: vinha com NEXT_PUBLIC_APP_URL),
    // reescreve para o caminho relativo. Assim o `<img>` resolve na origem
    // atual — funciona em qualquer host (localhost, LAN, domínio real).
    const match = trimmed.match(/^https?:\/\/[^/]+(\/.*)$/);
    if (match) return match[1];
    return trimmed;
  }, [row]);

  /** Código e URL do QR já preenchidos — botão “Gerar validador” desativado. */
  const validatorFieldsComplete = useMemo(() => {
    return codigoValidacao.length > 0 && qrDisplayUrl.length > 0;
  }, [codigoValidacao, qrDisplayUrl]);

  async function copyValidationCode() {
    if (!codigoValidacao) return;
    try {
      await navigator.clipboard.writeText(codigoValidacao);
      setCodeCopied(true);
      window.setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      setGlobalErr("Não foi possível copiar. Selecione o código manualmente.");
    }
  }

  async function handleGerarValidador() {
    if (!isAdmin || validatorFieldsComplete || gerarValidadorBusy) return;
    setGlobalErr(null);
    setGerarValidadorBusy(true);
    try {
      const res = await fetch(
        `/api/admin/students/${studentId}/gerar-validador`,
        { method: "POST", credentials: "include" },
      );
      const { ok, error, data } = await readJsonResponse(res);
      if (!ok) {
        setGlobalErr(error ?? "Erro ao gerar validador.");
        return;
      }
      const cv = data.codigo_validacao;
      const qr = data.qr_certificado_url;
      setRow((prev) => ({
        ...prev,
        ...(typeof cv === "string" ? { codigo_validacao: cv } : {}),
        ...(typeof qr === "string" ? { qr_certificado_url: qr } : {}),
      }));
      router.refresh();
    } catch (e) {
      setGlobalErr(networkErrorMessage(e));
    } finally {
      setGerarValidadorBusy(false);
    }
  }

  async function handleValidacaoSuspensa(next: boolean) {
    if (!isAdmin || !canEditValidacaoSuspensa(row) || validacaoSuspensaBusy) {
      return;
    }
    setGlobalErr(null);
    setValidacaoSuspensaBusy(true);
    try {
      const res = await fetch(`/api/admin/students/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ validacao_suspensa: next }),
      });
      const { ok, error } = await readJsonResponse(res);
      if (!ok) {
        setGlobalErr(error ?? "Erro ao salvar.");
        return;
      }
      setRow((prev) => ({ ...prev, validacao_suspensa: next }));
      router.refresh();
    } catch (e) {
      setGlobalErr(networkErrorMessage(e));
    } finally {
      setValidacaoSuspensaBusy(false);
    }
  }

  async function handleDesistente(next: boolean) {
    if (!isAdmin || desistenteBusy) return;
    setGlobalErr(null);
    setDesistenteBusy(true);
    try {
      const res = await fetch(`/api/admin/students/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desistente: next }),
      });
      const { ok, error } = await readJsonResponse(res);
      if (!ok) {
        setGlobalErr(error ?? "Erro ao salvar situação.");
        return;
      }
      setRow((prev) => ({ ...prev, desistente: next }));
      router.refresh();
    } catch (e) {
      setGlobalErr(networkErrorMessage(e));
    } finally {
      setDesistenteBusy(false);
    }
  }

  async function handleInadimplente(next: boolean) {
    if (!isAdmin || inadimplenteBusy) return;
    setGlobalErr(null);
    setInadimplenteBusy(true);
    try {
      const res = await fetch(`/api/admin/students/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inadimplente: next }),
      });
      const { ok, error } = await readJsonResponse(res);
      if (!ok) {
        setGlobalErr(error ?? "Erro ao salvar inadimplência.");
        return;
      }
      setRow((prev) => ({ ...prev, inadimplente: next }));
      router.refresh();
    } catch (e) {
      setGlobalErr(networkErrorMessage(e));
    } finally {
      setInadimplenteBusy(false);
    }
  }

  async function handleDeleteStudent() {
    if (!isAdmin || deleteStudentBusy) return;
    const ok = await confirm({
      title: "Excluir aluno?",
      message: (
        <>
          Tem certeza de que deseja <strong>excluir este aluno permanentemente</strong>?
          A linha na base de dados, o perfil e a conta de login (Auth) serão
          removidos quando possível.
        </>
      ),
      confirmLabel: "Sim, excluir",
      cancelLabel: "Cancelar",
      variant: "danger",
    });
    if (!ok) return;
    setGlobalErr(null);
    setDeleteStudentBusy(true);
    try {
      const res = await fetch(`/api/admin/students/${studentId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const { ok, error } = await readJsonResponse(res);
      if (!ok) {
        setGlobalErr(error ?? "Erro ao excluir aluno.");
        return;
      }
      router.push(adminBackHref);
      router.refresh();
    } catch (e) {
      setGlobalErr(networkErrorMessage(e));
    } finally {
      setDeleteStudentBusy(false);
    }
  }

  async function handleIniciarCertificado() {
    if (!isAdmin || certBusy) return;
    setGlobalErr(null);
    setCertBusy(true);
    try {
      const res = await fetch(
        `/api/admin/students/${studentId}/iniciar-certificado`,
        {
          method: "POST",
          credentials: "include",
        },
      );
      const { ok, error } = await readJsonResponse(res);
      if (!ok) {
        setGlobalErr(error ?? "Erro ao iniciar certificado.");
        return;
      }
      setRow((prev) => ({ ...prev, final: true }));
      router.refresh();
    } catch (e) {
      setGlobalErr(networkErrorMessage(e));
    } finally {
      setCertBusy(false);
    }
  }

  useEffect(() => {
    setAvatarImgReady(false);
  }, [avatarUrl]);

  useEffect(() => {
    if (!fotoOk) {
      setAvatarUrl(null);
      setAvatarExtIdx(0);
      setForceClientAvatar(false);
      return;
    }
    if (initialAvatarUrl && !forceClientAvatar) {
      setAvatarUrl(initialAvatarUrl);
      return;
    }
    let cancelled = false;
    const ext = AVATAR_B2_EXTENSIONS_FOR_PURGE[avatarExtIdx] ?? "jpg";
    const key = avatarPathForStudent(studentId, ext);
    fetchPresignedGetUrl(key)
      .then((u) => {
        if (!cancelled) setAvatarUrl(u);
      })
      .catch(() => {
        if (!cancelled) setAvatarUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [fotoOk, studentId, avatarExtIdx, initialAvatarUrl, forceClientAvatar]);

  async function setDocColumn(
    docKey:
      | DocKey
      | typeof FORMULARIO_MATRICULA_DOC_KEY
      | "Foto estilo 3x4",
    value: string,
  ) {
    const url = isAdmin
      ? `/api/admin/students/${encodeURIComponent(studentId)}/ficha`
      : "/api/aluno/dados";
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ [docKey]: value }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(j.error ?? "Erro ao guardar o documento.");
    }
  }

  async function mergeRegistroEscolarSeAtribuido() {
    try {
      const registroUrl = isAdmin
        ? `/api/admin/students/${encodeURIComponent(studentId)}/ensure-registro-escolar`
        : "/api/aluno/ensure-registro-escolar";
      const res = await fetch(registroUrl, {
        method: "POST",
        credentials: "include",
      });
      const j = (await res.json()) as {
        ok?: boolean;
        assigned?: boolean;
        numero_registro?: string;
        livro?: number;
        pagina?: number;
      };
      if (res.ok && j.ok && j.assigned && j.numero_registro) {
        setRow((prev) => ({
          ...prev,
          numero_registro: j.numero_registro,
          livro: j.livro,
          pagina: j.pagina,
        }));
      }
    } catch {
      /* não bloqueia o fluxo do documento */
    }
  }

  async function handleDocUpload(
    docKey: DocKey | "Foto estilo 3x4",
    file: File | null,
  ) {
    if (!file) return;
    setGlobalErr(null);
    setBusyDoc(docKey);
    try {
      const ext =
        docKey === "Foto estilo 3x4"
          ? (file.name.split(".").pop() ?? "").toLowerCase()
          : (file.name.split(".").pop() ?? "pdf").toLowerCase();

      if (docKey === "Foto estilo 3x4") {
        const pol = assertAvatarPhotoAllowed(ext, file.type ?? "");
        if (!pol.ok) throw new Error(pol.error);
        await deleteB2Objects(allAvatarStorageKeys(studentId));
      }

      const key = b2ObjectKeyForDoc(studentId, docKey, ext);
      await uploadFileToB2(key, file);
      await setDocColumn(docKey, tableValueAfterUpload());
      setRow((prev) => ({ ...prev, [docKey]: tableValueAfterUpload() }));
      if (docKey === "Foto estilo 3x4") {
        setAvatarExtIdx(0);
        setAvatarImgReady(false);
        try {
          const u = await fetchPresignedGetUrl(key);
          setAvatarUrl(u);
        } catch {
          setAvatarUrl(null);
        }
      }
      await mergeRegistroEscolarSeAtribuido();
      router.refresh();
      fireDataUpdatedWebhook({
        studentId,
        fileKey: key,
        label:
          docKey === "Foto estilo 3x4" ? "Foto estilo 3x4" : DOC_LABELS[docKey],
      });
    } catch (e) {
      setGlobalErr(networkErrorMessage(e));
    } finally {
      setBusyDoc(null);
    }
  }

  async function handleRemoveDocument(
    docKey: DocKey | typeof FORMULARIO_MATRICULA_DOC_KEY,
  ) {
    if (!isAdmin || busyDoc !== null) return;
    setGlobalErr(null);
    setBusyDoc(docKey);
    try {
      const keys = DOC_EXTS_REMOVE.map((ext) =>
        b2ObjectKeyForDoc(studentId, docKey, ext),
      );
      await deleteB2Objects(keys);
      await setDocColumn(docKey, tableValueDocPending());
      setRow((prev) => ({ ...prev, [docKey]: tableValueDocPending() }));
      router.refresh();
    } catch (e) {
      setGlobalErr(networkErrorMessage(e));
    } finally {
      setBusyDoc(null);
    }
  }

  async function handleRemovePhoto3x4() {
    if (!fotoOk || busyDoc !== null) return;
    setGlobalErr(null);
    setPhotoRemoving(true);
    setBusyDoc("Foto estilo 3x4");
    try {
      const keys = allAvatarStorageKeys(studentId);
      await deleteB2Objects(keys);
      await setDocColumn("Foto estilo 3x4", tableValueDocPending());
      setRow((prev) => ({
        ...prev,
        ["Foto estilo 3x4"]: tableValueDocPending(),
      }));
      setAvatarUrl(null);
      setAvatarExtIdx(0);
      setPhotoInputNonce((n) => n + 1);
      router.refresh();
    } catch (e) {
      setGlobalErr(networkErrorMessage(e));
    } finally {
      setPhotoRemoving(false);
      setBusyDoc(null);
    }
  }

  const showTopHeader = !embedStudentLayout || isAdmin;

  return (
    <>
      {dialog}
      <div
        className={
          embedStudentLayout && !isAdmin
            ? "min-h-full"
            : "min-h-screen bg-gradient-to-br from-slate-50 via-[#f0f7ff] to-[#e3f0ff]"
        }
      >
        {showTopHeader ? (
      <header className="sticky top-0 z-20 border-b border-white/40 bg-white/75 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:px-6 md:flex-row md:items-center md:justify-between md:py-4">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <Image
              src={BRAND_LOGO_URL}
              alt="ProEduka"
              width={120}
              height={32}
              className="h-6 w-auto shrink-0 object-contain opacity-90 sm:h-7"
            />
            <div className="hidden h-8 w-px shrink-0 bg-slate-200 sm:block" />
            <span className="min-w-0 truncate text-xs font-semibold text-[#D9571E] sm:text-sm">
              {isAdmin ? "Ficha do aluno" : "Portal do aluno"}
            </span>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3 md:justify-end">
            {isAdmin ? (
              <>
                <Link
                  href={adminBackHref}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-[#D9571E] transition hover:bg-slate-100"
                >
                  Voltar
                </Link>
                <button
                  type="button"
                  disabled={deleteStudentBusy || certBusy}
                  onClick={() => void handleDeleteStudent()}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-100 disabled:opacity-50"
                >
                  {deleteStudentBusy ? "A excluir…" : "Excluir aluno"}
                </button>
                <button
                  type="button"
                  disabled={!canStartCertificate}
                  title={
                    !docsComplete
                      ? "Disponível quando todos os documentos estiverem enviados."
                      : !certificationReady
                        ? "Preencha matrícula e todas as notas (7–10)."
                        : certAlreadyFinal
                          ? "Certificado já iniciado para este aluno."
                          : "Aprovar aluno, gerar/confirmar certificado e disparar integrações."
                  }
                  onClick={() => void handleIniciarCertificado()}
                  className="inline-flex min-h-[40px] items-center justify-center rounded-xl bg-gradient-to-br from-[#F66828] to-[#D9571E] px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {certBusy ? "A processar…" : "Iniciar certificado"}
                </button>
                <Link
                  href="/admin"
                  className="text-sm font-medium text-[#F66828] hover:underline"
                >
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/"
                  className="text-sm font-medium text-[#F66828] hover:underline"
                >
                  Site
                </Link>
                <AlunoLogoutButton />
              </>
            )}
          </div>
        </div>
      </header>
      ) : null}

      <div
        className={
          embedStudentLayout && !isAdmin
            ? "mx-auto max-w-5xl"
            : "mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10"
        }
      >
        {globalErr ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {globalErr}
          </div>
        ) : null}

        {isAdmin &&
        !certAlreadyFinal &&
        docsComplete &&
        certificationReady ? (
          <p className="mb-6 text-sm leading-relaxed text-slate-600">
            Antes de iniciar a certificação, confira as informações do aluno.
          </p>
        ) : null}

        {showValidationTabContent ? (
          <section className="relative overflow-hidden rounded-3xl border border-[#c8d6e6] bg-white/95 p-6 pt-7 shadow-lg shadow-slate-300/30 sm:p-8 sm:pt-9">
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#F66828] via-[#D9571E] to-[#FF9D4D] opacity-90"
              aria-hidden
            />
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#F66828]">
              Validação
            </p>
            <h2 className="mt-2 text-lg font-bold text-[#D9571E]">
              Seu certificado e conferência pública
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Use o QR Code à esquerda ou o código abaixo para provar que o seu
              certificado é válido. No validador público você confere o registo
              sem precisar de login.
            </p>

            <>
                  <div className="relative mt-6 flex flex-col gap-8 sm:flex-row sm:items-start sm:gap-10">
                    <div className="flex shrink-0 flex-col items-center sm:w-48">
                      <div
                        className={`relative flex h-44 w-44 items-center justify-center overflow-hidden rounded-2xl border border-[#b0c4d9] bg-white shadow-inner ${
                          validationBlur
                            ? "ring-2 ring-slate-200/80"
                            : ""
                        }`}
                      >
                        <div
                          className={
                            validationBlur
                              ? "pointer-events-none select-none blur-[7px] brightness-[0.92]"
                              : ""
                          }
                          aria-hidden={validationBlur ? true : undefined}
                        >
                          {qrDisplayUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element -- URL externa (Backblaze)
                            <img
                              src={qrDisplayUrl}
                              alt="QR Code do certificado"
                              className="h-full w-full object-contain p-2"
                            />
                          ) : validationLockedNoHomolog ? (
                            <AlunoQrPlaceholder />
                          ) : (
                            <span className="px-3 text-center text-xs text-slate-500">
                              QR Code ainda indisponível. Use o código ao lado.
                            </span>
                          )}
                        </div>
                        {validationBlur ? (
                          <div
                            className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-gradient-to-b from-white/25 to-slate-100/35 backdrop-blur-[1px]"
                            aria-hidden
                          >
                            <span className="rounded-full bg-white/90 px-3 py-1 text-center text-[0.65rem] font-bold uppercase tracking-wider text-slate-600 shadow-sm ring-1 ring-slate-200/80">
                              {validationLockedNoHomolog
                                ? "Aguardando aprovação"
                                : "Validação suspensa"}
                            </span>
                          </div>
                        ) : null}
                      </div>
                      <p className="mt-2 text-center text-[0.65rem] text-slate-500">
                        Escaneie com a câmera do telemóvel
                      </p>
                    </div>

                    <div className="min-w-0 flex-1 space-y-5">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          Como conferir
                        </p>
                        <ol className="mt-2 list-inside list-decimal space-y-1.5 text-sm text-slate-600">
                          <li>
                            Abra a página do validador (botão abaixo) ou aponte
                            a câmera para o QR Code.
                          </li>
                          <li>
                            Se abrir pelo site, cole o seu código no campo ou
                            deixe o link já preenchido.
                          </li>
                          <li>
                            O sistema mostra se o certificado consta como
                            válido e aprovado.
                          </li>
                        </ol>
                      </div>

                      <div
                        className={
                          validationBlur
                            ? "pointer-events-none select-none blur-[5px]"
                            : ""
                        }
                      >
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
                          Seu código de validação
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <code className="min-w-0 flex-1 break-all rounded-xl border border-[#b0c4d9] bg-slate-50 px-3 py-2.5 font-mono text-sm text-slate-900">
                            {validationBlur ? validationCodePreview : codigoValidacao || "—"}
                          </code>
                          <button
                            type="button"
                            disabled={!codigoValidacao || validationBlur}
                            onClick={() => void copyValidationCode()}
                            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-[#F66828] bg-white px-4 py-2.5 text-sm font-semibold text-[#D9571E] shadow-sm transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {codeCopied ? "Copiado!" : "Copiar código"}
                          </button>
                        </div>
                      </div>

                      <div
                        className={
                          validationBlur
                            ? "pointer-events-none select-none opacity-45 blur-[2px]"
                            : ""
                        }
                      >
                        <Link
                          href={
                            codigoValidacao
                              ? `/validador?c=${encodeURIComponent(codigoValidacao)}`
                              : "/validador"
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          tabIndex={validationBlur ? -1 : undefined}
                          aria-disabled={validationBlur}
                          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-br from-[#F66828] to-[#D9571E] px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-95"
                        >
                          Abrir página do validador
                        </Link>
                        <p className="mt-2 text-xs text-slate-500">
                          Abre num novo separador. O validador não pede senha.
                        </p>
                      </div>
                    </div>
                  </div>

                  {validationLockedNoHomolog ? (
                    <div className="mt-8 rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/95 to-amber-100/40 px-4 py-4 text-center shadow-sm sm:px-6">
                      <p className="text-sm font-semibold text-amber-950">
                        Validação ainda não liberada
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-amber-950/85">
                        Quando a instituição aprovar o seu certificado, o
                        desfoque será removido e você poderá usar o QR Code,
                        copiar o código e conferir no validador público.
                      </p>
                    </div>
                  ) : null}
                  {validationSuspensaBloqueado ? (
                    <div className="mt-8 rounded-2xl border border-rose-200/90 bg-gradient-to-br from-rose-50/95 to-rose-100/30 px-4 py-4 text-center shadow-sm sm:px-6">
                      <p className="text-sm font-semibold text-rose-950">
                        Validação temporariamente indisponível
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-rose-950/90">
                        A instituição marcou pendência administrativa neste
                        certificado (por exemplo, pagamento ou conferência
                        interna). O código e o QR não podem ser usados como
                        comprovação pública até a situação ser regularizada.
                      </p>
                    </div>
                  ) : null}
            </>
          </section>
        ) : null}

        {showPortalMainContent ? (
          <>
        {/* Hero + avatar */}
        <section className="relative overflow-hidden rounded-3xl border border-[#c8d6e6] bg-white/90 p-6 shadow-xl shadow-slate-300/30 sm:p-8">
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-[#F66828]/20 to-[#D9571E]/10 blur-3xl"
            aria-hidden
          />
          <div className="relative flex flex-col gap-8 md:flex-row md:items-start md:gap-10">
            <div className="flex flex-col items-center md:items-start">
              <div className="group relative h-36 w-36 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 ring-4 ring-white shadow-lg">
                {!fotoOk ? (
                  <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-slate-500">
                    {(nome ?? email ?? "?").charAt(0).toUpperCase()}
                  </div>
                ) : (
                  <>
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
                        style={{ opacity: avatarImgReady ? 1 : 0 }}
                        decoding="async"
                        onLoad={() => setAvatarImgReady(true)}
                        onError={() => {
                          setAvatarImgReady(false);
                          if (!forceClientAvatar && initialAvatarUrl) {
                            setForceClientAvatar(true);
                            setAvatarExtIdx(0);
                            setAvatarUrl(null);
                            return;
                          }
                          if (avatarExtIdx < AVATAR_B2_EXTENSIONS_FOR_PURGE.length - 1) {
                            setAvatarExtIdx((i) => i + 1);
                          } else {
                            setAvatarUrl(null);
                          }
                        }}
                      />
                    ) : null}
                    {(!avatarUrl || !avatarImgReady) && fotoOk ? (
                      <div
                        className="absolute inset-0 z-[1] flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#eef6ff]/95 via-white/90 to-slate-100/95 backdrop-blur-[3px]"
                        aria-busy
                        aria-live="polite"
                      >
                        <BrandLoaderOrb size="md" aria-label="Carregando foto" />
                        <span
                          aria-hidden
                          className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D9571E]/90"
                        >
                          Carregando foto
                        </span>
                      </div>
                    ) : null}
                  </>
                )}
                {fotoOk ? (
                  <div className="pointer-events-none absolute inset-0 flex items-start justify-end p-1.5 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100">
                    <button
                      type="button"
                      title="Remover foto"
                      aria-label="Remover foto 3 por 4"
                      disabled={busyDoc !== null}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void handleRemovePhoto3x4();
                      }}
                      className="pointer-events-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/55 text-lg font-bold leading-none text-white shadow-md ring-2 ring-white/90 transition hover:bg-red-600 disabled:opacity-40"
                    >
                      ×
                    </button>
                  </div>
                ) : null}
              </div>
              <label className="mt-4 cursor-pointer">
                <span className="inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-[#F66828] to-[#D9571E] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-95">
                  {busyDoc === "Foto estilo 3x4"
                    ? photoRemoving
                      ? "Removendo…"
                      : "Enviando…"
                    : fotoOk
                      ? "Enviar outra foto"
                      : "Enviar foto 3×4"}
                </span>
                <input
                  key={photoInputNonce}
                  type="file"
                  accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                  className="sr-only"
                  disabled={busyDoc !== null}
                  onChange={(e) =>
                    handleDocUpload(
                      "Foto estilo 3x4",
                      e.target.files?.[0] ?? null,
                    )
                  }
                />
              </label>
              <p className="mt-2 max-w-[200px] text-center text-[0.7rem] leading-snug text-slate-600 md:text-left">
                Foto tipo documento (JPG ou PNG), rosto visível, fundo neutro.
              </p>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#F66828]">
                {isAdmin ? "Cadastro" : "Bem-vindo"}
              </p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#D9571E] sm:text-3xl">
                {nome ?? "Aluno"}
              </h1>
              {idadeAnos !== null ? (
                <p className="mt-1 text-sm text-slate-700">
                  <span className="font-semibold text-slate-500">
                    Idade:
                  </span>{" "}
                  {idadeAnos} {idadeAnos === 1 ? "ano" : "anos"}
                </p>
              ) : null}
              <p className="mt-1 truncate text-sm text-slate-700">{email}</p>
              <p className="mt-2 text-xs text-slate-600">
                <span className="font-semibold text-slate-500">
                  Data da matrícula:
                </span>{" "}
                {dataMatriculaLabel}
              </p>
              {isAdmin ? (
                <>
                  <p className="mt-1.5 text-xs text-slate-600">
                    <span className="font-semibold text-slate-500">Curso:</span>{" "}
                    {adminCursoLabel}
                  </p>
                  <p className="mt-1.5 text-xs text-slate-600">
                    <span className="font-semibold text-slate-500">
                      Emissão do certificado:
                    </span>{" "}
                    {adminEmissaoCertificadoLabel}
                  </p>
                </>
              ) : null}

              <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#D9571E] to-[#F66828] text-sm font-bold text-white shadow-lg">
                    {docProgress.pct}%
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Progresso do cadastro
                    </p>
                    <p className="text-xs text-slate-600">
                      {docProgress.done} de {docProgress.total} documentos
                      concluídos
                    </p>
                  </div>
                </div>
                {isAdmin ? (
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-0 sm:max-w-md sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-x-3 sm:gap-y-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 sm:justify-end">
                      <span className="text-[0.65rem] font-bold uppercase tracking-wide text-slate-500">
                        Status
                      </span>
                      {showCadastroSituacaoSelect ? (
                        <select
                          disabled={desistenteBusy}
                          value={isDesistente(row) ? "desistente" : "andamento"}
                          title="Situação do cadastro antes da aprovação do certificado"
                          onChange={(e) => {
                            void handleDesistente(
                              e.target.value === "desistente",
                            );
                          }}
                          className="max-w-[min(100%,220px)] rounded-lg border border-slate-200 bg-white py-1.5 pl-2 pr-8 text-sm font-semibold text-[#D9571E] shadow-sm outline-none ring-0 transition focus:border-[#F66828] focus:ring-2 focus:ring-[#F66828]/25 disabled:opacity-50"
                        >
                          <option value="andamento">Em andamento</option>
                          <option value="desistente">Desistente</option>
                        </select>
                      ) : (
                        <span className="max-w-[220px] truncate text-sm font-semibold text-[#D9571E] sm:max-w-[200px]">
                          {adminCadastroStatus}
                        </span>
                      )}
                    </div>
                    {isAdmin ? (
                      <label className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:max-w-[220px]">
                        <span className="shrink-0 text-[0.65rem] font-bold uppercase tracking-wide text-slate-500">
                          Financeiro
                        </span>
                        <select
                          disabled={inadimplenteBusy}
                          value={isInadimplente(row) ? "inad" : "ok"}
                          title="Inadimplente: pagamento ou situação financeira em atraso (critério da instituição)."
                          onChange={(e) => {
                            void handleInadimplente(e.target.value === "inad");
                          }}
                          className="min-h-0 max-w-full flex-1 rounded-lg border border-slate-200 bg-white py-1.5 pl-2 pr-7 text-xs font-medium text-slate-800 shadow-sm outline-none ring-0 transition focus:border-[#F66828] focus:ring-2 focus:ring-[#F66828]/25 disabled:opacity-50"
                        >
                          <option value="ok">Em dia</option>
                          <option value="inad">Inadimplente</option>
                        </select>
                      </label>
                    ) : null}
                    {canEditValidacaoSuspensa(row) ? (
                      <label className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:max-w-[200px]">
                        <span className="shrink-0 text-[0.65rem] font-bold uppercase tracking-wide text-slate-500">
                          Validador
                        </span>
                        <select
                          disabled={validacaoSuspensaBusy}
                          value={isValidacaoSuspensa(row) ? "pend" : "ok"}
                          title={
                            isValidacaoSuspensa(row)
                              ? "Pendência administrativa — validação pública bloqueada"
                              : "Validação pública permitida no site"
                          }
                          onChange={(e) => {
                            const next = e.target.value === "pend";
                            void handleValidacaoSuspensa(next);
                          }}
                          className="min-h-0 max-w-full flex-1 rounded-lg border border-slate-200 bg-white py-1.5 pl-2 pr-7 text-xs font-medium text-slate-800 shadow-sm outline-none ring-0 transition focus:border-[#F66828] focus:ring-2 focus:ring-[#F66828]/25 disabled:opacity-50"
                        >
                          <option value="ok">OK público</option>
                          <option value="pend">Pend. adm.</option>
                        </select>
                      </label>
                    ) : null}
                    <button
                      type="button"
                      disabled={validatorFieldsComplete || gerarValidadorBusy}
                      title={
                        validatorFieldsComplete
                          ? "Código e QR de validação já estão preenchidos."
                          : "Gera o código e o QR quando a linha ainda estiver vazia (alunos antigos importados)."
                      }
                      onClick={() => void handleGerarValidador()}
                      className="inline-flex min-h-[32px] shrink-0 items-center justify-center rounded-lg border border-[#F66828]/40 bg-white px-3 py-1.5 text-xs font-semibold text-[#D9571E] shadow-sm transition hover:border-[#F66828] hover:bg-sky-50/90 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      {gerarValidadorBusy ? "A gerar…" : "Gerar validador"}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {showPortalMainContent ? (
          <AlunoCursosCard
            alunoId={studentId}
            variant={isAdmin ? "admin" : "student"}
          />
        ) : null}

        {!isAdmin && pendencias.totalCount > 0 ? (
          <PendenciasCallout pendencias={pendencias} />
        ) : null}

        <AlunoDadosForm
          studentId={studentId}
          row={row}
          setRow={setRow}
          setGlobalErr={setGlobalErr}
          variant={variant}
          matriculaAssinaturaSlot={
            <MatriculaDocumentoCard
              row={row}
              setRow={setRow}
              isAdmin={isAdmin}
              cadastroCompleto={pendencias.informacoes.length === 0}
              busyDoc={busyDoc}
              setBusyDoc={setBusyDoc}
              setGlobalErr={setGlobalErr}
              onRemoveDocument={handleRemoveDocument}
            />
          }
        />

        {isAdmin ? (
          <AdminAlunoCertificacaoPanel />
        ) : null}

        {/* Documentos */}
        <section className="mt-8 rounded-3xl border border-[#c8d6e6] bg-white/90 p-6 shadow-lg shadow-slate-300/35 sm:p-8">
          <h2 className="text-lg font-bold text-[#D9571E]">Documentos</h2>
          <p className="mt-1 text-sm text-slate-600">
            {isAdmin
              ? "Envie ou remova arquivos; o status do aluno atualiza na hora. Use “Remover envio” se o arquivo estiver ilegível — volta a ficar pendente. O formulário de matrícula com assinatura digital está na secção acima (só o aluno pode concluir no portal dele)."
              : "Envie PDF ou imagem legível nos documentos abaixo. O formulário de matrícula com assinatura digital está na secção acima (use o botão Assinar; não envie arquivo nesse item)."}
          </p>

          <ul className="mt-6 space-y-4">
            {docKeysForRow(row).map((docKey) => {
              const done = isTruthyFlag(row[docKey]);

              return (
                <li
                  key={docKey}
                  className="flex flex-col gap-3 rounded-2xl border border-[#b0c4d9] bg-gradient-to-br from-white to-slate-50/80 p-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        done
                          ? "bg-emerald-500 text-white shadow-sm"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {done ? "✓" : "!"}
                    </span>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-semibold text-slate-900">
                        {DOC_LABELS[docKey]}
                      </p>
                      {done ? (
                        <p className="text-xs font-medium text-emerald-700">
                          Enviado e registrado
                        </p>
                      ) : (
                        <p className="text-xs text-amber-800">
                          Pendente de envio
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 sm:max-w-md sm:min-w-[280px]">
                    {!done ? (
                      <label className="block cursor-pointer">
                        <span className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border-2 border-[#F66828]/40 bg-white px-4 py-2 text-sm font-semibold text-[#D9571E] shadow-sm transition hover:border-[#F66828] hover:bg-sky-50 sm:w-auto">
                          {busyDoc === docKey ? "Enviando…" : "Enviar arquivo"}
                        </span>
                        <input
                          type="file"
                          accept="application/pdf,image/*"
                          className="sr-only"
                          disabled={busyDoc !== null}
                          onChange={(e) =>
                            handleDocUpload(
                              docKey,
                              e.target.files?.[0] ?? null,
                            )
                          }
                        />
                      </label>
                    ) : done ? (
                      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
                        <span className="inline-flex items-center justify-center rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                          Concluído
                        </span>
                        {isAdmin ? (
                          <button
                            type="button"
                            disabled={busyDoc !== null}
                            onClick={() => void handleRemoveDocument(docKey)}
                            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-950 transition hover:bg-amber-100 disabled:opacity-50"
                          >
                            {busyDoc === docKey ? "Removendo…" : "Remover envio"}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {isAdmin && typeof row.email === "string" && row.email.trim() ? (
          <AdminStudentPasswordReset
            studentId={studentId}
            studentEmail={row.email.trim()}
          />
        ) : null}
          </>
        ) : null}
      </div>
    </div>
    </>
  );
}
