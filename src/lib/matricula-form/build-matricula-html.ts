import { escapeHtml } from "@/lib/matricula-form/html-escape";
import type { MatriculaPrefill } from "@/lib/matricula-form/map-row-to-matricula";

export type BuildMatriculaHtmlParams = {
  prefill: MatriculaPrefill;
  /** data:image/png;base64,... */
  signatureDataUrl: string;
  logoDataUrl: string;
  signDay: string;
  signMonth: string;
  signYear: string;
  /** Linha de auditoria (hash + timestamp). */
  auditLine: string;
};

function sexoDisplay(mfo: string): string {
  if (mfo === "M") return "Masculino";
  if (mfo === "F") return "Feminino";
  return "Outro";
}

function estadoCivilDisplay(code: string): string {
  const m: Record<string, string> = {
    S: "Solteiro",
    C: "Casado",
    D: "Divorciado",
    V: "Viúvo",
    U: "União estável",
    P: "Separado(a)",
  };
  return m[code] ?? "";
}

/**
 * HTML A4 do formulário de matrícula — layout alinhado ao modelo visual original.
 * Texto preto nos campos (inputs, não selects) para o PDF.
 * Sem `margin-top: auto` na assinatura (isso empurrava conteúdo para uma 2.ª página).
 * O encaixe em uma folha é afinado em `render-html-to-pdf` com `scale` no PDF, não
 * reduzindo fontes/gaps do formulário aqui.
 */
export function buildMatriculaHtml(p: BuildMatriculaHtmlParams): string {
  const x = escapeHtml;
  const pref = p.prefill;
  const ec = pref.estadoCivilCode;
  const sexoTxt = sexoDisplay(pref.sexoMfo);
  const ecTxt = estadoCivilDisplay(ec) || "—";
  const defTxt = pref.deficienciaSimOuNao || "—";
  const dataExp = pref.dataExpRg.trim() || "—";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Formulário de Matrícula Digital - ProEduka</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{background-color:#f0f0f0;font-family:Arial,Helvetica,sans-serif;display:flex;justify-content:center;padding:20px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.page{background-color:#fff;width:210mm;min-height:297mm;position:relative;padding:50px 60px;box-shadow:0 0 10px rgba(0,0,0,.1);color:#000;}
.page::before{content:'';position:absolute;left:0;top:0;bottom:0;width:6px;background-color:#007bff;}
.page::after{content:'';position:absolute;right:0;top:0;bottom:0;width:6px;background-color:#ff5e00;}
header{text-align:center;margin-bottom:40px;}
.logo{margin-bottom:20px;display:inline-block;}
.logo img{max-width:200px;height:auto;}
h1{font-size:16px;font-weight:bold;color:#000;letter-spacing:.5px;}
form{display:flex;flex-direction:column;gap:20px;}
.row{display:flex;gap:15px;width:100%;align-items:flex-end;}
.field{display:flex;align-items:flex-end;position:relative;min-width:0;}
.field label{font-size:11px;font-weight:bold;margin-right:5px;white-space:nowrap;text-transform:uppercase;color:#000;}
.field input{border:none;border-bottom:1px solid #000;flex-grow:1;min-width:0;font-family:inherit;font-size:14px;padding:2px 0;outline:none;background:#fff!important;color:#000!important;-webkit-text-fill-color:#000;opacity:1;}
.date-field{min-width:0;flex-shrink:0;}
.date-field input{max-width:135px;flex-grow:0;}
/* Linha nascimento: larguras fixas para DATA NASC não invadir SEXO (sem mudar tamanho de fonte) */
.row-nasc .field-nasc{flex:0 1 26%;max-width:26%;}
.row-nasc .field-sexo{flex:0 1 24%;max-width:24%;}
.row-nasc .field-ec{flex:1 1 48%;min-width:0;}
.flex-1{flex:1;}.flex-2{flex:2;}.flex-3{flex:3;}.flex-4{flex:4;}
.declaration{margin:36px 30px 28px;text-align:center;page-break-inside:avoid;}
.declaration p{font-size:12px;font-weight:bold;line-height:1.6;color:#000;}
.sign-date-area{text-align:center;margin:18px 0 0;display:flex;align-items:flex-end;justify-content:center;gap:2px;}
.sign-seg{border:none;border-bottom:1.5px solid #000;font-size:14px;font-family:inherit;font-weight:bold;text-align:center;width:32px;outline:none;background:#fff;color:#000;padding:2px 0;}
.sign-seg-year{width:52px;}
.sign-sep{font-size:16px;font-weight:bold;color:#000;line-height:1;padding-bottom:2px;}
.signature-area{text-align:center;margin-top:20px;margin-bottom:28px;page-break-inside:avoid;}
.sig-img-wrap{margin:0 auto 4px;max-width:78%;}
.sig-img-wrap img{max-height:72px;max-width:100%;object-fit:contain;}
.sig-label{font-size:10px;font-weight:bold;color:#000;margin-top:0;line-height:1.25;}
.sig-legal{font-size:9px;font-weight:bold;color:#222;margin-top:8px;line-height:1.4;}
.audit{font-size:8px;color:#333;margin-top:10px;line-height:1.3;word-break:break-all;}
footer{margin-top:12px;padding:8px 0 10px;border-top:1px solid #ddd;display:grid;grid-template-columns:repeat(4,1fr);gap:8px 10px;font-size:10px;font-weight:bold;color:#000;text-align:center;align-items:center;page-break-inside:avoid;}
.footer-cell{min-width:0;word-break:break-word;line-height:1.25;}
.footer-line{display:inline-flex;max-width:100%;align-items:center;justify-content:center;gap:5px;}
.footer-icon{display:block;width:13px;height:13px;flex-shrink:0;color:#000;}
</style>
</head>
<body>
<div class="page">
<header>
<div class="logo">
<img src="${p.logoDataUrl}" alt="ProEduka"/>
</div>
<h1>FORMULÁRIO DE MATRÍCULA</h1>
</header>
<form>
<div class="row">
<div class="field flex-1">
<label>NOME COMPLETO:</label>
<input type="text" readonly value="${x(pref.nomeCompleto)}"/>
</div>
</div>
<div class="row">
<div class="field flex-2">
<label>CPF:</label>
<input type="text" readonly value="${x(pref.cpf)}"/>
</div>
<div class="field flex-3">
<label>EMAIL:</label>
<input type="text" readonly value="${x(pref.email)}"/>
</div>
</div>
<div class="row">
<div class="field flex-2">
<label>RG:</label>
<input type="text" readonly value="${x(pref.rg)}"/>
</div>
<div class="field flex-2">
<label>ÓRGÃO EXP.:</label>
<input type="text" readonly value="${x(pref.orgaoExp)}"/>
</div>
<div class="field flex-2 date-field">
<label>DATA EXP:</label>
<input type="text" readonly value="${x(dataExp)}"/>
</div>
</div>
<div class="row">
<div class="field flex-1">
<label>FILIAÇÃO:</label>
<input type="text" readonly value="${x(pref.filiacao)}"/>
</div>
</div>
<div class="row row-nasc">
<div class="field field-nasc date-field">
<label>DATA NASC:</label>
<input type="text" readonly value="${x(pref.dataNasc)}"/>
</div>
<div class="field field-sexo">
<label>SEXO:</label>
<input type="text" readonly value="${x(sexoTxt)}"/>
</div>
<div class="field field-ec">
<label>ESTADO CIVIL:</label>
<input type="text" readonly value="${x(ecTxt)}"/>
</div>
</div>
<div class="row">
<div class="field flex-4">
<label>RUA:</label>
<input type="text" readonly value="${x(pref.rua)}"/>
</div>
<div class="field flex-1">
<label>Nº:</label>
<input type="text" readonly value="${x(pref.numero)}"/>
</div>
</div>
<div class="row">
<div class="field flex-1">
<label>CIDADE:</label>
<input type="text" readonly value="${x(pref.cidade)}"/>
</div>
<div class="field flex-1">
<label>BAIRRO:</label>
<input type="text" readonly value="${x(pref.bairro)}"/>
</div>
</div>
<div class="row">
<div class="field flex-2">
<label>COMPLEMENTO:</label>
<input type="text" readonly value="${x(pref.complemento)}"/>
</div>
<div class="field flex-1">
<label>CEP:</label>
<input type="text" readonly value="${x(pref.cep)}"/>
</div>
</div>
<div class="row">
<div class="field flex-1">
<label>TELEFONE:</label>
<input type="text" readonly value="${x(pref.telefone)}"/>
</div>
</div>
<div class="row">
<div class="field flex-1">
<label>POSSUI DEFICIÊNCIA:</label>
<input type="text" readonly value="${x(defTxt)}"/>
</div>
</div>
</form>
<div class="declaration">
<p>Declaro ter apresentado xerox da documentação necessária para o ingresso, no<br/>
ato da matrícula, me comprometendo a apresentar qualquer xerox de<br/>
documentação pendente até a primeira semana de aula, conforme está disposto<br/>
no calendário acadêmico da instituição.</p>
</div>
<div class="sign-date-area">
<input type="text" readonly class="sign-seg" value="${x(p.signDay)}"/>
<span class="sign-sep">/</span>
<input type="text" readonly class="sign-seg" value="${x(p.signMonth)}"/>
<span class="sign-sep">/</span>
<input type="text" readonly class="sign-seg sign-seg-year" value="${x(p.signYear)}"/>
</div>
<div class="signature-area">
<div class="sig-img-wrap">
<img src="${p.signatureDataUrl}" alt="Assinatura"/>
</div>
<div class="sig-label">Assinatura do (a) aluno (a) ou Responsável</div>
<p class="sig-legal">
Assinatura eletrônica avançada: ao traçar a assinatura acima, o signatário declara ciência e concordância com o conteúdo deste formulário,
nos termos da Medida Provisória nº 2.200-2/2001. O documento PDF gerado, com carimbo de data e identificador abaixo, constitui cópia autêntica para fins de registro acadêmico.
</p>
<p class="audit">${x(p.auditLine)}</p>
</div>
<footer>
<span class="footer-cell"><span class="footer-line"><svg class="footer-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><circle cx="17.5" cy="6.5" r="1.2"/></svg><span>Proedukacursos</span></span></span>
<span class="footer-cell"><span class="footer-line"><svg class="footer-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg><span>(88) 98879-2626</span></span></span>
<span class="footer-cell"><span class="footer-line"><svg class="footer-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg><span>www.proeduka.com.br</span></span></span>
<span class="footer-cell"><span class="footer-line"><svg class="footer-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg><span>contato@proeduka.com.br</span></span></span>
</footer>
</div>
</body>
</html>`;
}
